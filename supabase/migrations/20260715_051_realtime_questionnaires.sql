-- 051 — Realtime sur public.questionnaires.
--
-- Le bilan parent (useBilanData) écoute postgres_changes sur `questionnaires`
-- pour recharger la courbe EPOCH / la jauge LSSS dès qu'un questionnaire est
-- complété. Mais la table n'avait jamais été ajoutée à la publication
-- supabase_realtime : aucun événement n'était diffusé, donc une séance
-- complétée (ex. depuis la cloche de notifications) n'apparaissait pas sur le
-- graphique « Progression du bien-être » tant que le cache client n'expirait
-- pas. La RLS reste appliquée par Realtime : chaque abonné ne reçoit que les
-- lignes qu'il a le droit de lire (questionnaires_parent_read, etc.).

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'questionnaires'
  ) then
    alter publication supabase_realtime add table public.questionnaires;
  end if;
end $$;
