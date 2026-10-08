# Runbook de lancement — mise en ligne, surveillance 48 h, rollback

> Court par design : les gestes détaillés sont dans les runbooks existants, référencés ci-dessous.
> Projet prod : Supabase **THRIVE-CA** (`kkdcgzvdmipmrgkawnky`) · Vercel `thrive-app` · domaine `app.thrivesportpositive.com`.
> Aucun secret dans ce fichier. Toute écriture prod (migration, fonction, variable, déploiement) exige le **OK explicite** de Lylian.

## Renvois

| Sujet | Document |
|---|---|
| Calendrier, publication progressive, J-0, J+1 à J+3 | [`docs/exploitation/CHECKLIST-JOUR-J-ET-J3.md`](exploitation/CHECKLIST-JOUR-J-ET-J3.md) |
| Gestes de rollback (Vercel, SQL, mobile, paiements) | [`docs/exploitation/RUNBOOK-INCIDENT-ROLLBACK.md`](exploitation/RUNBOOK-INCIDENT-ROLLBACK.md) §3 |
| Rollback 066 / 067 (définitions prod relevées avant application) | [`docs/rollback-migrations-066-067.sql`](rollback-migrations-066-067.sql) |
| Incidents, sévérités, Loi 25, modèles de communication | [`docs/security/incident-response.md`](security/incident-response.md) |
| État de l'intégration v1.0 (ce qui est appliqué ou non en prod) | [`docs/release/INTEGRATION-v1.0.md`](release/INTEGRATION-v1.0.md) |
| Actions manuelles de sécurité | [`docs/RUNBOOK-SECURITE-ACTIONS-MANUELLES.md`](RUNBOOK-SECURITE-ACTIONS-MANUELLES.md) |

## 1. Checklist de mise en ligne (dans l'ordre)

1. **CI verte sur `main`** : jobs `web`, `e2e`, `e2e-client`, `edge-tests` (Deno, tous les `*.test.ts` + `deno check`), `rls-security` (migrations rejouées sur Postgres jetable).
2. **Lecture prod (sans écriture)** : `list_migrations` pour savoir exactement ce qui est appliqué. Noter les migrations en attente (cf. INTEGRATION-v1.0 §écart code ↔ prod).
3. **Migrations en attente**, une à une, dans l'ordre numérique, chacune avec son bloc `-- Rollback` relu. Après chaque migration : `get_advisors` (sécurité) sans nouvel avertissement inattendu.
4. **Edge functions** : déployer celles modifiées ; vérifier `verify_jwt` conforme à `supabase/config.toml` (`stripe-webhook`, `revenuecat-webhook`, `send-web-push` = `false`).
5. **Variables** : `NEXT_PUBLIC_SENTRY_DSN` (optionnel : sans DSN, Sentry reste inerte), `NEXT_PUBLIC_SITE_URL`, variables Supabase/Stripe. Vérifier les **noms** seulement, jamais les valeurs.
6. **Noter l'ID du déploiement Vercel de production actuel** avant le déploiement : c'est la cible du rollback.
7. **Déploiement web** (auto sur `main`). Attendre le statut « Ready ».
8. **Smoke test** sur `app.thrivesportpositive.com` : `/api/health` = 200 ; `/login` ; connexion parent de test ; `/parent/bilans` ; `/parent/fitness`. Aucun achat réel, aucune saisie de séance.
9. **Mobile** : `eas update` (JS seulement) ou build natif via EAS, soumission aux stores selon le calendrier du checklist §1.
10. **Feu vert J-0** : rejouer la check-list `CHECKLIST-JOUR-J-ET-J3.md` §3.1 et §3.2.

## 2. Surveillance 48 h

| Quand | Quoi | Où |
|---|---|---|
| Continu | Uptime `/api/health` (cron 15 min) | Actions › `uptime` |
| Heure 0 à 2 | Erreurs runtime Vercel, issues Sentry nouvelles, logs Supabase `edge-function` / `auth` / `postgres` | Vercel › `thrive-app` › Logs ; Sentry ; Supabase › Logs |
| Toutes les 4 h jusqu'à J+2 | Mêmes contrôles + webhooks Stripe et RevenueCat (échecs de livraison) | Stripe › Webhooks ; RevenueCat › Integrations |
| J+1 et J+2 | Parcours parent et coach sur prod ; échecs de connexion ; alertes de paiement | Manuel |

**Seuils d'arrêt** (pause + rollback, §3) : crash-free < 99 % ; échec de paiement > 5 % ; incident touchant des données (à traiter comme S1 selon `incident-response.md`) ; rejet de connexion massif ; `/api/health` en échec plus de 30 min.

## 3. Rollback, par couche

Un rollback ne défait pas les données écrites entre-temps : vérifier l'effet avant de revenir en arrière.

| Couche | Geste | Référence |
|---|---|---|
| **Web (Vercel)** | Ouvrir le déploiement noté au §1 étape 6 › `⋯` › **Promote to Production** (ou Instant Rollback). Vérifier `/login` et `/parent`. Ensuite `git revert` de la PR fautive : le prochain merge sur `main` redéploie. | RUNBOOK-INCIDENT-ROLLBACK §3.1 |
| **SQL** | Exécuter la migration inverse (bloc `-- Rollback` de la migration). 066/067 : `docs/rollback-migrations-066-067.sql`. **Jamais** de restauration complète pour une seule migration. Tester sur staging d'abord. | RUNBOOK-INCIDENT-ROLLBACK §3.2 |
| **Edge functions** | Restaurer le fichier depuis le SHA précédent (`git checkout <sha> -- supabase/functions/<nom>`), puis redéployer. | — |
| **Mobile (JS)** | `eas update --channel production` vers le bundle précédent. | RUNBOOK-INCIDENT-ROLLBACK §3.3 |
| **Mobile (natif)** | Suspendre le déploiement échelonné (Play) ou Pause Phased Release (App Store) ; correctif en revue accélérée. | RUNBOOK-INCIDENT-ROLLBACK §3.3 |
| **Paiements** | Ne jamais écrire à la main dans `billing_subscriptions` : relancer `billing-sync`, « Resend » des webhooks Stripe, relance RevenueCat. | RUNBOOK-INCIDENT-ROLLBACK §3.4 |

**Kill-switch** (`app_settings`, version minimale mobile, maintenance) : pas encore livré dans cette branche. Ne pas l'utiliser comme procédure de secours tant qu'il n'est pas déployé.
