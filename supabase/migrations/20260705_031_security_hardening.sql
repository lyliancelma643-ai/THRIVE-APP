-- ─────────────────────────────────────────────────────────────────────────────
-- Refonte coach — durcissement sécurité (suite advisors).
--   1) RLS sur dossier_reminders (table interne du throttle des rappels ; seules
--      les fonctions SECURITY DEFINER y touchent → aucune policy = accès direct
--      refusé pour tous via PostgREST).
--   2) Révoque l'EXECUTE implicite (PUBLIC → anon) des RPC réservées :
--      seul le lien enfant (lsss_get/lsss_submit) reste ouvert à anon.
--      notify_incomplete_dossiers en particulier NE DOIT PAS être appelable par
--      anon (auth.uid() null y ouvre la portée globale — réservé au cron service).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.dossier_reminders enable row level security;

-- Fonction trigger : jamais appelée directement
revoke execute on function public.log_focus_word_change() from public;

-- RPC réservées aux utilisateurs authentifiés (retire l'héritage anon via PUBLIC)
revoke execute on function public.dossier_completeness(uuid)      from public;
revoke execute on function public.list_dossiers()                 from public;
revoke execute on function public.lsss_progression(uuid)          from public;
revoke execute on function public.lsss_send(uuid, text)           from public;
revoke execute on function public.notify_incomplete_dossiers(int) from public;

-- Réaffirme les accès voulus (les grants authenticated posés en 029/030 restent,
-- on les repose par sûreté)
grant execute on function public.dossier_completeness(uuid)      to authenticated;
grant execute on function public.list_dossiers()                 to authenticated;
grant execute on function public.lsss_progression(uuid)          to authenticated;
grant execute on function public.lsss_send(uuid, text)           to authenticated;
grant execute on function public.notify_incomplete_dossiers(int) to authenticated;

-- lsss_get / lsss_submit : volontairement laissés accessibles à anon (lien enfant
-- tokenisé, garde par token dans le corps des fonctions).
