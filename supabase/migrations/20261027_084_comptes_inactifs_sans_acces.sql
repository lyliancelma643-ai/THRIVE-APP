-- ─────────────────────────────────────────────────────────────────────────────
-- 084 — Un compte désactivé (ou rétrogradé) perd ses droits TOUT DE SUITE
--       (audit QA 2026-10-27, C-1).
--
-- Constat : admin-update-user bannit le compte et pose profiles.is_active = false,
-- mais le JWT déjà émis reste valide jusqu'à son expiration (1 h) et aucune
-- fonction d'autorisation ne regardait is_active. Un coach désactivé lisait donc
-- encore les dossiers d'enfants ; un admin rétrogradé gardait les RPC admin
-- (is_admin_or_super ne lisait que le rôle du JWT).
--
-- Correctif : les fonctions d'autorisation « feuilles » exigent désormais un
-- profil actif, et is_admin_or_super / is_super_admin_jwt recoupent le rôle du
-- JWT avec profiles.role (verrouillé, migration 018). Toutes les fonctions
-- composées (can_edit_child_bilan, can_view_child_bilan, can_access_conversation,
-- is_parent_of_child…) en héritent sans être réécrites.
--
-- Volontairement NON modifié : private.jwt_role(). Les policies « gate_parent_* »
-- testent `jwt_role() <> 'PARENT'` : le faire renvoyer '' pour un compte inactif
-- ouvrirait ces verrous au lieu de les fermer.
--
-- Corps repris du catalogue de production THRIVE-CA (2026-10-27) ; seule la
-- condition « compte actif » est ajoutée. Signatures, SECURITY DEFINER et
-- search_path inchangés → droits EXECUTE et policies conservés. Idempotent.
--
-- Plusieurs policies comparent directement une colonne à auth.uid() sans passer
-- par ces fonctions (sessions_coach_own, questionnaires_coach_manage,
-- coach_reports_*, reports_read, children_parent_own…). Pour les couvrir toutes,
-- chaque table publique sous RLS reçoit une policy RESTRICTIVE
-- « compte_actif_requis » : un compte authentifié inactif n'y lit ni n'écrit
-- plus rien, quelle que soit la policy permissive. Exception : `profiles`, que
-- l'app lit (AccountSync) pour détecter la désactivation et déconnecter.
-- anon et service_role ne sont pas concernés (policy « to authenticated »).
-- Une table créée APRÈS 084 doit recevoir la même policy dans sa migration.
--
-- Rollback : supabase/rollbacks/20261027_084_comptes_inactifs_sans_acces_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────
set lock_timeout = '5s';

-- ── Socle : l'appelant a-t-il un profil actif ? ─────────────────────────────
-- Pas de profil (service_role, cron, compte supprimé) → false.
create or replace function private.caller_is_active()
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select coalesce((select p.is_active from public.profiles p where p.id = auth.uid()), false);
$$;
revoke all on function private.caller_is_active() from public, anon;
grant execute on function private.caller_is_active() to authenticated, service_role;

-- ── Rôles admin : profil actif + rôle du profil (pas seulement le JWT) ──────
create or replace function private.is_admin()
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role in ('ADMIN', 'SUPER_ADMIN') and is_active);
$$;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'SUPER_ADMIN' and is_active);
$$;

create or replace function private.is_admin_or_super()
returns boolean language sql stable
set search_path to 'public'
as $$
  select private.jwt_role() in ('ADMIN', 'SUPER_ADMIN') and private.is_admin();
$$;

create or replace function private.is_super_admin_jwt()
returns boolean language sql stable
set search_path to 'public'
as $$
  select private.jwt_role() = 'SUPER_ADMIN' and private.is_super_admin();
$$;

-- ── Coachs et superviseurs ──────────────────────────────────────────────────
create or replace function private.is_assigned_coach(p_child uuid)
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select private.caller_is_active() and exists (
    select 1 from coach_assignments ca
    where ca.child_id = p_child and ca.coach_id = auth.uid() and ca.is_active);
$$;

create or replace function private.is_program_coach_of_child(p_child uuid)
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select private.caller_is_active() and exists (
    select 1 from program_enrollments pe
    join programs pr on pr.id = pe.program_id
    join coach_assignments ca on ca.child_id = pe.child_id and ca.coach_id = pr.coach_id and ca.is_active
    where pe.child_id = p_child and pr.coach_id = auth.uid());
$$;

create or replace function private.is_admin_of_child(p_child uuid)
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select private.caller_is_active() and exists (
    select 1 from public.admin_coach_supervision s
    join public.coach_assignments ca on ca.coach_id = s.coach_id and ca.is_active
    where s.admin_id = auth.uid() and s.is_active and ca.child_id = p_child);
$$;

create or replace function private.is_coach_of_family(p_family uuid)
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select private.caller_is_active() and exists (
    select 1 from coach_assignments ca join children c on c.id = ca.child_id
    where c.family_id = p_family and ca.coach_id = auth.uid() and ca.is_active);
$$;

create or replace function private.is_supervisor_of_coach(p_coach uuid)
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select private.caller_is_active() and exists (
    select 1 from public.admin_coach_supervision s
    where s.admin_id = auth.uid() and s.coach_id = p_coach and s.is_active);
$$;

create or replace function private.is_my_supervisor(p_profile uuid)
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select private.caller_is_active() and exists (
    select 1 from public.admin_coach_supervision s
    where s.admin_id = p_profile and s.coach_id = auth.uid() and s.is_active);
$$;

-- ── Parents et co-parents (désactivation = ban réel, y compris côté parent) ─
create or replace function private.is_family_parent(p_family uuid)
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select p_family is not null and private.caller_is_active() and (
    exists (select 1 from public.families f where f.id = p_family and f.parent_id = auth.uid())
    or exists (select 1 from public.family_members m
                where m.family_id = p_family and m.profile_id = auth.uid())
  );
$$;

-- Corps de production (066) réaffirmé : le lien parent ↔ enfant passe par
-- is_family_parent, donc par le contrôle « compte actif » ci-dessus.
create or replace function private.is_parent_of_child(p_child uuid)
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.children c
    where c.id = p_child and private.is_family_parent(c.family_id)
  );
$$;

-- ── Filet global : policy RESTRICTIVE sur chaque table publique sous RLS ────
-- `(select …)` : évalué une fois par requête (initplan), pas une fois par ligne.
do $$
declare t text;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
      and c.relname <> 'profiles'
  loop
    execute format('drop policy if exists compte_actif_requis on public.%I', t);
    execute format(
      'create policy compte_actif_requis on public.%I as restrictive for all to authenticated '
      'using ((select private.caller_is_active())) with check ((select private.caller_is_active()))', t);
  end loop;
end $$;
