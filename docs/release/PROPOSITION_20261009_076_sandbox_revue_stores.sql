-- ─────────────────────────────────────────────────────────────────────────────
-- 076 — PROPOSITION (non appliquée) : interrupteur « achats sandbox acceptés ».
--
-- Problème : 070 ignore les achats sandbox sauf pour le staff, les adresses
-- @thrivesportpositive.com et public.qa_accounts. Or l'App Review et la revue
-- Google achètent TOUJOURS en sandbox. Si le reviewer crée son propre compte
-- (ce que demandent les notes de revue actuelles), l'achat réussit mais
-- Maison reste verrouillée → rejet 2.1 (« IAP ne débloque pas le contenu »).
--
-- Correctif : app_settings.accept_sandbox_purchases. Activé pendant les
-- revues (ON par défaut à la création), à repasser OFF après publication si
-- l'on veut refermer l'accès aux testeurs TestFlight. Un achat sandbox ne
-- peut venir QUE d'un build TestFlight / revue / développement.
--
-- Rollback : remettre le corps de has_p3_subscription de la migration 070.
-- ─────────────────────────────────────────────────────────────────────────────
set lock_timeout = '5s';

insert into public.app_settings (key, enabled, note)
values ('accept_sandbox_purchases', true,
        'Achats sandbox (App Review, Play review, TestFlight) acceptés pour ouvrir Maison. OFF = seulement staff/QA.')
on conflict (key) do nothing;

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
          not s.is_sandbox
          or private.is_qa_account(s.user_id)
          or coalesce((select a.enabled from app_settings a where a.key = 'accept_sandbox_purchases'), false)
        )
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
