-- 20260614_018_lock_role_is_active.sql
-- Sécurité : empêche tout utilisateur non-admin de modifier son propre rôle
-- ou son statut actif (profiles.role / profiles.is_active).
--
-- Contexte : la policy RLS de self-update (auth.uid() = id, sans WITH CHECK)
-- laissait un parent exécuter `update profiles set role='SUPER_ADMIN'` sur sa
-- propre ligne, puis appeler les edge functions admin (qui autorisent via
-- profiles.role) → élévation de privilèges / prise de contrôle de compte.
-- On bloque ça au niveau base, ce qui sécurise aussi is_admin() et les
-- edge functions admin-create-user / admin-update-user.
--
-- Seuls le service_role (edge functions avec la clé service → aucun JWT
-- utilisateur, donc auth.uid() IS NULL) et les ADMIN/SUPER_ADMIN peuvent
-- changer ces deux colonnes. Les autres mises à jour de profil (nom,
-- téléphone, avatar, etc.) restent autorisées normalement.

create or replace function public.enforce_role_change_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role)
     or (new.is_active is distinct from old.is_active) then
    -- Contexte sans JWT utilisateur (service_role / edge functions) : autorisé.
    if auth.uid() is null then
      return new;
    end if;
    -- ADMIN / SUPER_ADMIN : autorisé.
    if exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('ADMIN', 'SUPER_ADMIN')
    ) then
      return new;
    end if;
    raise exception 'Modification du rôle ou du statut non autorisée'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_role_change_authority on public.profiles;
create trigger trg_enforce_role_change_authority
  before update on public.profiles
  for each row
  execute function public.enforce_role_change_authority();
