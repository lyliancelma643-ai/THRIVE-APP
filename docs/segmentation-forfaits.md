# Segmentation en 3 forfaits — rapport de référence

> Document de référence du chantier « matrice de droits » (feature flags + quotas)
> appliquée de bout en bout : base (RLS) → edge functions → UI.
> Périmètre : `apps/web` (Next.js 14, PWA cible) + `supabase/` + `packages/shared`.
> Hors périmètre : `apps/mobile`, `apps/backend`, code Expo legacy racine, espaces `/coach/*` et `/admin/*` (sauf nécessité signalée).
> Plan d'exécution détaillé : [segmentation-forfaits-plan.md](./segmentation-forfaits-plan.md).

## 1. Mission

Transformer le système de forfaits actuel — un flag mono-usage (`families.pack`)
qui ne débloque qu'une seule fonctionnalité (le bilan détaillé de `my-sessions`) —
en une véritable matrice de droits dérivée de `families.pack`, et escalader la
puissance produit sur les 3 forfaits déjà nommés et tarifés :

| Forfait | Prix (one-shot, parcours 13 séances, $ CAD) | Positionnement |
| :-- | :-- | :-- |
| **ESSENTIEL** | 1 700 $ | « Le parcours THRIVE complet avec votre coach. » |
| **AVANCÉ** | 2 000 $ | « Comprenez la progression, aux moments clés. » |
| **PERFORMANCE** | 2 500 $ | « L'accompagnement le plus profond et le plus personnalisé. » |

**Contrainte absolue : zéro régression d'UX, d'ergonomie, de charte graphique.**
Navigation 3 onglets (Bilan · Mes séances · Fitness), tokens Tailwind
(`navy`/`cream`/`sun`/`sage`, `font-display`, `glass-navy`), composants de teaser
existants (`LockedText`, `ScoreGauge` locked, `UpgradeHintBar`) : tout est réutilisé,
rien n'est réinventé.

## 2. Matrice de droits cible (source unique)

Chaque palier reprend tout le précédent (⭐ escalade). Cette table est LA référence :
elle sera sérialisée telle quelle dans la table `plans` (colonnes `features` / `limits`)
et dans la constante partagée `PLAN_ENTITLEMENTS` de `apps/web/src/lib/packs.ts`.

| Fonctionnalité / Quota | Clé | ESSENTIEL | AVANCÉ | PERFORMANCE |
| :-- | :-- | :--: | :--: | :--: |
| Coach humain 1:1 (13 séances) | — (socle) | ✅ | ✅ | ✅ |
| Bibliothèque vidéo interactive complète | — (socle) | ✅ | ✅ | ✅ |
| Carte d'identité / passeport athlète | — (socle) | ✅ | ✅ | ✅ |
| Message du coach (chaque séance) | — (socle) | ✅ | ✅ | ✅ |
| Jauge compétences de vie — globale | — (socle) | ✅ | ✅ | ✅ |
| Jauge par compétence + delta | `skillBreakdown` | ❌ | ✅ | ✅ |
| Courbe LSSS longitudinale | `lsssCurve` | ❌ | ✅ | ✅ |
| Roue des émotions | `emotionWheel` | ❌ | ✅ | ✅ |
| Journal de progression | `progressJournal` | ❌ | ✅ | ✅ |
| Bilan détaillé + observations chiffrées | `detailedBilan` | ❌ | Séances 3 · 7 · 13 | Toutes (13) |
| Profondeur rapport parent | `detailLevel` (limit) | **1** | **2** | **3** |
| Gabarits de rapport premium | `premiumTemplates` | ❌ | ❌ | ✅ |
| Lettre personnalisée du coach | `coachLetter` | ❌ (certificat seul) | ✅ | ✅ |
| Certificat de fin de parcours | — (socle) | ✅ | ✅ | ✅ |
| Messagerie directe coach | `coachMessaging` | ❌ | ❌ | ✅ 🔧 |
| Export CSV du parcours | `csvExport` | ❌ | ❌ | ✅ |
| Export PDF du parcours | `pdfExport` | ❌ | ❌ | ✅ |
| Synthèse IA fin de parcours | `aiSummary` | ❌ | ❌ | **à venir (flag OFF)** |
| Nombre d'enfants | `maxChildren` | 1 | 2 | ∞ (`null`) |
| Comptes parents/superviseurs | `maxParents` | 1 | 2 | ∞ (`null`) |
| Historique / rétention | `historyMonths` | 3 | 12 | ∞ (`null`) |
| Stockage documents | `storageMb` | 100 (base) | 500 (étendu) | 2000 (max) |

Principe d'équité perçue : plus de **profondeur** (detailLevel 1→3), plus de
**fréquence** (bilans détaillés 0 → 3 → 13), plus de **volume** (enfants, historique,
stockage), une **exclusivité** claire (messagerie, exports, IA à venir). Le teaser
flouté rend l'upgrade désirable sans frustrer : structure et titres toujours
visibles, contenu masqué, jamais de données réelles exposées.

## 3. Architecture réelle (corrigée le 2026-10-08)

> L'ancienne version décrivait un flux Stripe Checkout → webhook → `entitlements`
> → trigger → `families.pack` pour les packs. **Ce flux n'est pas branché** : les
> packs coachés (Essentiel / Avancé / Performance, et les packs programme Groupe /
> Individuel / Complet) ne s'achètent pas dans l'app ni en ligne. Le paiement se
> fait hors app avec le coach, puis un **Admin/Super Admin attribue le pack à la
> main** (écriture de `families.pack`, seul chemin autorisé : trigger
> `enforce_pack_change_authority`, migration 023 ; `sync_family_pack_from_entitlements`
> (038) existe mais aucune ligne `entitlements` n'est créée automatiquement).

```
Packs coachés (hors app)            Abonnement Maison (P3, seul paiement en ligne)
 Admin ── attribue ──► families.pack      Stripe / App Store / Google Play
 Admin ── attribue ──► parent_access        │ RevenueCat → webhook / billing-sync
        (pack programme + forçages)          ▼
                │                       billing_subscriptions (sandbox exclu 070)
                └──────────────┬──────────────┘
                               ▼
                    public.access_state()  ← UNIQUE source de vérité UI
                    (web: lib/access.ts · mobile: useEntitlement)
                               │
                  RLS (dernière ligne de défense) : gate_parent_* , plans
```

- **Trois couches distinctes** : pack programme (`parent_access.program_pack`) ·
  niveau de bilan (`families.pack`, matrice `plans`/`packs.ts`) · abonnement
  Maison (`billing_subscriptions`). Détail et références : `docs/acces-parents.md`.
- **Maison = abonnement seul** (067b) ; Bilan / Mes séances = activation coach ;
  forçage admin par section (Auto / Ouvert / Fermé).
- **Fonctionnalités non livrées** (exports CSV/PDF, gabarits premium, historique
  borné, stockage borné, synthèse IA) : conservées en base (`plans.features`/`limits`)
  mais **ni vendues ni affichées** ; voir `docs/backlog-v1.1.md`.
- **`aiSummary` = OFF partout** : aucune intégration LLM.

## 4. État des lieux vérifié (Phase 0, 2026-07-10)

Base prod : projet Supabase **THRIVE-CA** (`kkdcgzvdmipmrgkawnky`, `ca-central-1`,
conformité Loi 25). Vérifié dans le code ET en prod :

- `families.pack` ✅ (`text`, check 3 valeurs, défaut `ESSENTIEL`) — distribution
  réelle : 2 ESSENTIEL, 1 AVANCE, 1 PERFORMANCE (4 familles).
- Verrou `enforce_pack_change_authority` ✅ (migration 023) : trigger BEFORE UPDATE,
  autorise service_role (`auth.uid() IS NULL`) et ADMIN/SUPER_ADMIN uniquement.
- `apps/web/src/lib/packs.ts` ✅ : 3 libellés, 3 prix, `canSeePremium`,
  `AVANCE_UNLOCK_SESSIONS = [3, 7, 13]`, `upgradeHint`.
- Les 3 leviers codés non branchés ✅ :
  1. `parent_reports.detail_level` — figé à `2` dans `generate-parent-report`
     (ligne 62 : `Number(body?.detail_level ?? 2)`) ; les 24 rapports prod sont à 2.
  2. `report_templates.pack_level` — 0 ligne en prod, jamais lu.
  3. `video_sessions.is_free` — 9 séances gratuites sur 39, jamais lu par l'UI.
- Teasers ✅ mais **locaux au fichier** `my-sessions/page.tsx` (à extraire tels quels).
- `entitlements` ✅ orpheline : 0 ligne, `plan_id text` sans FK, absente des
  37 migrations du repo (héritée du clone initial), jamais lue par le web.
- Messagerie : tables `conversations` / `messages` prêtes (RLS participants),
  0 ligne, aucune UI parent ni coach.
- Réalité analytics : jauge alimentée (24 `skill_scores`, RPC `gauge_summary`),
  LSSS alimentée (43 `lsss_items`, RPC `lsss_progression`), roue des émotions
  quasi vide (1 `emotion_logs`), journal `progress_log` 43 lignes.

Divergences détaillées audit ↔ réel : voir [segmentation-forfaits-plan.md](./segmentation-forfaits-plan.md) §2.

## 5. Garde-fous permanents

- ❌ Aucune nouvelle couleur / police / primitive visuelle ; réutilisation stricte
  des tokens (`tailwind.config.ts`) et composants existants.
- ❌ Jamais d'écriture de `families.pack` hors du chemin autorisé.
- ❌ Jamais de gating uniquement en UI : la RLS est la dernière ligne de défense.
- ❌ Aucune génération LLM (`aiSummary` OFF).
- ❌ Pas de migration destructive ; tout est additif et réversible (down documenté).
- ❌ Conformité Loi 25 intouchée : `ca-central-1`, consentements, MFA, `audit_logs`,
  sécurité de compte — **non segmentables**.
- Le pricing ne concerne que le rôle `PARENT` ; hiérarchie RBAC inchangée.
