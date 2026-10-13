-- ─────────────────────────────────────────────────────────────────────────────
-- Retour arrière de 082 (demandes d'appel de 15 min). Idempotent.
-- ATTENTION : supprime les demandes enregistrées. Les exporter avant si besoin :
--   select * from public.call_requests order by created_at;
-- Les alertes admin déjà envoyées (public.notifications) sont conservées.
-- ─────────────────────────────────────────────────────────────────────────────
set lock_timeout = '5s';

drop function if exists public.request_intro_call(text, timestamptz, uuid, text);
drop table if exists public.call_requests;
drop function if exists private.call_requests_touch();
drop function if exists private.is_coach_of_call_request(uuid, uuid);
