-- 20260710_041_messaging_pack_gate.sql
-- Messagerie directe parent ↔ coach : exclusivité du forfait PERFORMANCE
-- (feature `coachMessaging` de la matrice `plans`).
--
-- Principe : policies RESTRICTIVES sur l'INSERT uniquement — un parent ne peut
-- créer une conversation ni écrire un message que si son forfait ouvre
-- coachMessaging. La LECTURE reste celle des participants (un downgrade ne
-- fait pas disparaître l'historique). Coach/admin strictement inchangés.
--
-- Rollback (down) :
--   drop policy conversations_parent_requires_messaging on public.conversations;
--   drop policy messages_parent_requires_messaging on public.messages;
--   drop function private.parent_has_feature(text);

-- Le forfait de la famille du parent connecté ouvre-t-il cette feature ?
create or replace function private.parent_has_feature(p_feature text)
returns boolean language sql stable security definer set search_path = 'public'
as $$
  select coalesce((
    select (p.features ->> p_feature)::boolean
    from public.families f
    join public.plans p on p.code = f.pack
    where f.parent_id = auth.uid()
    limit 1
  ), false);
$$;

drop policy if exists conversations_parent_requires_messaging on public.conversations;
create policy conversations_parent_requires_messaging on public.conversations
  as restrictive
  for insert to authenticated
  with check (
    private.jwt_role() <> 'PARENT'
    or private.parent_has_feature('coachMessaging')
  );

drop policy if exists messages_parent_requires_messaging on public.messages;
create policy messages_parent_requires_messaging on public.messages
  as restrictive
  for insert to authenticated
  with check (
    private.jwt_role() <> 'PARENT'
    or private.parent_has_feature('coachMessaging')
  );
