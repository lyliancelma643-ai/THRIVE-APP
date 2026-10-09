-- ─────────────────────────────────────────────────────────────────────────────
-- 075 — Un seul système de packs : Groupe · Individuel · Complet.
--
-- Avant : deux notions coexistaient.
--   • parent_access.program_pack (068) : GROUPE / INDIVIDUEL / COMPLET, les
--     packs vendus, posés par l'admin ;
--   • families.pack : ESSENTIEL / AVANCE / PERFORMANCE, le niveau de détail
--     des bilans (et les quotas de la table `plans`).
--
-- Désormais le pack programme fait foi, et les codes internes de families.pack
-- ne sont plus qu'un niveau de détail qui en découle (libellés affichés :
-- Groupe / Individuel / Complet) :
--     GROUPE     ↔ ESSENTIEL
--     INDIVIDUEL ↔ AVANCE
--     COMPLET    ↔ PERFORMANCE
--
-- 1. Inscrit à l'un des trois packs ⇒ accès Maison (en plus de l'abonnement
--    Maison et du forçage admin, inchangés).
-- 2. Synchronisation dans les deux sens, sans boucle :
--      parent_access.program_pack → families.pack de ses familles ;
--      families.pack modifié par un admin → parent_access.program_pack.
--    La création d'une famille (ESSENTIEL par défaut, 066 SEC-04) ne pose
--    AUCUN pack : il faut une inscription explicite.
-- 3. Reprise : les familles déjà en AVANCE / PERFORMANCE (posées à la main par
--    un admin) deviennent Individuel / Complet. Les familles en ESSENTIEL
--    (valeur par défaut, indiscernable d'un vrai pack Groupe) ne sont pas
--    touchées : l'admin pose « Pack Groupe » explicitement.
--
-- Additive, idempotente. Rollback :
--   supabase/rollbacks/20261009_075_packs_programme_unifies_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

set lock_timeout = '5s';

-- ── Correspondances ─────────────────────────────────────────────────────────
create or replace function private.program_pack_to_family_pack(p text)
returns text language sql immutable
set search_path = ''
as $$
  select case p
    when 'GROUPE' then 'ESSENTIEL'
    when 'INDIVIDUEL' then 'AVANCE'
    when 'COMPLET' then 'PERFORMANCE'
  end;
$$;

create or replace function private.family_pack_to_program_pack(p text)
returns text language sql immutable
set search_path = ''
as $$
  select case p
    when 'ESSENTIEL' then 'GROUPE'
    when 'AVANCE' then 'INDIVIDUEL'
    when 'PERFORMANCE' then 'COMPLET'
  end;
$$;

-- ── 1) Maison ouverte par un pack ───────────────────────────────────────────
create or replace function private.parent_section_access(p_parent uuid, p_section text)
returns boolean language plpgsql stable security definer
set search_path = public
as $$
declare
  r parent_access%rowtype;
  v_forced boolean;
begin
  if not (auth.uid() is null or auth.uid() = p_parent or private.is_admin()) then
    return false;
  end if;

  select * into r from parent_access where parent_id = p_parent;

  v_forced := case p_section
    when 'maison'  then r.maison
    when 'bilan'   then r.bilan
    when 'seances' then r.seances
  end;
  if v_forced is not null then
    return v_forced;
  end if;

  if p_section = 'maison' then
    -- Abonnement Maison (propre ou partagé co-parent), OU inscrit à un pack
    -- (le sien ou celui du titulaire de sa famille, pour le co-parent).
    return private.has_p3_subscription(p_parent)
        or r.program_pack is not null
        or exists (
          select 1
          from family_members m
          join families f on f.id = m.family_id
          join parent_access a on a.parent_id = f.parent_id
          where m.profile_id = p_parent and a.program_pack is not null
        );
  end if;

  if p_section in ('bilan', 'seances') then
    return private.parent_access_unlocked(p_parent);
  end if;

  return false;
end;
$$;

revoke execute on function private.parent_section_access(uuid, text) from public, anon;
grant execute on function private.parent_section_access(uuid, text) to authenticated;

-- ── 2a) parent_access → families ────────────────────────────────────────────
create or replace function private.sync_family_pack_from_program_pack()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if new.program_pack is not null
     and (tg_op = 'INSERT' or new.program_pack is distinct from old.program_pack) then
    update families f
       set pack = private.program_pack_to_family_pack(new.program_pack)
     where f.parent_id = new.parent_id
       and f.pack is distinct from private.program_pack_to_family_pack(new.program_pack);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_family_pack_from_program_pack on public.parent_access;
create trigger trg_sync_family_pack_from_program_pack
  after insert or update of program_pack on public.parent_access
  for each row execute function private.sync_family_pack_from_program_pack();

-- ── 2b) families → parent_access (changement explicite seulement) ───────────
create or replace function private.sync_program_pack_from_family_pack()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_pp text := private.family_pack_to_program_pack(new.pack);
begin
  if new.pack is distinct from old.pack and v_pp is not null and new.parent_id is not null then
    insert into parent_access (parent_id, program_pack)
    values (new.parent_id, v_pp)
    on conflict (parent_id) do update
      set program_pack = excluded.program_pack
      where parent_access.program_pack is distinct from excluded.program_pack;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_program_pack_from_family_pack on public.families;
create trigger trg_sync_program_pack_from_family_pack
  after update of pack on public.families
  for each row execute function private.sync_program_pack_from_family_pack();

revoke execute on function private.sync_family_pack_from_program_pack() from public, anon, authenticated;
revoke execute on function private.sync_program_pack_from_family_pack() from public, anon, authenticated;

-- ── 2c) Vue admin : Maison automatique = abonnement OU pack ─────────────────
create or replace function public.admin_parent_access_list()
returns table (
  parent_id      uuid,
  program_pack   text,
  maison         boolean,
  bilan          boolean,
  seances        boolean,
  note           text,
  coach_unlocked boolean,
  p3_subscribed  boolean,
  auto_maison    boolean,
  auto_bilan     boolean,
  auto_seances   boolean,
  eff_maison     boolean,
  eff_bilan      boolean,
  eff_seances    boolean
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not private.is_admin_or_super() then
    raise exception 'Réservé aux administrateurs';
  end if;

  return query
  with base as (
    select
      p.id as pid,
      a.program_pack as pk,
      a.maison as fm, a.bilan as fb, a.seances as fs,
      a.note as nt,
      private.parent_access_unlocked(p.id) as unl,
      private.has_p3_subscription(p.id) as sub
    from profiles p
    left join parent_access a on a.parent_id = p.id
    where p.role = 'PARENT'
  )
  select
    pid, pk, fm, fb, fs, nt, unl, sub,
    (sub or pk is not null),
    unl,
    unl,
    coalesce(fm, sub or pk is not null),
    coalesce(fb, unl),
    coalesce(fs, unl)
  from base;
end;
$$;

revoke execute on function public.admin_parent_access_list() from public, anon;
grant execute on function public.admin_parent_access_list() to authenticated;

-- ── 3) Reprise des packs déjà posés à la main ───────────────────────────────
insert into public.parent_access (parent_id, program_pack, note)
select distinct on (f.parent_id)
       f.parent_id,
       private.family_pack_to_program_pack(f.pack::text),
       'Repris de families.pack (migration 075)'
from public.families f
where f.parent_id is not null
  and f.pack::text in ('AVANCE', 'PERFORMANCE')
order by f.parent_id,
         case f.pack::text when 'PERFORMANCE' then 2 else 1 end desc
on conflict (parent_id) do update
  set program_pack = excluded.program_pack
  where parent_access.program_pack is null;

reset lock_timeout;
