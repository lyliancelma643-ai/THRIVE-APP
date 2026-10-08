# Accès des parents — cartographie (référence A13)

Source de vérité unique pour l'UI : RPC `public.access_state()` (SECURITY DEFINER). Web : `apps/web/src/lib/access.ts` (`parseAccessState`). Mobile : `useEntitlement` (`p3_access` ou staff) via `subscription.store.loadServerAccess`.
Clés (anciennes conservées) : `role, unlocked, has_child, has_confirmed_child, coach_validated, fitness_enabled, p3_subscribed, p3_access, program_pack, bilan_access, seances_access` + (070) `sections{maison,bilan,seances}, bilan_level, is_staff, forced{maison,bilan,seances}`.

## Les trois couches
| Couche | Valeurs | Décidée par | Ouvre | Appliqué dans |
|---|---|---|---|---|
| Pack programme | Groupe · Individuel · Complet | `parent_access.program_pack` (068), attribué par Admin | Étiquette + base des forçages (n'ouvre pas Maison seul) | table + RLS admin (068), `admin_parent_access_list`, UI admin |
| Niveau de bilan | Essentiel · Avancé · Performance | `families.pack` (023, 038), matrice `plans` | Détail des bilans (séances 3/7/13 ou toutes), lettre, messagerie coach (Performance), quotas enfants/parents | RLS 039/041, `lib/packs.ts`, `usePlan`, `access_state().bilan_level` |
| Abonnement Maison | `thrive_moments` 32,50 $/mois · 299 $/an | RevenueCat → `billing_subscriptions` (sandbox exclu sauf staff/@thrivesportpositive.com/`qa_accounts`, 070) ; partagé avec LE co-parent (066d) | Section Maison (tables `p3_*`) | `has_p3_subscription`, `parent_p3_access`, policies `gate_parent_p3_*` |

## Sections (parent)
| Section | Automatique | Forçage admin (`parent_access.maison/bilan/seances`) | RLS | UI web | UI mobile |
|---|---|---|---|---|---|
| Maison | abonnement Maison actif (propre ou co-parent) | null=auto · true · false | `gate_parent_p3_*` via `parent_p3_access` → `parent_section_access('maison')` | `p3Access` (AccessGate, P3Frame) | `PremiumGate` + `useEntitlement.hasAccess` |
| Bilan | compte activé (coach validé + enfant confirmé ; co-parent hérite du titulaire) | idem | `gate_parent_reports`/`gate_parent_sessions` (restrictives, Bilan OU Séances) | `bilanAccess` | n/a (web) |
| Mes séances | idem Bilan | idem | idem | `seancesAccess` | n/a |
Staff (COACH/ADMIN/SUPER_ADMIN) : tout ouvert, `is_staff = true`. Erreur réseau : l'UI web affiche « Impossible de vérifier ton accès — Réessayer » (jamais « tout ouvert »).

## Migrations (ordre)
`068_parent_section_access` (corrigée, alignée prod 067b/066 co-parents) → `070_acces_unifie_sandbox`. Rollbacks : `supabase/rollbacks/20261006_068_*`, `20261008_070_*`. Tests : `supabase/tests/access_matrix.sql`.
