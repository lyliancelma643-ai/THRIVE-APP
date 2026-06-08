-- Migration : ajoute la colonne role à la table profiles
-- et configure les politiques RLS pour que chaque user
-- puisse lire son propre profil.

-- 1. Ajouter la colonne role si elle n'existe pas
alter table public.profiles
  add column if not exists role text not null default 'athlete'
  check (role in ('athlete', 'parent', 'coach', 'admin'));

-- 2. Index pour les requêtes par rôle
create index if not exists idx_profiles_role on public.profiles(role);

-- 3. Activer RLS sur profiles (si pas déjà fait)
alter table public.profiles enable row level security;

-- 4. Politique : chaque user lit son propre profil
create policy if not exists "users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- 5. Politique : chaque user met à jour son propre profil
create policy if not exists "users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- 6. Créer le profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'athlete')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger sur auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Pour mettre à jour un compte existant en parent :
-- UPDATE public.profiles SET role = 'parent' WHERE id = 'uuid-du-compte';
-- UPDATE public.profiles SET role = 'coach'  WHERE id = 'uuid-du-compte';
