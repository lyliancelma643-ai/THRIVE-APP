# Recette manuelle — partie client (à faire sur appareils réels)

Tout le reste est automatisé : `pnpm --filter web test` (Vitest), `pnpm --filter web test:e2e:client`
(Playwright, backend simulé), `supabase/tests/rls/run-local.sh` (RLS), tests Deno en CI.
Environnement : branche Supabase + prévisualisation Vercel, **Stripe en mode test**.
Appareils : 1 iPhone (Safari + PWA installée), 1 Android (Chrome + PWA installée).

## Bloquants (avant publication)
- [ ] Inscription avec 1 enfant, case de consentement cochée → l'enfant apparaît dans l'en-tête
- [ ] Ligne `consents` créée (3 finalités, version 2026-10-02) pour ce compte
- [ ] Achat test Stripe (carte 4242…) → « Abonnement actif » ; annulation au portail → « sans renouvellement »
- [ ] Co-parent : titulaire abonné Maison invite un parent → e-mail reçu → le co-parent voit enfant, Bilan, Maison
- [ ] Suppression : demande depuis Compte → alerte super-admin → `/admin/suppressions` → suppression → abonnement Stripe test annulé
- [ ] Certificat Maison (3 fiches de la semaine 13) sur un compte abonné web → coupon visible sur l'abonnement Stripe test, message « appliqué » sous le badge
- [ ] Pages `/legal/conditions` et `/legal/confidentialite` : aucun « [à compléter] » après configuration

## Appareil (ne se teste pas en émulation)
- [ ] iPhone : ouvrir le certificat / le contrat depuis le Bilan (nouvel onglet, pas de blocage)
- [ ] VoiceOver (iPhone) et TalkBack (Android) : répondre à 3 questions du questionnaire enfant, le focus reste sur le choix
- [ ] Questionnaire : répondre à 5 questions, verrouiller l'écran 1 min, rouvrir → réponses conservées
- [ ] Notifications : activer dans Compte, recevoir une notification de test (PWA installée)
- [ ] PWA ouverte pendant un déploiement → naviguer : rechargement automatique, pas d'écran d'erreur
- [ ] Mode avion sur le Bilan → « Réessayer » en moins de 10 s ; réseau revenu → bilan affiché

## E-mails (boîtes Gmail et Outlook)
- [ ] Réinitialisation du mot de passe : reçu, lien fonctionnel, rendu correct
- [ ] En-têtes du message : SPF, DKIM et DMARC à « pass »
