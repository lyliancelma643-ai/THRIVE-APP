-- 20260622_023_family_packs.sql
-- Packs clients rattachés à la famille : ESSENTIEL (1700$) / AVANCE (2000$) / PERFORMANCE (2500$).
-- Pilote les accès au lecteur de bilan (message / bilan / observations) côté parent.
--
-- Sécurité : la policy families_parent_update (migration 006) autorise un parent à
-- mettre à jour SA ligne sans WITH CHECK → sans garde, un parent pourrait s'auto-upgrader
-- (`update families set pack='PERFORMANCE'`). Même faille que profiles.role (migration 018).
-- On verrouille donc le changement de `pack` au niveau base : seuls le service_role
-- (edge functions, auth.uid() IS NULL) et les ADMIN/SUPER_ADMIN peuvent le modifier.

-- 1) Colonne pack — défaut ESSENTIEL (toute famille démarre au pack de base)
alter table public.families
  add column if not exists pack text not null default 'ESSENTIEL'
  check (pack in ('ESSENTIEL', 'AVANCE', 'PERFORMANCE'));

-- 2) Verrou d'autorité sur le changement de pack
create or replace function public.enforce_pack_change_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pack is distinct from old.pack then
    -- Contexte sans JWT utilisateur (service_role / edge functions) : autorisé.
    if auth.uid() is null then
      return new;
    end if;
    -- ADMIN / SUPER_ADMIN : autorisé. (profiles.role est verrouillé, cf. migration 018)
    if exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('ADMIN', 'SUPER_ADMIN')
    ) then
      return new;
    end if;
    raise exception 'Modification du pack non autorisée'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_pack_change_authority on public.families;
create trigger trg_enforce_pack_change_authority
  before update on public.families
  for each row
  execute function public.enforce_pack_change_authority();

-- Une fonction de trigger n'a pas à être appelable en RPC : on retire EXECUTE
-- (sinon elle est exposée via /rest/v1/rpc/… — cf. database linter 0028/0029).
revoke execute on function public.enforce_pack_change_authority() from anon, authenticated, public;
