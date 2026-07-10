# Plan d'exécution — Segmentation en 3 forfaits (matrice de droits)

> **Statut : PHASE 0 LIVRÉE — EN ATTENTE DE VALIDATION EXPLICITE avant toute ligne de code de production.**
> Branche de travail : `feat/pricing-entitlements-matrix` (jamais `main` directement).
> Rapport de référence : [segmentation-forfaits.md](./segmentation-forfaits.md).
> Base prod : THRIVE-CA `kkdcgzvdmipmrgkawnky` (`ca-central-1`). Vérifications Phase 0 faites le 2026-07-10 (code + prod).

---

## 0. DÉCISIONS « À VALIDER » avant exécution

Les 4 décisions par défaut de l'audit, **appliquées d'office dans ce plan** mais à confirmer :

- **⚠️-A — Source de vérité unique = `families.pack`.** `entitlements` devient un
  journal d'achat qui alimente `pack` via trigger. Confirmé compatible avec le réel :
  `entitlements` existe en prod (0 ligne, jamais lue par le web), le verrou
  `enforce_pack_change_authority` (migration 023) laisse passer service_role et
  ADMIN/SUPER_ADMIN. → *Bloque la Phase 1.*
- **⚠️-B — Prix one-shot par parcours de 13 séances, $ CAD.** Bonne nouvelle :
  `entitlements.starts_at` / `expires_at` **existent déjà en prod** — rien à ajouter
  pour préserver un futur récurrent. → *Bloque les Phases 1 et 6.*
- **⚠️-C — `aiSummary` = OFF partout.** Flag dans la matrice + ligne « à venir » du
  comparatif, zéro intégration LLM. → *Bloque la Phase 7 (triviale).*
- **⚠️-D — Paiement Stripe côté web.** Checkout one-shot + webhook → edge function
  autorisée → entitlement ACTIVE → trigger → `pack`. Aucune dépendance Stripe
  aujourd'hui dans le repo (vérifié). → *Bloque la Phase 6.*

L'exploration a fait émerger **5 décisions supplémentaires** (défauts proposés, à confirmer) :

- **⚠️-E — Drift repo ↔ prod à rapatrier d'abord.** La prod contient **6 migrations
  absentes du repo** (`engagement_bilan_reveal`, `engagement_thrive_moments`,
  `engagement_family_streaks`, `engagement_gauge_progress_milestones`,
  `engagement_family_status_renewal_window`, `engagement_harden_function_grants`,
  toutes du 2026-07-08) et **2 edge functions absentes du repo** (`export-my-data`,
  `request-account-deletion`). Défaut proposé : commit `chore(db)` de rapatriement
  (dump des définitions prod → fichiers) **avant** la Phase 1, pour que la
  numérotation et les diffs restent sains. Aucun risque prod (lecture seule).
- **⚠️-F — `maxParents` n'a pas de socle de données.** `families.parent_id` est un
  UUID unique ; le flux « Ajouter un parent » (`select-profile`) crée un compte
  PARENT via `admin-create-user` **sans aucun lien avec la famille**. Défaut
  proposé : Phase 1 ajoute une table additive `family_members(family_id, profile_id,
  member_role)` rétro-remplie depuis `families.parent_id`, et le quota `maxParents`
  s'applique à ce flux de création. Alternative si tu préfères réduire le périmètre :
  descoper `maxParents` (affiché dans le comparatif, non enforced en v1).
- **⚠️-G — `generate-parent-report` accepte `detail_level` depuis le body de la
  requête** (ligne 62) : n'importe quel coach peut passer 1/2/3 à la main. Défaut
  proposé : suppression pure — le pack de la famille fait foi, plus aucun input
  client (un override explicite reste possible pour ADMIN/SUPER_ADMIN si tu y tiens,
  sinon on ne le code pas).
- **⚠️-H — Bibliothèque vidéo : la matrice §4.1 prime sur la mention `is_free`.**
  La matrice dit « bibliothèque complète ✅ pour les 3 packs » ; `is_free` (9 séances
  sur 39) ne peut donc pas ségréguer par pack. Défaut proposé : `is_free` sert de
  vitrine **avant activation** (compte verrouillé : les séances gratuites restent
  jouables, les autres en teaser), et les replays restent illimités pour tous les
  packs. Aucune restriction nouvelle pour un compte activé.
- **⚠️-I — Emplacement de la messagerie (Phase 5).** La nav 3 onglets est intouchable.
  Défaut proposé : page `/parent/(hub)/messages` accessible par une entrée dans le
  header (à côté du ChildSwitcher, même primitive `glass-navy`), pas de 4ᵉ onglet.
  Nécessité signalée (garde-fou §9 respecté) : un **inbox coach minimal** est requis
  pour que la messagerie serve à quelque chose — ce sera le seul ajout côté
  `/coach/*`, en réutilisant les primitives existantes de cet espace.

Si l'une de ces valeurs ne te convient pas, dis-le : le plan s'ajuste sans effort
tant que rien n'est codé.

---

## 1. Cartographie confirmée (Phase 0 — lecture seule, code + prod)

| Point de l'audit | Verdict |
| :-- | :-- |
| Monorepo `apps/{web,mobile,backend}` + `packages/shared` + `supabase/` (37 migrations, 6 edge functions locales) | ✅ conforme |
| `apps/web` = Next.js 14 App Router, port 3001, scripts `lint`/`typecheck`/`build` | ✅ |
| `families.pack` (text, check 3 valeurs, défaut ESSENTIEL) + trigger `enforce_pack_change_authority` | ✅ (migration 023) |
| `packs.ts` : 3 libellés, 3 prix, `canSeePremium`, séances 3/7/13 | ✅ |
| `parent_reports.detail_level` figé à 2 (`?? 2`, ligne 62 de `generate-parent-report`) | ✅ — 24 rapports prod, tous à 2 |
| `report_templates.pack_level` non utilisé | ✅ — 0 ligne en prod |
| `video_sessions.is_free` non exploité | ✅ — 9/39 gratuites, jamais lu par l'UI |
| `entitlements` orpheline (`plan_id` ne référence rien, `revenuecat_id` legacy) | ✅ — 0 ligne, absente des migrations du repo, jamais lue par le web |
| Teasers `LockedText` / `ScoreGauge` locked / `UpgradeHintBar` | ✅ mais **définis localement dans `my-sessions/page.tsx`** (non partagés) |
| Routes parent : `bilans`, `my-sessions`, `fitness`, `session/[id]`, `library`, `compte`, `select-profile` | ✅ |
| Gating actuel : `access.unlocked` (RPC `access_state`, migration 035) + `fitnessEnabled` (flag global OFF) + `families.pack` sur my-sessions uniquement | ✅ |
| RBAC : helpers `private.*` SECURITY DEFINER (migration 025), `app_metadata.role` | ✅ — 27 fonctions dans `private`, modèles parfaits pour `family_pack()` |
| Messagerie : `conversations` (UNIQUE coach_id+parent_id) / `messages` prêtes, RLS participants, aucune UI | ✅ — 0 ligne |
| RPC analytics réels : `gauge_summary`, `lsss_progression`, `dossier_completeness`, `list_dossiers` (jsonb) | ✅ |
| Design system : tokens `navy`/`cream`/`sun`/`sage`, `font-display`, `glass-navy`, nav 3 onglets « liquid glass » | ✅ lu (`tailwind.config.ts`, `globals.css`, layout hub) |

## 2. Divergences audit ↔ réel (découvertes Phase 0)

1. **Drift repo ↔ prod** : 6 migrations `engagement_*` + 2 edge functions
   (`export-my-data`, `request-account-deletion`) déployées en prod mais absentes du
   repo. La prod contient aussi des tables hors audit : `family_status` (statut
   FOUNDING + fenêtre de renouvellement), `family_streaks`, `thrive_moments`,
   `dossier_reminders`, `deletion_requests`, `app_settings`, `questionnaires`,
   `questions`. → décision ⚠️-E.
2. **Le gating premium actuel est UI-only côté données** : `my-sessions` télécharge
   le bilan complet (table legacy `reports`, jsonb `content`) puis floute côté
   client. Un parent ESSENTIEL peut lire le bilan détaillé via l'API REST. La
   Phase 3 corrige exactement ça (RLS + lecture filtrée serveur).
3. **Les teasers ne sont pas des composants partagés** : à extraire de
   `my-sessions/page.tsx` vers `components/parent/` **sans aucun changement visuel**.
4. **La page `bilans` est un générateur HTML** (`buildHtml` + `DESIGN_CSS` injectés
   via `dangerouslySetInnerHTML`) : le gating Phase 4 se fait par sections
   conditionnelles dans le générateur, pas par composants React classiques.
5. **Pas de modèle multi-parents** (`families.parent_id` unique, co-parent créé sans
   lien famille) → décision ⚠️-F.
6. **`detail_level` est contrôlable par le client** dans `generate-parent-report`
   → décision ⚠️-G.
7. **Réalité analytics** (Phase 8) : jauge = réelle (24 `skill_scores`) ; LSSS =
   réelle (43 items, RPC branchée) ; roue des émotions = quasi vide (1 log) ;
   journal `progress_log` = 43 lignes. Le commentaire d'en-tête de `bilans/page.tsx`
   confirme : visuels analytiques « illustratifs tant qu'aucune source ne les alimente ».
8. **Quotas et existant** : 7 enfants répartis sur 2 familles (une famille en a
   plusieurs). Les quotas `maxChildren`/`maxParents` s'appliqueront **aux nouveaux
   ajouts uniquement** (grandfathering : jamais de retrait d'accès rétroactif).
9. Détail mineur : le verrou 023 autorise aussi ADMIN/SUPER_ADMIN à changer `pack`
   (pas seulement service_role) — c'est voulu (gestion manuelle via `/admin/families`)
   et conservé tel quel.

---

## 3. Phases d'exécution

Convention : 1 phase = 1 commit atomique minimum sur `feat/pricing-entitlements-matrix`
(`feat(pricing): …`, `chore(rls): …`, `chore(db): …`). À chaque phase : `pnpm lint`
+ `pnpm typecheck` + `pnpm build` (apps/web), advisors Supabase avant/après toute
migration, résumé de ce qui a changé / reste. Migrations : **additives, `down`
documenté en commentaire de fin de fichier**, appliquées en prod uniquement après
ton accord explicite, phase par phase.

### Phase 1 — Fondations données (`plans`, `entitlements`, trigger de sync)

**Pré-requis : ⚠️-A, ⚠️-B, ⚠️-E, ⚠️-F validées.**

- Commit préalable `chore(db): rapatrie les migrations engagement + edge functions prod` (⚠️-E).
- Migration `supabase/migrations/20260710_038_plans_and_entitlements.sql` :
  - Table `public.plans` : `code text pk` (`ESSENTIEL|AVANCE|PERFORMANCE`),
    `price_cents int` (170000/200000/250000), `currency text default 'CAD'`,
    `features jsonb`, `limits jsonb`, `is_active bool`. Seed = matrice §2 du rapport
    de référence. RLS : lecture `authenticated`, écriture ADMIN/SUPER_ADMIN.
  - `entitlements` : FK `plan_id → plans.code` (NOT VALID puis VALIDATE — table vide,
    sans risque), index partiel « un seul entitlement ACTIVE par famille ».
  - Trigger `sync_family_pack_from_entitlements` (AFTER INSERT/UPDATE sur
    `entitlements`) : recalcule `families.pack` depuis l'entitlement ACTIVE le plus
    récent. Le trigger tourne côté base : l'UPDATE de `families` passe par
    `enforce_pack_change_authority` qui l'autorise (contexte service_role /
    SECURITY DEFINER, `auth.uid()` NULL dans les flux webhook). **On ne contourne
    jamais le verrou — on emprunte le chemin qu'il autorise.**
  - Table `family_members(family_id, profile_id, member_role text, created_at)`
    (⚠️-F), rétro-remplie depuis `families.parent_id`, RLS calquée sur `families`.
- **Rollback** : `drop trigger … ; drop table plans, family_members ; alter table
  entitlements drop constraint …` (documenté dans le fichier). Aucune donnée
  existante modifiée.
- **Risques** : quasi nuls (tables neuves + FK sur table vide). Advisors avant/après.
- **Critères d'acceptation** : seed = matrice exacte ; insérer un entitlement ACTIVE
  en SQL fait basculer `families.pack` ; un parent authentifié ne peut toujours pas
  s'auto-upgrader (`update families set pack…` → exception) ; 0 policy existante cassée.
- **Test manuel** : SQL sur une famille de test + vérification temps réel dans
  l'app (my-sessions se rafraîchit déjà sur les changements de `families`).

### Phase 2 — Matrice de droits partagée (`packs.ts`, `entitlements.ts`, `usePlan()`)

- `apps/web/src/lib/packs.ts` : ajouter `PLAN_FEATURES: Record<Pack, PlanFeatures>`,
  `PLAN_LIMITS: Record<Pack, PlanLimits>`, `can(pack, feature)`, `limit(pack, key)`.
  **Rétrocompat totale** : `canSeePremium`/`canSeeMessage`/`upgradeHint` conservés,
  réexprimés via la matrice (`canSeePremium` ≡ `detailedBilan`), même signature.
  La constante TS est la copie conforme du seed SQL (un test de cohérence les compare).
- Nouveau `apps/web/src/lib/entitlements.ts` : store Zustand `usePlan()` (miroir du
  pattern `useAccessStore` : `refresh()`, état, repli sûr `ESSENTIEL`), chargé depuis
  `children → families(pack)` pour l'enfant sélectionné. Une seule source côté client ;
  `my-sessions` migre dessus (suppression de son fetch de pack local).
- Extraction **iso-visuelle** des teasers de `my-sessions/page.tsx` vers
  `apps/web/src/components/parent/PackGate.tsx` (`LockedText`, `ScoreGauge`,
  `UpgradeHintBar`, `LockIcon`, `BilanCard`) — mêmes classes, zéro pixel de différence.
- **Risques** : régression visuelle my-sessions → captures avant/après.
- **Critères** : lint/typecheck/build OK ; my-sessions strictement identique à l'œil ;
  `can()`/`limit()` couverts par la constante seule (pas d'appel réseau supplémentaire).

### Phase 3 — RLS & profondeur serveur (la vraie ligne de défense)

**Pré-requis : ⚠️-G validée.**

- Migration `20260710_039_pack_rls.sql` :
  - Helper `private.family_pack(p_child uuid) returns text` SECURITY DEFINER
    (calqué sur `private.is_parent_of_child`), + variante `private.family_pack_of(p_family uuid)`.
    `revoke execute … from anon, authenticated` inutile ici (helpers `private` déjà
    hors API), `set search_path` comme les existants.
  - `reports` (legacy, lue par my-sessions) : la policy de lecture parent est
    remplacée par une lecture **filtrée** — nouvelle RPC `session_report(p_session_id)`
    SECURITY DEFINER qui renvoie toujours `message du coach`, et le bilan détaillé +
    observations **uniquement si** `canSeePremium(pack, session_number)` côté SQL.
    La policy SELECT parent directe sur `reports` est restreinte (coach/admin intacts).
    → corrige la divergence n° 2 (fuite API du bilan détaillé).
  - `parent_reports` : SELECT parent conditionné — un rapport `detail_level` > au
    niveau du pack de la famille n'est pas lisible (les rapports sont regénérés au
    bon niveau à l'upgrade, cf. Phase 6).
  - `skill_scores` (détail par compétence) : SELECT parent conditionné à
    `family_pack(child_id) IN ('AVANCE','PERFORMANCE')`. La jauge **globale** reste
    accessible à tous les packs via `gauge_summary` (SECURITY DEFINER, inchangée).
  - `emotion_logs` + `progress_log` : SELECT parent conditionné à AVANCE+.
  - `lsss_progression` : gate pack AVANCE+ à l'intérieur de la RPC (rôle PARENT seulement).
  - `athlete_documents` : lecture de la lettre (`kind = 'LETTER'`) conditionnée
    AVANCE+ ; contrat et certificat pour tous.
- `supabase/functions/generate-parent-report/index.ts` : suppression du
  `body?.detail_level ?? 2` → lecture du pack de la famille de l'enfant
  (`children → families.pack`) puis `detailLevel = limits.detailLevel` du plan.
  Les gabarits `report_templates` sont interrogés avec `pack_level` (Phase 6 des
  gabarits premium : requête étendue `pack_level = pack` pour PERFORMANCE).
- **Rollback** : chaque policy remplacée est recréée à l'identique (le fichier de
  migration contient l'ancienne définition en commentaire `-- down`).
- **Risques** : le plus délicat du chantier — casser la lecture coach/admin ou le
  temps réel. Mitigation : ne toucher que les policies PARENT, advisors + suite de
  tests SQL par rôle × pack (voir §4), test manuel des 3 espaces.
- **Critères** : un PARENT ESSENTIEL ne peut plus lire un bilan détaillé **en SQL
  direct** (test REST) ; un AVANCE lit les séances 3/7/13 seulement ; un PERFORMANCE
  lit tout ; coach/admin inchangés ; `generate-parent-report` produit `detail_level`
  1/2/3 selon le pack.

### Phase 4 — UI graduée (cœur produit, zéro régression visuelle)

- `bilans/page.tsx` (générateur `buildHtml`) : sections conditionnées par `usePlan()` —
  jauge par compétence + delta (`skillBreakdown`), courbe LSSS (`lsssCurve`), roue
  des émotions (`emotionWheel`), journal (`progressJournal`). Version verrouillée =
  même section, valeurs floutées + bandeau `UpgradeHintBar` (mêmes classes que
  my-sessions, adaptées au CSS du générateur sans nouvelle couleur). La jauge
  globale reste visible pour tous.
- `my-sessions/page.tsx` : déjà branché — bascule sur `usePlan()` + `can('detailedBilan')`,
  comportement identique (3/7/13 vs 13).
- `fitness/page.tsx` (⚠️-H) : compte activé = aucun changement ; compte verrouillé =
  les séances `is_free` deviennent jouables en aperçu, les autres gardent le teaser
  (réutilise `GreyedSection`/`LockedBanner`).
- `ChildSwitcher.tsx` + `select-profile/page.tsx` : enforcement `maxChildren` /
  `maxParents` — au-delà du quota, le formulaire d'ajout est remplacé par
  `UpgradeHintBar` + CTA vers `/parent/upgrade`. Enforcement dur côté base (trigger
  de quota sur `children` INSERT / `family_members` INSERT, dans la migration 039)
  pour ne pas dépendre de l'UI. Grandfathering : l'existant n'est jamais retiré.
- **Critères** : diff visuel avant/après sur les 4 pages × 3 packs (captures) ;
  navigation, chargements, temps réel inchangés ; aucun nouveau token visuel.

### Phase 5 — Messagerie parent ↔ coach (exclusivité PERFORMANCE)

**Pré-requis : ⚠️-I validée.**

- Migration `20260710_040_messaging_pack_gate.sql` : policies `conversations`/`messages`
  complétées — un PARENT ne peut créer/écrire que si
  `private.family_pack_of(sa famille) = 'PERFORMANCE'` (lecture conservée si le pack
  descend, pour ne rien casser) ; le coach répond à ses conversations existantes.
- UI parent `/parent/(hub)/messages` : liste de conversations + fil, primitives du
  hub (`glass-navy`, `BilanCard`, patterns realtime déjà utilisés partout).
  Entrée dans le header du hub. Pack < PERFORMANCE : la page existe en teaser
  (structure visible, `UpgradeHintBar`).
- UI coach minimale (nécessité signalée) : liste + réponse dans l'espace coach,
  mêmes primitives que cet espace.
- **Critères** : un PERFORMANCE échange en temps réel avec son coach ; un ESSENTIEL/
  AVANCÉ voit le teaser et ne peut pas écrire **même via l'API** ; realtime OK.

### Phase 6 — Flux d'achat / upgrade Stripe

**Pré-requis : ⚠️-B, ⚠️-D validées + clés Stripe fournies (test d'abord).**

- Page `/parent/(hub)/upgrade` : tableau comparatif des 3 forfaits (matrice §2 du
  rapport), pack courant marqué, positionnements §4.2, CTA par forfait. Design 100 %
  hub (tokens existants, aucune nouvelle primitive). Ligne IA marquée « à venir ».
- Edge function `create-checkout-session` (JWT vérifié, rôle PARENT) : crée une
  session Stripe Checkout one-shot CAD (metadata `family_id`, `plan_code`).
- Edge function `stripe-webhook` (`verify_jwt: false`, signature Stripe vérifiée) :
  sur `checkout.session.completed` → insère l'entitlement ACTIVE → le trigger de la
  Phase 1 met `families.pack` à jour → **relance `generate-parent-report`** pour les
  bilans existants de la famille (regénération au nouveau `detail_level`, fonction
  déjà idempotente).
- Env : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (secrets edge functions),
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — ajoutés à `.env.example`.
- **Critères** : paiement test → pack à jour sans intervention manuelle ; l'UI
  reflète le nouveau pack en temps réel (subscriptions `families` déjà en place) ;
  aucune écriture de `pack` hors chemin autorisé ; upgrade AVANCÉ→PERFORMANCE
  facturé au différentiel (à confirmer : différentiel ou plein tarif ?).

### Phase 7 — Emplacement IA (sans build LLM)

- `aiSummary: false` pour les 3 packs dans la matrice (déjà prévu Phase 1/2) ;
  ligne « Synthèse IA de fin de parcours — à venir » dans le comparatif, style
  discret existant (`text-white/45`). Aucune dépendance, aucun appel.

### Phase 8 — Vérité analytics (avant de facturer une donnée, elle doit être réelle)

- Audit visuel par section du bilan : branchée sur `gauge_summary` /
  `lsss_progression` / `skill_scores` / `emotion_logs` / `progress_log` ou
  illustrative ?
- État connu (prod, 2026-07-10) : jauge globale **réelle** ; LSSS **réelle** ;
  roue des émotions **quasi vide** (1 log — vendue en AVANCÉ : soit le coach saisit
  les émotions en séance dès maintenant, soit la section affiche un état « en cours
  de collecte » honnête) ; delta par compétence à vérifier (24 `skill_scores` mais
  granularité par séance à confirmer).
- Livrable : liste finale des visuels encore illustratifs + recommandation par
  visuel (brancher / masquer / état vide honnête). Rien d'illustratif ne reste
  présenté comme une donnée réelle dans un pack payant.

---

## 4. Vérifications transverses (chaque phase)

- `pnpm lint && pnpm typecheck && pnpm build` dans `apps/web` (+ build
  `packages/shared` si touché).
- Advisors Supabase (`security` + `performance`) avant/après chaque migration.
- Suite SQL de non-régression RLS : pour chaque rôle (PARENT×3 packs, COACH, ADMIN),
  vérifier lecture/écriture attendue sur `reports`, `parent_reports`, `skill_scores`,
  `emotion_logs`, `athlete_documents`, `conversations`, `messages`, `families.pack`.
- Diff visuel : captures des 4 pages parent avant/après chaque phase UI.
- Jamais de `apply_migration` en prod sans ton accord explicite, phase par phase.

## 5. Ce qui ne sera PAS fait (garde-fous §9 du prompt)

Aucune nouvelle couleur/police/primitive ; pas de composants de verrouillage
dupliqués ; pas de contournement de `enforce_pack_change_authority` ; pas de gating
UI-only ; pas de LLM ; pas de modification `apps/mobile`/`apps/backend`/Expo racine
(sauf l'inbox coach signalé en ⚠️-I) ; pas de migration destructive ; pas d'atteinte
à la conformité Loi 25 (sécurité, consentements, MFA, audit — non segmentables).
