-- ─────────────────────────────────────────────────────────────────────────────
-- 070 — Accès parents : source de vérité unique + co-parents + sandbox.
-- À appliquer APRÈS 068 (parent_section_access). Additive, idempotente.
--
-- 1. private.parent_access_unlocked : tient compte des co-parents (066). Avant,
--    la garde RLS de sessions / parent_reports ne regardait que families.parent_id
--    alors qu'access_state() ouvrait l'écran au co-parent → écran vide.
-- 2. Achats sandbox (TestFlight / Play test) : ignorés par has_p3_subscription,
--    sauf pour le staff, les adresses @thrivesportpositive.com (comptes de
--    revue Apple/Google) et la liste public.qa_accounts.
-- 3. access_state() : ajoute sections{}, bilan_level, is_staff, forced{}
--    en conservant TOUTES les clés précédentes (clients déjà en circulation).
--
-- Rollback : supabase/rollbacks/20261008_070_acces_unifie_sandbox_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

set lock_timeout = '5s';

-- ── 1) parent_access_unlocked sensible aux co-parents ───────────────────────
create or replace function private.parent_access_unlocked(p_parent uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select
    (
      coalesce((select p.coach_validated from profiles p where p.id = p_parent), false)
      or exists (
        select 1 from family_members m
        join families f on f.id = m.family_id
        join profiles o on o.id = f.parent_id
        where m.profile_id = p_parent and coalesce(o.coach_validated, false)
      )
    )
    and exists (
      select 1 from children c
      join families f on f.id = c.family_id
      where c.is_active
        and c.validation_status = 'CONFIRMED'
        and (
          f.parent_id = p_parent
          or exists (select 1 from family_members m
                     where m.family_id = f.id and m.profile_id = p_parent)
        )
    );
$$;

-- ── 2) Sandbox ───────────────────────────────────────────────────────────────
create table if not exists public.qa_accounts (
  email      text primary key check (email = lower(email)),
  note       text,
  created_at timestamptz not null default now()
);
comment on table public.qa_accounts is
  'Comptes autorisés à obtenir un accès Maison avec un achat sandbox (QA). Admin seulement.';
alter table public.qa_accounts enable row level security;
drop policy if exists qa_accounts_admin_all on public.qa_accounts;
create policy qa_accounts_admin_all on public.qa_accounts
  for all to authenticated
  using ((select private.is_admin_or_super()))
  with check ((select private.is_admin_or_super()));
revoke all on public.qa_accounts from anon;
revoke truncate, references, trigger on public.qa_accounts from authenticated;

create or replace function private.is_qa_account(p_user uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = p_user
      and (
        p.role::text in ('COACH', 'ADMIN', 'SUPER_ADMIN')
        or lower(p.email) like '%@thrivesportpositive.com'
        or exists (select 1 from qa_accounts q where q.email = lower(p.email))
      )
  );
$$;
revoke execute on function private.is_qa_account(uuid) from public, anon;

-- Même corps que 066d, + filtre sandbox.
create or replace function private.has_p3_subscription(p_user uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select
    (auth.uid() is null or auth.uid() = p_user or private.is_admin())
    and exists (
      select 1
      from billing_subscriptions s
      where s.active
        and (s.expires_at is null or s.expires_at > now())
        and (not s.is_sandbox or private.is_qa_account(s.user_id))
        and (
          s.user_id = p_user
          or s.user_id in (
            select f.parent_id
            from families f
            where (
              select m.profile_id
              from family_members m
              where m.family_id = f.id
                and m.profile_id <> f.parent_id
                and m.member_role <> 'OWNER'
              order by m.created_at, m.id
              limit 1
            ) = p_user
          )
        )
    );
$$;
revoke execute on function private.has_p3_subscription(uuid) from public, anon;
grant execute on function private.has_p3_subscription(uuid) to authenticated;

-- ── 3) access_state() : objet unique pour web + mobile ──────────────────────
create or replace function public.access_state()
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text := private.jwt_role();
  v_has_child boolean;
  v_has_confirmed boolean;
  v_coach_ok boolean;
  v_fitness boolean;
  v_subscribed boolean;
  v_pack text;
  v_level text;
  v_maison boolean;
  v_bilan boolean;
  v_seances boolean;
  r parent_access%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('unlocked', false, 'reason', 'anonymous');
  end if;

  select coalesce(enabled, false) into v_fitness
  from app_settings where key = 'fitness_enabled';

  if v_role <> 'PARENT' then
    return jsonb_build_object(
      'role', v_role, 'unlocked', true, 'has_child', true, 'has_confirmed_child', true,
      'coach_validated', true, 'fitness_enabled', coalesce(v_fitness, false),
      'p3_subscribed', false, 'p3_access', true,
      'program_pack', null, 'bilan_access', true, 'seances_access', true,
      'sections', jsonb_build_object('maison', true, 'bilan', true, 'seances', true),
      'bilan_level', 'PERFORMANCE',
      'is_staff', v_role in ('COACH', 'ADMIN', 'SUPER_ADMIN'),
      'forced', jsonb_build_object('maison', null, 'bilan', null, 'seances', null)
    );
  end if;

  select
    exists (select 1 from children c
            where private.is_family_parent(c.family_id) and c.is_active),
    exists (select 1 from children c
            where private.is_family_parent(c.family_id) and c.is_active
              and c.validation_status = 'CONFIRMED')
  into v_has_child, v_has_confirmed;

  select coalesce(p.coach_validated, false)
      or exists (
        select 1 from family_members m
        join families f on f.id = m.family_id
        join profiles owner on owner.id = f.parent_id
        where m.profile_id = v_uid and coalesce(owner.coach_validated, false)
      )
  into v_coach_ok
  from profiles p where p.id = v_uid;

  v_subscribed := private.has_p3_subscription(v_uid);

  select * into r from parent_access where parent_id = v_uid;
  v_pack := r.program_pack;

  -- Niveau de bilan = meilleur pack parmi les familles du parent.
  select f.pack into v_level
  from families f
  where private.is_family_parent(f.id)
  order by case f.pack when 'PERFORMANCE' then 3 when 'AVANCE' then 2 else 1 end desc
  limit 1;

  v_maison  := private.parent_section_access(v_uid, 'maison');
  v_bilan   := private.parent_section_access(v_uid, 'bilan');
  v_seances := private.parent_section_access(v_uid, 'seances');

  return jsonb_build_object(
    'role', v_role,
    'unlocked', v_has_confirmed and coalesce(v_coach_ok, false),
    'has_child', v_has_child,
    'has_confirmed_child', v_has_confirmed,
    'coach_validated', coalesce(v_coach_ok, false),
    'fitness_enabled', coalesce(v_fitness, false),
    'p3_subscribed', v_subscribed,
    'p3_access', v_maison,
    'program_pack', v_pack,
    'bilan_access', v_bilan,
    'seances_access', v_seances,
    'sections', jsonb_build_object('maison', v_maison, 'bilan', v_bilan, 'seances', v_seances),
    'bilan_level', coalesce(v_level, 'ESSENTIEL'),
    'is_staff', false,
    'forced', jsonb_build_object('maison', r.maison, 'bilan', r.bilan, 'seances', r.seances)
  );
end;
$$;
revoke execute on function public.access_state() from public, anon;
grant execute on function public.access_state() to authenticated;
