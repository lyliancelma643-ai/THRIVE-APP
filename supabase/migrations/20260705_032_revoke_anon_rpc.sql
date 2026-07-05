-- ─────────────────────────────────────────────────────────────────────────────
-- Suite du durcissement : Supabase pose un GRANT EXPLICITE à anon/authenticated
-- sur les fonctions du schéma public. Le `revoke ... from public` de 031 ne
-- suffit donc pas à retirer l'accès anon → on révoque explicitement de anon.
-- Seuls lsss_get / lsss_submit restent ouverts à anon (lien enfant tokenisé,
-- garde par token dans le corps des fonctions).
-- ─────────────────────────────────────────────────────────────────────────────

revoke execute on function public.log_focus_word_change()          from anon, authenticated;
revoke execute on function public.dossier_completeness(uuid)       from anon;
revoke execute on function public.list_dossiers()                  from anon;
revoke execute on function public.lsss_progression(uuid)           from anon;
revoke execute on function public.lsss_send(uuid, text)            from anon;
revoke execute on function public.notify_incomplete_dossiers(int)  from anon;
