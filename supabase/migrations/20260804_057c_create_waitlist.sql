-- Rapatriée de la production (supabase_migrations.schema_migrations,
-- version 20260804091747 « create_waitlist ») : appliquée en prod sans fichier
-- dans le dépôt. Contenu reproduit à l'identique pour rendre le schéma rejouable.
-- NB : les policies « authenticated can read/update waitlist » (using true) ont
-- été remplacées depuis par celles de 058 (lecture/écriture SUPER_ADMIN seul).
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null,
  email text not null,
  phone text not null,
  source text,
  consent boolean not null default false,
  status text not null default 'nouveau',
  pack text,
  destination text,
  notes text,
  called_at timestamptz
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);
create index if not exists waitlist_status_idx on public.waitlist (status);
create unique index if not exists waitlist_email_uniq on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

drop policy if exists "public can insert waitlist" on public.waitlist;
create policy "public can insert waitlist"
  on public.waitlist for insert to anon, authenticated
  with check (true);

drop policy if exists "authenticated can read waitlist" on public.waitlist;
create policy "authenticated can read waitlist"
  on public.waitlist for select to authenticated
  using (true);

drop policy if exists "authenticated can update waitlist" on public.waitlist;
create policy "authenticated can update waitlist"
  on public.waitlist for update to authenticated
  using (true) with check (true);
