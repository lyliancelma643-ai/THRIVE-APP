# GO 3 · O5 — Synchro serveur du style de l'app

Statut : livré en local, migration 083 NON appliquée en prod (aucune écriture base faite).

## Décision (voie la plus sûre)
1. `profiles_update_own` autorise déjà l'UPDATE de toute la ligne du parent (`authenticated` a UPDATE sur 26 colonnes) ; `role` n'est protégé que par les triggers 018/066. Ajouter une écriture directe de `ui_style` n'aurait rien resserré.
2. Retenu : RPC `public.set_ui_style(p_style text)`, `SECURITY DEFINER`, `search_path = ''`, qui ne fait que `update profiles set ui_style = p_style where id = auth.uid()`. Pas d'identifiant en paramètre : impossible de viser un autre parent ni une autre colonne.
3. `EXECUTE` retiré à `public`/`anon`, accordé à `authenticated`. Valeur hors `natif|nuit|carnet` refusée (22023 + CHECK) ; `NULL` remet le défaut.
4. Lecture : `profiles_select_policy` laisse déjà le parent lire sa propre ligne (vérifié via pg_policies sur THRIVE-CA) ; pas de `get_ui_style`.
5. Aucune policy ni aucun trigger existant modifié ; rollback complet (fonction, contrainte, colonne).

## Comportement mobile
AsyncStorage reste immédiat. Au démarrage connecté, le style serveur valide l'emporte et est réécrit localement ; sinon le local est poussé une fois. Chaque changement : écriture locale, puis RPC en tâche de fond. Toute erreur (RPC/colonne absente avant la migration, réseau) est avalée sans alerte.

## Mise en prod (action de Lylian)
Appliquer `supabase/migrations/20261012_083_ui_style.sql` sur THRIVE-CA, puis relire `get_advisors`. Sans elle, l'app fonctionne comme avant (style local).

## Tests
`supabase/tests/ui_style.sql` (PGlite, étapes « 083 » et « rollback 083 ») ; `apps/mobile/src/design/styleSync.test.ts`.
