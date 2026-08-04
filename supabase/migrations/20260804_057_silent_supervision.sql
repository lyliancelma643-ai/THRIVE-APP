-- ─────────────────────────────────────────────────────────────────────────────
-- 20260804_057_silent_supervision.sql
-- Supervision silencieuse du super-admin + file du support dans les non-lus.
--
-- 1) LECTURE INVISIBLE. La migration 056 laissait une fuite : `useConversation`
--    marque le fil comme lu à chaque ouverture, et conversation_reads est
--    lisible par les participants (c'est ce qui alimente l'accusé « Lu »). Un
--    super-admin qui ouvrait un fil coach ↔ parent faisait donc passer le
--    message du parent en « Lu ✓✓ » : sa consultation était visible.
--    Désormais, seul un PARTICIPANT peut écrire une marque de lecture ; un
--    superviseur ne laisse aucune trace, quoi que fasse le client.
--
-- 2) ACCÈS TOTAL. Nouveau scope `all`, réservé au SUPER_ADMIN : toutes les
--    conversations des deux natures dans une seule vue. La lecture du contenu
--    était déjà ouverte aux admins (RLS 056) ; ce scope donne la vue d'ensemble.
--    L'ÉCRITURE dans un fil coach ↔ parent reste interdite à tous les admins :
--    écrire s'y verrait forcément, et personne ne parle à la place du coach.
--
-- 3) FILE DU SUPPORT. Un fil support non encore pris en charge n'entrait dans
--    le compteur d'aucun admin (scope `mine` exigeait assigned_admin_id = moi) :
--    la cloche sonnait, la pastille « Messages » restait éteinte. Un fil non
--    attribué appartient à toute l'équipe tant que personne ne l'a réclamé.
--
-- Rollback : cf. bloc commenté en fin de fichier.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) Qui est réellement DANS la conversation ───────────────────────────────
-- À distinguer de private.can_access_conversation() : un admin ACCÈDE à un fil
-- coach ↔ parent (supervision) sans pour autant y PARTICIPER. Sur un fil
-- support, en revanche, l'équipe THRIVE est bien l'interlocutrice.
create or replace function private.is_conversation_participant(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conv
      and case c.kind
        when 'COACH' then
          c.parent_id = auth.uid()
          or c.coach_id = auth.uid()
          or private.is_family_parent(c.family_id)
        when 'SUPPORT' then
          c.parent_id = auth.uid() or private.is_admin_or_super()
        else false
      end
  );
$$;
revoke all on function private.is_conversation_participant(uuid) from public, anon;
grant execute on function private.is_conversation_participant(uuid) to authenticated;

-- ── 2) Marquer lu : jamais pour un superviseur ───────────────────────────────
-- `p_silent` permet au client de demander explicitement une consultation sans
-- trace (vue d'audit du super-admin, y compris sur un fil support où il serait
-- techniquement participant). Le garde-fou serveur, lui, n'est pas négociable :
-- un non-participant n'écrit jamais de marque de lecture.
create or replace function public.mark_conversation_read(
  p_conversation_id uuid, p_silent boolean default false)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.can_access_conversation(p_conversation_id) then raise exception 'FORBIDDEN'; end if;

  -- Lecture silencieuse : accès autorisé, mais aucune trace laissée.
  if coalesce(p_silent, false) or not private.is_conversation_participant(p_conversation_id) then
    return null;
  end if;

  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (p_conversation_id, auth.uid(), v_now)
  on conflict (conversation_id, user_id)
    do update set last_read_at = greatest(conversation_reads.last_read_at, excluded.last_read_at);
  return v_now;
end $$;

-- Une seule signature : garder en plus l'ancienne à un argument rendait tout
-- appel à un argument ambigu (42725, « function is not unique »). Le DEFAULT
-- suffit aux clients existants, que PostgREST résout par argument nommé.
drop function if exists public.mark_conversation_read(uuid);

revoke all on function public.mark_conversation_read(uuid, boolean) from public, anon;
grant execute on function public.mark_conversation_read(uuid, boolean) to authenticated;

-- Ceinture et bretelles : même si une marque de superviseur existait (écrite
-- avant cette migration), elle ne doit pas remonter comme un accusé de lecture.
drop policy if exists conversation_reads_select on public.conversation_reads;
create policy conversation_reads_select on public.conversation_reads
  for select to authenticated
  using (
    private.can_access_conversation(conversation_id)
    and (
      user_id = (select auth.uid())
      -- Seules les lectures des participants sont visibles des autres.
      or exists (
        select 1 from public.conversations c
        where c.id = conversation_reads.conversation_id
          and (c.parent_id = conversation_reads.user_id
            or c.coach_id  = conversation_reads.user_id
            or (c.kind = 'SUPPORT'
                and exists (select 1 from public.profiles p
                             where p.id = conversation_reads.user_id
                               and p.role in ('ADMIN', 'SUPER_ADMIN'))))
      )
    )
  );

-- Purge des marques de supervision déjà écrites sur des fils coach ↔ parent.
delete from public.conversation_reads r
using public.conversations c
where c.id = r.conversation_id
  and c.kind = 'COACH'
  and r.user_id is distinct from c.parent_id
  and r.user_id is distinct from c.coach_id
  and not exists (
    select 1 from public.family_members m
    where m.family_id = c.family_id and m.profile_id = r.user_id
  );

-- ── 3) Listes : scope `all` du super-admin + file du support ─────────────────
create or replace function public.list_my_conversations(p_scope text default 'mine')
returns table (
  id uuid, kind conversation_kind, status conversation_status,
  parent_id uuid, coach_id uuid, child_id uuid, assigned_admin_id uuid,
  subject text, created_at timestamptz, last_message_at timestamptz,
  last_message_preview text, last_sender_id uuid,
  unread_count integer, counterpart_name text, counterpart_role text,
  child_name text, parent_name text, coach_name text
) language plpgsql security definer set search_path = public as $$
declare
  v_me     uuid := auth.uid();
  v_role   text := private.jwt_role();
  v_admin  boolean := private.is_admin_or_super();
  v_super  boolean := v_role = 'SUPER_ADMIN';
  v_scope  text := coalesce(p_scope, 'mine');
  v_client boolean := v_role = 'PARENT';
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_scope in ('support', 'supervision') and not v_admin then raise exception 'FORBIDDEN'; end if;
  -- La vue d'ensemble est le privilège du super-admin, pas de tout admin.
  if v_scope = 'all' and not v_super then raise exception 'FORBIDDEN'; end if;

  return query
  select c.id, c.kind, c.status, c.parent_id, c.coach_id, c.child_id, c.assigned_admin_id,
         c.subject, c.created_at, c.last_message_at, c.last_message_preview, c.last_sender_id,
         (select count(*)::int from public.messages m
           where m.conversation_id = c.id
             and m.sender_id <> v_me
             and m.deleted_at is null
             and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)) as unread_count,
         case
           when v_client and c.kind = 'SUPPORT' then 'Support THRIVE'
           when v_client then nullif(btrim(coalesce(pc.first_name,'') || ' ' || coalesce(pc.last_name,'')), '')
           else nullif(btrim(coalesce(pp.first_name,'') || ' ' || coalesce(pp.last_name,'')), '')
         end as counterpart_name,
         case when v_client then (case when c.kind = 'SUPPORT' then 'SUPPORT' else 'COACH' end)
              else 'PARENT' end as counterpart_role,
         ch.first_name as child_name,
         nullif(btrim(coalesce(pp.first_name,'') || ' ' || coalesce(pp.last_name,'')), '') as parent_name,
         nullif(btrim(coalesce(pc.first_name,'') || ' ' || coalesce(pc.last_name,'')), '') as coach_name
    from public.conversations c
    left join public.conversation_reads r on r.conversation_id = c.id and r.user_id = v_me
    left join public.profiles pp on pp.id = c.parent_id
    left join public.profiles pc on pc.id = c.coach_id
    left join public.children ch on ch.id = c.child_id
   where case v_scope
           when 'all'         then true                 -- super-admin : tout, sans exception
           when 'support'     then c.kind = 'SUPPORT'
           when 'supervision' then c.kind = 'COACH'
           else c.parent_id = v_me
                or c.coach_id = v_me
                or (c.kind = 'COACH' and private.is_family_parent(c.family_id))
                -- Un fil support non réclamé appartient à toute l'équipe :
                -- sinon la cloche sonne et la pastille « Messages » reste éteinte.
                or (v_admin and c.kind = 'SUPPORT'
                    and (c.assigned_admin_id is null or c.assigned_admin_id = v_me))
         end
   order by c.last_message_at desc nulls last;
end $$;

revoke all on function public.list_my_conversations(text) from public, anon;
grant execute on function public.list_my_conversations(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Rollback (down) — pour mémoire :
--   create or replace function public.mark_conversation_read(uuid) … (version 056)
--   drop function if exists public.mark_conversation_read(uuid, boolean);
--   (rétablir alors la signature à un seul argument côté client)
--   drop function if exists private.is_conversation_participant(uuid);
--   create policy conversation_reads_select … using (private.can_access_conversation(conversation_id));
--   (list_my_conversations : reprendre la version 056, sans le scope `all`)
-- ─────────────────────────────────────────────────────────────────────────────
