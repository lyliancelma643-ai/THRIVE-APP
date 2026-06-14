-- 20260614_019_app_metadata_role_authority.sql
-- Durcissement : déplace l'AUTORITÉ du rôle vers auth.users.raw_app_meta_data
-- (app_metadata). Contrairement à user_metadata (modifiable par l'utilisateur
-- via supabase.auth.updateUser), app_metadata n'est posable que par la clé
-- service / l'admin API → on ne peut plus s'auto-attribuer un rôle privilégié.
--
-- Le middleware et le store lisent désormais app_metadata.role en priorité
-- (repli temporaire sur user_metadata.role le temps que les JWT existants se
-- rafraîchissent). Les edge functions admin posent app_metadata.role.

-- 1) Backfill depuis profiles.role (source verrouillée par la migration 018).
update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', p.role::text)
from public.profiles p
where p.id = u.id
  and coalesce(u.raw_app_meta_data->>'role', '') is distinct from p.role::text;

-- 2) Toute auto-inscription (signUp, qui ne peut pas poser app_metadata) reçoit
--    app_metadata.role = PARENT — seul rôle self-service. Les créations admin
--    (edge functions) posent déjà app_metadata.role, qu'on ne réécrit pas.
create or replace function public.set_signup_app_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.raw_app_meta_data->>'role') is null then
    new.raw_app_meta_data = coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'PARENT');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_signup_app_role on auth.users;
create trigger trg_set_signup_app_role
  before insert on auth.users
  for each row
  execute function public.set_signup_app_role();
