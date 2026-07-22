# Audit — Mode Terrain (écran de séance coach)

> Rapport préalable à l'implémentation. Aucune ligne de code produit avant validation.

## 1. Cartographie de l'existant

| Élément | Emplacement |
|---|---|
| Écran de séance coach | `apps/web/src/app/coach/athletes/[id]/session/[sessionId]/page.tsx` (523 l., **un seul composant client**) |
| Contenu des 13 séances | `apps/web/src/lib/session-scripts.json` (517 Ko) |
| Typage + accès contenu | `apps/web/src/lib/session-scripts.ts` (`getSessionScript`, `fillParentTemplate`) |
| Tranche d'âge | `apps/web/src/lib/catalog.ts` → `ageGroupFromBirthDate()` |
| Layout coach (nav basse mobile) | `apps/web/src/app/coach/layout.tsx` |
| Primitives de marque | `apps/web/src/components/ui/{Button,Card,Badge,Icon,Skeleton}.tsx` |
| Primitives formulaire coach | `apps/web/src/components/coach/ui.tsx` |
| Tokens | `apps/web/tailwind.config.ts` (navy/cream/sun/sage), `globals.css` (`.glass*`, `prefers-reduced-motion`) |

Stack : Next.js 15 App Router, React 19, Tailwind 3 (`darkMode: 'class'`), Zustand, Supabase JS **côté client**.

## 2. Schéma exact du contenu

`session-scripts.json` = `Record<AgeGroup, Record<"1".."13", SessionScript>>` → **3 × 13 = 39 scripts**, 4 217 blocs au total.

```ts
type SessionScript = { title: string; blocks: ScriptBlock[]; parentTemplate: string }

type ScriptBlock =
  | { t:'section';   title: string; level: 2|3 }   // délimiteur de temps
  | { t:'callout';   icon: '🎯'|'⚠️'|'🔑'; text: string }
  | { t:'verbatim';  text: string }                 // phrase prononcée par le coach
  | { t:'checklist'; items: string[] }              // max observé : 7
  | { t:'grid';      items: string[] }              // indicateurs 1–5, max observé : 14
  | { t:'field';     label: string; hint?: string } // note libre
  | { t:'chips';     items: string[] }
  | { t:'text';      text: string }
```

**La structure est plate** : les `section` sont des délimiteurs, les blocs suivants appartiennent à la dernière section rencontrée. Chaque section porte donc déjà « ses » checklists, « sa » grille, « ses » champs. **Le mapping indicateur → temps de séance est donc déjà dans la donnée** — il suffit de le lire, rien à coder en dur.

Durées : extraites du titre via `^(\d+):(\d+)\s*[–-]\s*(\d+):(\d+)` (ex. `"0:05–0:25 — Exercice sportif…"`), fonction `parseTimeRange` déjà présente ligne 25.

## 3. Où sont persistées les saisies aujourd'hui

**Brouillon — `localStorage`, clé `thrive-seance-${sessionId}`**, debounce 600 ms :

```ts
{ checks: Record<string,boolean>, ratings: Record<string,number>,
  fields: Record<string,string>, parentMsg: string, startedAt: number|null }
```

Clés (à **réutiliser à l'identique** en Mode Terrain) :
- `checks` → `` `${blockIndex}-${itemIndex}` ``
- `ratings` → `` `${blockIndex}|${libellé indicateur}` ``
- `fields` → `label` du champ — **vérifié : 0 doublon de label sur les 39 scripts** ✔

**Envoi final** (`send()`, l. 164) :
1. `UPDATE sessions` → `status='COMPLETED'`, `completed_at`, `coach_notes = parentMsg`
2. `INSERT reports` → `content: { session_id, session_number, titre, "message du coach", observations: {libellé→note}, ...champs remplis }`
3. best-effort `INSERT coach_reports` + edge function `generate-parent-report`

→ **Rien n'est écrit en base pendant la séance.** Tout est local jusqu'à l'envoi. Le Mode Terrain n'a donc **aucun schéma à créer** : il partage le même state et le même `send()`.

## 4. Points de friction — à trancher

### 🔴 A. Le découpage « 5 temps » n'est pas universel
Sections L2 **avec** plage horaire, par script :

| | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 | S13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|8-11 |5/7|7/9|7/9|8/10|7/10|7/10|7/10|7/10|6/8|7/10|7/10|7/10|7/10|
|12-14|8/10|7/9|7/9|6/8|7/10|6/9|6/10|7/10|6/9|**11/17**|5/8|7/10|7/10|
|15-17|5/8|6/9|5/8|5/8|5/8|5/8|7/10|**0/8**|**0/11**|**0/10**|**0/9**|**0/9**|5/9|

**15-17 S8→S12 n'ont aucune plage horaire** (elles utilisent « Temps 1 — … », « Temps 5 — … »). Et 70 titres L2 distincts n'ont pas de plage : certains sont de vrais temps, d'autres sont du contexte (« Ce que S8 cherche à déplacer », « Cadre théorique — Pour le coach »), du protocole (« ⚠️ Points de vigilance ») ou le bilan final.

→ **Règle retenue : 1 page = 1 section L2**, quel qu'en soit le nombre (5 à 17). Durée affichée **uniquement si** parsable — sinon pas de chrono cible, jamais de durée inventée. Zéro cas particulier S1/S7.

### 🔴 B. Les « 5 catégories de la Grille d'Observation Coach » n'existent pas dans le produit
198 grilles, **484 libellés d'indicateurs libres et uniques**, aucun champ catégorie, aucun indicateur de type « vigilance à cocher », aucune logique d'alerte en base. Les 5 catégories du brief ne sont nulle part dans le repo (ni JSON, ni SQL, ni `thrive-guides.ts`).

→ Le mapping indicateur→temps demandé **est déjà satisfait par la structure** (§2). Pour la **Catégorie 5 (vigilance)**, deux options — **c'est ta décision** :
- **(1) Ne rien inventer** *(recommandé)* : afficher les sections/callouts `⚠️` existants (« ⚠️ Points de vigilance — Protocole de référencement », « ⚠️ Ce qu'il faut éviter ») dans le bandeau **Important**, verbatim. Aucune case à cocher de vigilance tant que la donnée n'existe pas.
- **(2)** Tu me fournis la liste officielle des indicateurs de vigilance + le protocole de remontée, et je pose une table de config + le branchement bilan.

### 🟠 C. Deux formes de verbatim
138 blocs `verbatim`, mais **267 blocs `text` commencent par `📢 «…»`** (notamment 15-17 S8+). La sélection de la phrase-clé doit gérer les deux — sinon 5 séances sur 39 n'auraient pas de phrase-clé.

### 🟠 D. Aucun runner de tests unitaires dans le monorepo
Il n'y a que Playwright e2e (`apps/web/e2e/`) et `deno test` (webhook Stripe). Pour tester `buildFieldModeSession` il faut ajouter **Vitest** à `apps/web` + un job CI. Faible risque, mais c'est une dépendance en plus. *(Recommandé : oui.)*

### 🟠 E. 96 blocs contiennent des échappements markdown résiduels
Ex. `"Temps 2 — Rappel du transfert (S6 \+ S7)"`, `"1\. Retour sur le parcours"` — affichés bruts aujourd'hui. Nettoyage **à l'affichage uniquement** (le JSON source n'est pas touché). *(Recommandé : oui, dans le Mode Terrain seulement.)*

### 🟡 F. Limites de la plateforme web (PWA)
- **Haptique** : `navigator.vibrate()` → OK Android, **indisponible sur iOS Safari**. Dégradation propre.
- **Dictée vocale** : `SpeechRecognition` → Chrome/Android OK, Safari partiel. Sur iOS le micro du clavier natif reste disponible. Je branche l'API si présente, sinon je n'affiche pas le bouton.
- **Verrou portrait** : `screen.orientation.lock()` exige le plein écran / PWA installée. Best-effort + `@media (orientation: landscape)` de repli.
- **Mode sombre** : l'espace coach est clair uniquement (`darkMode:'class'` n'est utilisé que par la roadmap admin). Le Mode Terrain embarque sa propre surface sombre + un mode haute luminosité.

### 🟡 G. L'écran est un composant client monolithique
Le state (`checks/ratings/fields/parentMsg/startedAt`) est local à `page.tsx`. Pour partager sans dupliquer : **extraction dans un hook `useSessionDraft`**, le rendu standard restant strictement inchangé.

## 5. Plan d'implémentation

```
apps/web/src/lib/field-mode/
  types.ts              FieldModePage, FieldModeSession, KeyPhrase, …
  build.ts              buildFieldModeSession(script) — pure, testée
  build.test.ts         Vitest
apps/web/src/hooks/
  useSessionDraft.ts    state + localStorage extraits de page.tsx (comportement identique)
apps/web/src/components/coach/field-mode/
  FieldModeShell.tsx    plein écran, portrait, nav swipe + Préc/Suiv, barre de progression
  FieldModePage.tsx     assemble les 5 blocs
  ImportantBanner.tsx   surcouche ⚠️ repliée, verbatim
  BlockHeaderTimer.tsx  titre + durée cible + chrono section (pause/reprise/reset)
  BlockKeyPhrase.tsx    ≤ 2 lignes + « Voir le détail »
  BlockChecklist.tsx    ≤ 5 items, cible 56 px, haptique
  BlockObservationGrid.tsx  1–5 segmentés, ≥ 56 px, forme + couleur
  BlockFreeNote.tsx     plein écran, autosave, dictée si dispo
  DetailSheet.tsx       feuille modale, contenu source intégral
```

**Contrat de `buildFieldModeSession(script)`** — pur, ne modifie jamais la source :
1. Découpe par section L2 → une page par temps.
2. `durationMin` = `parseTimeRange(title)` si parsable, sinon `null`.
3. `keyPhrase` = 1er `verbatim` de la section → sinon 1er `text` `📢 «…»` → sinon le `text` le plus court portant l'intention → sinon `null`. **Jamais de réécriture.**
4. `checklist` = items des blocs `checklist` de la section, ordre d'origine, **5 visibles + reste en feuille détail**.
5. `indicators` = items des blocs `grid` de la section, **avec la clé `${bi}|${libellé}` identique au mode standard**.
6. `notes` = blocs `field` de la section, clé = `label`.
7. `important` = callouts `⚠️` de la section (+ callouts de préambule sur la page 1), verbatim.
8. `detail` = **tous** les blocs de la section, sans perte.

**Entrée / sortie** : bouton « Mode terrain » dans l'en-tête + dans la barre basse ; sortie « Quitter le mode terrain » qui restaure le scroll à la section correspondante. Page courante persistée dans le même brouillon (`fieldModePage`) → reprise exacte après verrouillage/perte réseau.

**Feature flag** : `NEXT_PUBLIC_FIELD_MODE` (défaut **on** en preview, à activer en prod sur ton feu vert) — un seul point de bascule dans `page.tsx`.

**Tests**
- Unitaires (Vitest) sur `build.ts` : **les 39 scripts** (aucune page vide, aucune clé divergente du mode standard), S1, S7, 15-17 S8 (0 plage horaire), section sans checklist, section sans indicateur, phrase-clé trop longue, `📢`.
- E2E (Playwright) : entrée/sortie sans perte, coche + note 1–5 persistées après reload, reprise à la bonne page.

## 6. Ce que je ne touche pas
Contenu des séances · schéma de la grille et échelle 1–5 · rendu du mode standard (hors ajout du bouton) · `send()` et son payload · tables Supabase.

## 7. Décisions attendues
1. **Vigilance (§4-B)** : option (1) « on n'invente rien » — ou tu fournis la liste officielle ?
2. **Vitest + job CI** (§4-D) : OK ?
3. **Nettoyage des échappements markdown à l'affichage** (§4-E) : OK ?
4. **Flag en prod** : activé d'emblée, ou preview d'abord ?
