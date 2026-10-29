# Pré-validation mobile — 7 corrections + TestFlight

Stack : Expo 55 / expo-router (apps/mobile), Supabase, RevenueCat (StoreKit), EAS Build/Submit.
Base : `feat/motion-system` (build 14) avancée rapide dans `claude/mobile-prevalidation-fixes-18e89f`.
Tests mobiles : `cd apps/web && npx vitest run --root ../mobile src` ; typecheck : `pnpm --filter mobile typecheck`.
Un seul worktree, propriété de fichiers stricte ; commits faits par l'orchestrateur, un par tâche.

| Tâche | Fichiers (propriété) | Modèle | Ordre |
|---|---|---|---|
| T3 Confirmation e-mail retirée | `(auth)/register.tsx`, `stores/auth.store.ts`, `supabase/config.toml` | haiku | A |
| T7 Message support pré-rempli | `components/hub/UpgradeSheet.tsx`, `components/hub/HubLocked.tsx`, `components/access/*`, `services/support*.ts` | haiku | A |
| T4 Bouton retour = historique | `(parent)/_layout.tsx` (backBehavior), `(coach)/_layout.tsx`, écrans `(parent)/*.tsx` qui forcent Maison, `components/hub/maison/nav.ts` | sonnet | B |
| T5 Page blanche au swipe Bilan/Maison/Séances | `design/FloatingTabBar.tsx`, `components/motion/TabGate.tsx`, `components/hub/**` (sauf UpgradeSheet/HubLocked/maison/nav.ts), `hooks/useP3Data.ts`, `stores/pageReady.store.ts`, `components/ErrorBoundary.tsx`, `(parent)/{maison,bilans,seances}.tsx` | opus | B |
| T1 Inscription A→Z + enfant obligatoire | `app/_layout.tsx`, `(auth)/*`, `components/account/ChildrenSetupView.tsx`, `screens/parent/ChildrenScreen.tsx`, `stores/child.store.ts` | sonnet | après T3 |
| T6 Activités sans répétition | `components/activite/**`, `(parent)/activite/*`, `(parent)/moment/*` | sonnet | après T4 |
| T2 Paiement Apple + 1er mois offert | `services/purchases.ts`, `stores/subscription.store.ts`, `components/offres/**`, `components/subscription/**`, `(parent)/abonnement.tsx`, `(parent)/offres*`, `supabase/functions/revenuecat-webhook/**`, `ios/*.storekit`, `docs/release/TEST_SANDBOX_IAP.md` | sonnet | après T1 |

Final (orchestrateur) : typecheck + lint + vitest, checklist OUI/NON, scan secrets, buildNumber via EAS (autoIncrement distant), `eas build -p ios --profile production --auto-submit`.
