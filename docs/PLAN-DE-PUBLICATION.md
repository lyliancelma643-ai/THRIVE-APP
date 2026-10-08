# Plan de publication THRIVE v1.0

À exécuter **uniquement après « OK on publie »**, dans l'ordre, une étape vérifiée avant la suivante.
Références : `docs/release/ECART-MIGRATIONS-PROD.md`, `docs/release/INTEGRATION-v1.0.md`, `docs/RUNBOOK-LANCEMENT.md`, `docs/PLAN-REVENUECAT.md`, `docs/actions-proprietaire.md`, `docs/store/checklist-soumission.md`.

## 0. Préalables (Lylian)
- Autoriser le push de `release/v1.0` (et `backup/local-mac-2026-10-08`) → preview Vercel à tester sur téléphone.
- Supabase › Auth : Site URL + Redirect URLs `https://app.thrivesportpositive.com/auth/confirm`, gabarit du courriel de confirmation, **protection des mots de passe divulgués** activée.
- `apps/web/src/lib/legal.ts` : NEQ, adresse, responsable PRP (`[À COMPLÉTER]`).
- Décisions : un pack ouvre-t-il Maison seul ? (défaut : non, comme la prod) ; suppression de « Annuler la validation » côté coach ; Santé/Sentry = « Oui » dans les grilles stores.

## 1. Sauvegarde
- Noter l'ID du déploiement Vercel prod actuel (projet `thrive-app`) pour « Promote » en retour arrière.
- `SELECT` de contrôle : nombre de profils / familles / enfants / abonnements.

## 2. Web d'abord (le code gère l'ancien et le nouvel état de la base)
- PR `release/v1.0` → `main`, fusion → déploiement Vercel prod.
- Vérifier : `/login`, `/conditions` (200), `/confidentialite` → `/politique-confidentialite`, `/suppression-compte` → `#suppression`, `/api/health`, connexion parent, connexion coach.

## 3. Migrations Supabase THRIVE-CA (`apply_migration`), dans cet ordre
| # | Fichier | Effet | Retour arrière |
|---|---|---|---|
| 1 | `20261001_066_security_audit_final.sql` (partiellement en prod) | Gardes de colonnes, `handle_new_user` lit `app_metadata`, accès coach limité, `anon` révoqué | `supabase/rollbacks/20261001_066_security_audit_final_rollback.sql` |
| 2 | `20261002_067_require_email_confirmation.sql` | Plus de confirmation d'office (Loi 25) ; sans impact sur les 11 comptes (tous confirmés) | `docs/rollback-migrations-066-067.sql` |
| 3 | `20261006_068_parent_section_access.sql` (corrigée par A02) | Table `parent_access`, accès par section | `supabase/rollbacks/20261006_068_parent_section_access_rollback.sql` |
| 4 | `20261008_070_acces_unifie_sandbox.sql` | Co-parents reconnus par la RLS, achats sandbox ignorés, `qa_accounts` | `…_070_…_rollback.sql` (avant celui de 068) |
| 5 | `20261008_071_complete_session_with_report.sql` | Clôture de séance + bilan en une transaction | `…_071_…_rollback.sql` |
Avant 5 : `SELECT` de doublons sur `reports (content->>'session_id')` et `coach_reports (session_id)`.
Après chaque migration : `get_advisors` (sécurité) ; après 3–4 : `supabase/tests/access_matrix.sql` (s'annule seul) et `select public.access_state()` avec un compte de test ; retester inscription parent, mise à jour de profil, liste d'attente publique.

## 4. Edge functions
- Redéployer `admin-create-user` (invitation co-parent, `APP_URL`). Vérifier `verify_jwt` conforme à `supabase/config.toml`.
- Poser `NEXT_PUBLIC_SENTRY_DSN` (Vercel) / `SENTRY_DSN` (fonctions) si Sentry voulu. NB : `functions/_shared/sentry.ts` n'a pas encore de nettoyage des données personnelles.

## 5. RevenueCat (voir `docs/PLAN-REVENUECAT.md`)
- Prérequis Lylian : clés App Store Connect (IAP + abonnement) et compte de service Google Play déposés.
- Retirer les 2 produits Test Store de l'entitlement `thrive_moments` et des packages ; positions des packages 0/1 ; retirer l'app Stripe en double `app47af3332e6`.

## 6. Mobile (sur le Mac)
- `cd apps/mobile && eas login && eas init && eas credentials`
- `eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_API_KEY_IOS --value <clé>` (idem `_ANDROID`, `EXPO_PUBLIC_SENTRY_DSN`)
- Renseigner `ascAppId`, Team ID Apple (`eas.json`, `apple-app-site-association`) et l'empreinte SHA-256 Play (`assetlinks.json`).
- `eas build -p all --profile production` puis `eas submit -p ios --profile production --latest` (publication manuelle) et `eas submit -p android --profile production --latest` (piste interne/fermée).
- Comptes de revue : créer `parent-test` / `coach-test` (`supabase/seed/review_accounts.sql`, `email_confirmed_at` renseigné) — feu vert explicite requis.

## 7. Lancement et surveillance
- Quand Apple et Google ont validé : publication synchronisée.
- Surveillance 48 h selon `docs/RUNBOOK-LANCEMENT.md` (Sentry, logs Supabase, webhooks RevenueCat/Stripe).
- Retour arrière : Vercel « Promote » de l'ID noté en 1 ; rollbacks SQL en ordre inverse.

## Restes connus (non bloquants pour le web, à arbitrer)
- Coque WebView mobile non codée (app = écrans natifs ; spécification dans le rapport A03 / `docs/auth-mobile.md`) ; `expo-updates` absent.
- Apple 1.2 : signalement/blocage dans la messagerie absent (bloquant pour la revue iOS si la messagerie est dans l'app).
- Performance web (A04), relecture des textes (A08), vérification indépendante (A13) : non faites (économie de tokens).
- Non testé sur vrais comptes : MFA, invitation co-parent, session mobile après relance, matrice d'accès SQL sur Postgres réel.
- Textes légaux à faire relire par un juriste ; version anglaise absente.
