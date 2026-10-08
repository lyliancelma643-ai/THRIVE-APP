-- ════════════════════════════════════════════════════════════════════════════
-- 20261002_066d_loi25_delai_et_partage_p3.sql
-- RÉCONCILIATION : migration DÉJÀ APPLIQUÉE en production (THRIVE-CA) le
-- 2 octobre 2026 sous le nom « loi25_delai_et_partage_p3_066 »
-- (version 20261002144245), mais absente de toutes les branches GitHub.
-- Texte recopié tel quel depuis supabase_migrations.schema_migrations le
-- 8 octobre 2026. Ne pas la réappliquer en prod.
--
-- Effet : échéance légale de 30 jours sur les demandes de suppression
-- (Loi 25, art. 32) posée par trigger ; notification admin avec l'échéance ;
-- abonnement P3 partagé avec LE co-parent retenu (2 adultes max).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.deletion_requests
  add column if not exists due_at timestamptz,
  add column if not exists source text not null default 'app';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'deletion_requests_source_check') then
    alter table public.deletion_requests
      add constraint deletion_requests_source_check
      check (source in ('app', 'web', 'web_public', 'admin'));
  end if;
end $$;

update public.deletion_requests
set due_at = requested_at + interval '30 days'
where due_at is null;

alter table public.deletion_requests alter column due_at set not null;

comment on column public.deletion_requests.due_at is
  'Date limite de traitement : requested_at + 30 jours (Loi 25, art. 32). Posée par trigger, non modifiable.';

create or replace function private.deletion_requests_due_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.requested_at := coalesce(new.requested_at, now());
    new.due_at := new.requested_at + interval '30 days';
  else
    new.requested_at := old.requested_at;
    new.due_at := old.due_at;
  end if;
  return new;
end;
$$;

create or replace trigger trg_deletion_requests_due_at
  before insert or update on public.deletion_requests
  for each row execute function private.deletion_requests_due_at();

create index if not exists deletion_requests_pending_due_idx
  on public.deletion_requests (due_at) where status = 'PENDING';

create or replace function private.notify_deletion_request()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  perform private.notify_admins('deletion_request', 'accounts',
    'Demande de suppression de compte',
    private.actor_label(coalesce(new.target_profile_id, new.requested_by))
      || ' demande la suppression de son compte. À traiter au plus tard le '
      || to_char(new.due_at at time zone 'America/Toronto', 'DD/MM/YYYY')
      || ' (Loi 25 : 30 jours).',
    '/admin/users',
    jsonb_build_object('request_id', new.id, 'target_profile_id', new.target_profile_id, 'due_at', new.due_at),
    null);
  return new;
end $$;

create or replace function private.overdue_deletion_requests()
returns setof public.deletion_requests
language sql stable security definer
set search_path = public
as $$
  select * from deletion_requests
  where status = 'PENDING' and due_at < now() and private.is_admin()
  order by due_at;
$$;

revoke execute on function private.overdue_deletion_requests() from public, anon;
grant execute on function private.overdue_deletion_requests() to authenticated;

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

comment on function private.has_p3_subscription(uuid) is
  'Abonnement P3 actif du compte, ou du titulaire de sa famille s''il est LE co-parent retenu (2 adultes max par abonnement).';

revoke execute on function private.has_p3_subscription(uuid) from public, anon;
grant execute on function private.has_p3_subscription(uuid) to authenticated;
