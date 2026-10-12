# GO 3 · O1 — Programmes payés par Stripe (serveur)

Groupe 600 $ + tx · Individuel 1 500 $ + tx · Complet 2 000 $ + tx, en 2 versements (inscription / séance 7) ou en une fois. Rien n'est appliqué ni lancé : migration 081 non appliquée, aucune edge function déployée, aucun appel Stripe.

**Écart avec le prompt GO 3 (le dépôt fait foi)** : depuis 080, le droit programme vit dans `public.pack_enrollments` (source `stripe`), plus dans `parent_access.program_pack` (obsolète). Le paiement du versement 1 insère un pack daté par une fonction SECURITY DEFINER exécutée en service_role (garde `enforce_pack_change_authority` : contexte sans JWT autorisé) ; `access_state()` l'affiche sans changement.

## Fichiers
- `supabase/migrations/20261012_081_program_payments.sql` (+ `supabase/rollbacks/…_081_…_rollback.sql`, refuse de détruire des versements payés sans `set thrive.force_rollback_081 = 'on'`)
- `supabase/functions/_shared/program_billing.ts` (montants, taxes, Zod, routage) + `program_billing.test.ts`
- `supabase/functions/create-program-checkout`, `program-installment-charge`, `admin-refund-program-payment`, ajout dans `stripe-webhook/index.ts`
- `supabase/tests/program_payments.sql` · `scripts/ops/stripe-setup-programmes.mjs`

## Ordre d'application
1. Relire 081, l'appliquer en préproduction puis en production (après 080). Advisors Supabase : 0 erreur attendue.
2. `node scripts/ops/stripe-setup-programmes.mjs --mode test` (dry-run), puis `--mode test --apply` avec `STRIPE_SECRET_KEY_TEST` dans l'environnement du terminal (jamais dans un fichier suivi). Plus tard `--mode live --apply`.
3. Secrets Supabase (Edge Functions › Secrets) :
   - `STRIPE_TAX_ENABLED=false` (passer à `true` seulement après l'inscription TPS/TVQ dans Stripe Tax)
   - `PROGRAM_AUTOCHARGE_ENABLED=false` (R4 : rien n'est prélevé automatiquement)
   - `PROGRAM_CRON_SECRET` (≥ 16 caractères, seulement si une tâche planifiée appelle `program-installment-charge`)
   - `APP_ORIGINS` (déjà en place) : retours vers `/parent/programme/{pack}` (page web livrée par O2)
4. Déployer `create-program-checkout`, `program-installment-charge`, `admin-refund-program-payment` (verify_jwt = true, défaut) et redéployer `stripe-webhook` (verify_jwt = false, inchangé).
5. Webhook Stripe `we_1UKklbGSblkODz4Jro24Yaam` (→ `/functions/v1/stripe-webhook`) : **ajouter** les événements `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded` (`checkout.session.completed` y est déjà). Même secret de signature.
6. Clé restreinte (si utilisée) : écriture Checkout Sessions, PaymentIntents, Refunds, Customers ; lecture Prices.

## Comportement
- Le client envoie `{ pack, mode }` seulement ; tout autre champ (montant, prix, devise) ⇒ 422. Le montant vient du serveur et est revérifié en SQL (`amount_mismatch`).
- Prix : lookup_key du catalogue s'il égale le montant serveur ; sinon repli `price_data` (le paiement reste juste si le script n'a pas tourné ; une dérive est signalée à Sentry).
- Second pack refusé (pack en cours, le sien ou celui du titulaire ; commande active ; index unique).
- Webhook : un `event.id` n'est appliqué qu'une fois (`stripe_processed_events`) ; le flux Maison (mode subscription) n'est jamais routé vers les programmes.
- Séance 7 validée (UPDATE `sessions.status` → COMPLETED, chemin de 071) ⇒ versement 2 `due` + alerte admin (catégorie billing).
- `program-installment-charge` (admin ou cron) : drapeau faux ⇒ lien Checkout + alerte admin portant le lien ; drapeau vrai ⇒ PaymentIntent hors session ; SCA ⇒ lien, pas de nouvelle tentative.
- `charge.refunded` ⇒ `remboursee` (total) ou montant remboursé noté (partiel) ; le pack n'est jamais retiré (admin_end_pack).
- Remboursement : ADMIN/SUPER_ADMIN, montant saisi en cents ≤ payé − remboursé, motif obligatoire, `audit_logs` avant et après, Idempotency-Key.

## Tests
- `deno test supabase/functions/_shared/ supabase/functions/stripe-webhook/verify.test.ts` → 54 verts (dont 16 programmes). Note : la 1re exécution ajoute l'entrée `deno.land/x/zod@v3.23.8` à `deno.lock` (à committer).
- SQL : `program_payments.sql` sur base jetable après 080 + 081 (PGlite) → `PROGRAM_081_PASSED` ; `access_rights_080.sql` reste vert après 081 et après rollback 081. Le lanceur `supabase/tests/local/run-pglite.mjs` n'inclut pas encore 081 (hors périmètre O1) : y ajouter l'étape.

## Tests manuels (mode test Stripe, Test Clocks)
1. Parent test → Checkout Groupe 2 versements, carte `4242 4242 4242 4242` → versement 1 `payee`, pack GROUPE source `stripe`, Maison + Bilan + Mes séances ouverts.
2. Rejouer l'événement depuis le tableau de bord → réponse `program: duplicate`.
3. Coach valide la séance 7 → versement 2 `due` + alerte admin. Appeler `program-installment-charge` → lien dans l'alerte ; payer → commande `soldee`.
4. `PROGRAM_AUTOCHARGE_ENABLED=true` + carte `4000 0027 6000 3184` (SCA) → lien envoyé, aucune boucle. Carte `4000 0000 0000 0341` → `echouee`.
5. Test Clock : avancer l'horloge de 7 semaines entre versement 1 et versement 2 pour vérifier que la carte enregistrée est toujours prélevable.
6. Admin rembourse 100 ¢ puis le solde → `audit_logs` (REQUESTED/DONE), versement `remboursee`, pack toujours actif.
7. Second achat du même parent → 409 `pack_active`.

## [À COMPLÉTER]
- **R3 — règle de remboursement de la garantie** (part de 2/13 ? versement 1 entier ?) : aujourd'hui montant libre saisi par l'admin.
- Courriel au parent avec le lien du versement 2 : aucun service d'envoi transactionnel dans le dépôt ; le lien est dans l'alerte admin.
- Taxes du versement 2 hors session si `STRIPE_TAX_ENABLED=true` : montant TPS/TVQ calculé par le serveur ; brancher Stripe Tax Calculations.
- Appel planifié de `program-installment-charge` (pg_cron + pg_net, comme 079) : non créé.
- Visio Individuel hors Montréal : prix inconnu, non modélisé.

## Correctifs après revue G1 (2026-10-12)
- **Versement 2, anti double prélèvement** : la tentative est réservée de façon atomique (`charge_attempts` comparé à la valeur lue), le PaymentIntent est mémorisé dès sa création, et un versement `due` qui en porte déjà un attend le webhook (`pending_payment_intent`). Seule une relance explicite d'un admin sur un versement `echouee` repart. Clé d'idempotence Stripe stable par tentative.
- **Lien admin** : rôle lu dans `app_metadata` et courriel du compte d'authentification (plus `profiles.email`, modifiable par le parent).
- **Demandes d'appel (082)** : un coach ne voit et ne modifie que les demandes des familles qu'il suit ; les admins voient tout.
