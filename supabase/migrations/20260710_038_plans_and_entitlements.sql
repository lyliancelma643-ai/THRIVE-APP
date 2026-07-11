-- 20260710_038_plans_and_entitlements.sql
-- Fondations de la matrice de droits (segmentation en 3 forfaits).
--
-- 1) Table `plans` : source unique des features/limits par forfait (matrice de
--    référence — docs/segmentation-forfaits.md §2). Donne enfin un sens à
--    entitlements.plan_id (jusqu'ici orphelin).
-- 2) `entitlements` devient le journal d'achat : FK vers plans, un seul
--    entitlement ACTIVE par famille.
-- 3) Trigger de synchronisation : entitlement ACTIVE → families.pack.
--    L'UPDATE passe par le verrou enforce_pack_change_authority (migration 023)
--    qui l'autorise (service_role / admin) — on emprunte le chemin autorisé,
--    on ne le contourne jamais.
-- 4) Table `family_members` : socle du quota maxParents (families.parent_id
--    reste le propriétaire ; les co-parents/superviseurs sont listés ici).
--
-- Rollback (down) :
--   drop trigger trg_sync_family_pack on public.entitlements;
--   drop function public.sync_family_pack_from_entitlements();
--   drop table public.family_members;
--   drop index if exists entitlements_one_active_per_family;
--   alter table public.entitlements drop constraint entitlements_plan_id_fkey;
--   drop table public.plans;

-- ── 1) Plans ─────────────────────────────────────────────────────────────────
create table if not exists public.plans (
  code text primary key check (code in ('ESSENTIEL', 'AVANCE', 'PERFORMANCE')),
  label text not null,
  tagline text not null default '',
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'CAD',
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans
  for select to authenticated using (true);

drop policy if exists plans_admin_write on public.plans;
create policy plans_admin_write on public.plans
  for all to authenticated
  using (private.is_admin_or_super())
  with check (private.is_admin_or_super());

-- Seed = matrice de référence (docs/segmentation-forfaits.md §2).
-- limits : null = illimité / toutes les séances.
insert into public.plans (code, label, tagline, price_cents, currency, features, limits, sort_order)
values
  (
    'ESSENTIEL', 'Essentiel',
    'Le parcours THRIVE complet avec votre coach.',
    170000, 'CAD',
    '{
      "detailedBilan": false, "skillBreakdown": false, "lsssCurve": false,
      "emotionWheel": false, "progressJournal": false, "coachLetter": false,
      "coachMessaging": false, "csvExport": false, "pdfExport": false,
      "premiumTemplates": false, "aiSummary": false
    }'::jsonb,
    '{
      "maxChildren": 1, "maxParents": 1, "historyMonths": 3,
      "detailLevel": 1, "storageMb": 100, "detailedBilanSessions": []
    }'::jsonb,
    1
  ),
  (
    'AVANCE', 'Avancé',
    'Comprenez la progression, aux moments clés.',
    200000, 'CAD',
    '{
      "detailedBilan": true, "skillBreakdown": true, "lsssCurve": true,
      "emotionWheel": true, "progressJournal": true, "coachLetter": true,
      "coachMessaging": false, "csvExport": false, "pdfExport": false,
      "premiumTemplates": false, "aiSummary": false
    }'::jsonb,
    '{
      "maxChildren": 2, "maxParents": 2, "historyMonths": 12,
      "detailLevel": 2, "storageMb": 500, "detailedBilanSessions": [3, 7, 13]
    }'::jsonb,
    2
  ),
  (
    'PERFORMANCE', 'Performance',
    'L''accompagnement le plus profond et le plus personnalisé.',
    250000, 'CAD',
    '{
      "detailedBilan": true, "skillBreakdown": true, "lsssCurve": true,
      "emotionWheel": true, "progressJournal": true, "coachLetter": true,
      "coachMessaging": true, "csvExport": true, "pdfExport": true,
      "premiumTemplates": true, "aiSummary": false
    }'::jsonb,
    '{
      "maxChildren": null, "maxParents": null, "historyMonths": null,
      "detailLevel": 3, "storageMb": 2000, "detailedBilanSessions": null
    }'::jsonb,
    3
  )
on conflict (code) do update set
  label = excluded.label,
  tagline = excluded.tagline,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  features = excluded.features,
  limits = excluded.limits,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ── 2) Entitlements = journal d'achat ────────────────────────────────────────
-- FK plan_id → plans.code (table vide en prod : validation immédiate sans risque)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'entitlements_plan_id_fkey'
  ) then
    alter table public.entitlements
      add constraint entitlements_plan_id_fkey
      foreign key (plan_id) references public.plans(code);
  end if;
end $$;

-- Un seul entitlement ACTIVE par famille
create unique index if not exists entitlements_one_active_per_family
  on public.entitlements (family_id)
  where status = 'ACTIVE';

-- ── 3) Sync entitlement ACTIVE → families.pack ───────────────────────────────
create or replace function public.sync_family_pack_from_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid := coalesce(new.family_id, old.family_id);
  v_pack text;
begin
  select e.plan_id into v_pack
  from public.entitlements e
  where e.family_id = v_family
    and e.status = 'ACTIVE'
    and (e.expires_at is null or e.expires_at > now())
  order by e.starts_at desc
  limit 1;

  -- Pas d'entitlement actif → on conserve le pack courant (jamais de
  -- rétrogradation automatique ; un downgrade est un acte admin explicite).
  if v_pack is not null then
    update public.families
      set pack = v_pack, updated_at = now()
      where id = v_family and pack is distinct from v_pack;
  end if;

  return coalesce(new, old);
end;
$$;

revoke execute on function public.sync_family_pack_from_entitlements() from anon, authenticated, public;

drop trigger if exists trg_sync_family_pack on public.entitlements;
create trigger trg_sync_family_pack
  after insert or update on public.entitlements
  for each row
  execute function public.sync_family_pack_from_entitlements();

-- ── 4) Membres de la famille (socle du quota maxParents) ─────────────────────
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'PARENT'
    check (member_role in ('OWNER', 'PARENT', 'SUPERVISOR')),
  created_at timestamptz not null default now(),
  unique (family_id, profile_id)
);

alter table public.family_members enable row level security;

drop policy if exists family_members_read on public.family_members;
create policy family_members_read on public.family_members
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (select 1 from public.families f
               where f.id = family_id and f.parent_id = (select auth.uid()))
    or private.is_admin_or_super()
  );

drop policy if exists family_members_owner_insert on public.family_members;
create policy family_members_owner_insert on public.family_members
  for insert to authenticated
  with check (
    exists (select 1 from public.families f
            where f.id = family_id and f.parent_id = (select auth.uid()))
    or private.is_admin_or_super()
  );

drop policy if exists family_members_owner_delete on public.family_members;
create policy family_members_owner_delete on public.family_members
  for delete to authenticated
  using (
    (member_role <> 'OWNER'
     and exists (select 1 from public.families f
                 where f.id = family_id and f.parent_id = (select auth.uid())))
    or private.is_admin_or_super()
  );

-- Backfill : le parent payeur actuel devient OWNER de sa famille
insert into public.family_members (family_id, profile_id, member_role)
select f.id, f.parent_id, 'OWNER'
from public.families f
on conflict (family_id, profile_id) do nothing;
