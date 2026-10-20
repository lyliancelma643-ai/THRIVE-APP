# GO 3 · O5 — Synchro serveur du style de l'app

> **Remplacé par GO 4 (lot O6) : valeurs `lin|veillee`.** La migration 083, toujours non appliquée en prod, a été modifiée en place (pas de 084) :
> - contrainte `check (ui_style in ('lin','veillee'))`, `NULL` = défaut côté app (`lin`) ;
> - `set_ui_style` accepte `lin|veillee` et normalise les anciennes valeurs pour les clients GO 3 (`natif|carnet → lin`, `nuit → veillee`) ; toute autre valeur → `22023` ; `NULL` remet le défaut ; renvoie la valeur enregistrée ;
> - si une base porte déjà la version GO 3 de 083, la migration retire l'ancienne contrainte, convertit les lignes existantes, puis pose la nouvelle ;
> - garanties de sécurité inchangées (SECURITY DEFINER, `search_path = ''`, `auth.uid()` seul, EXECUTE retiré à `public`/`anon`) ; rollback inchangé (fonction, contrainte, colonne).
>
> Les mentions `natif|nuit|carnet` ci-dessous décrivent l'état GO 3 et ne sont plus valables. Spécification : `GO4_UI_LIN_VEILLEE.md` §3.2.

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
