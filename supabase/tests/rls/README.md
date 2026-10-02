# Tests des règles d'accès (RLS) — migrations 066, 067, 068

| Migration | Objet | Test |
|---|---|---|
| `20261002_066_coparent_access.sql` | Co-parents : accès aux enfants, bilans, séances, Maison ; quota « 2 parents » avec abonnement Maison | `066_coparent_access.test.sql` |
| `20261002_067_deletion_requests_workflow.sql` | Demandes de suppression : échéance 30 jours, responsable, trace durable, purge 12 mois | `067_deletion_requests_workflow.test.sql` |
| `20261002_068_certificate_reward_grants.sql` | « 1 mois offert » du certificat : crédits, déclencheur, droits | `068_certificate_reward_grants.test.sql` |

Chaque test tourne dans **une transaction annulée** (`begin … rollback`) : il ne laisse aucune donnée.
Un contrôle en défaut lève `ÉCHEC n.n : …` et arrête le script.

## 1. Miroir local (Postgres 16, sans Supabase) — à chaque modification

`mirror_schema.sql` reproduit l'état de production **avant** ces migrations (colonnes, types,
fonctions `private.*`, politiques), relevé en lecture seule le 2026-10-02.

```bash
# Postgres 16 local (ou service CI) — variables PG* standard
PGHOST=/tmp/thrive-pg PGPORT=55432 supabase/tests/rls/run-local.sh            # doit afficher 3 × « OK »
PGHOST=/tmp/thrive-pg PGPORT=55432 supabase/tests/rls/run-local.sh --before   # sans migrations : chaque test DOIT échouer
```

Le mode `--before` prouve que chaque test détecte bien le défaut corrigé. La CI rejoue le mode
normal à chaque pull request (job « RLS (miroir Postgres) »).

## 2. Environnement miroir Supabase (branche) — avant la production

Le miroir local ne contient pas les triggers métier (quotas d'enfants, notifications,
coach automatique). Avant d'appliquer en production :

1. **Créer une branche Supabase** du projet THRIVE-CA (tableau de bord › Branches ›
   *Create branch*, ou `supabase branches create recette-066`). Elle reçoit le schéma de
   production, sans les données.
2. **Appliquer les migrations dans l'ordre** sur la branche : 066, puis 067, puis 068
   (éditeur SQL de la branche, ou `supabase db push` lié à la branche).
3. **Lancer les tests** : coller successivement `066_…test.sql`, `067_…test.sql`,
   `068_…test.sql` dans l'éditeur SQL **de la branche**. Chacun doit se terminer par
   `OK : … tous les contrôles passent`.
   - Pour la section 1 du test 068 (appel déclenché), le Vault de la branche doit contenir
     `edge_functions_url` et `push_trigger_secret` ; sinon cette section échoue (le trigger
     ne fait rien sans secrets — comportement voulu en prod).
4. **Contrôler les avis de sécurité** de la branche (Advisors › Security) : aucune nouvelle
   alerte attendue (fonctions `SECURITY DEFINER` avec `search_path` fixé).
5. **Déployer les fonctions Edge** sur la branche : `claim-certificate-reward`
   (*verify_jwt = false* : l'autorisation est faite dans la fonction),
   `admin-delete-user`, `request-account-deletion`, `create-checkout-session`, `stripe-webhook`
   — avec la clé Stripe de **test**.
6. **Recette applicative** : pointer une prévisualisation Vercel sur la branche et dérouler la
   checklist `docs/checklist-recette-client.md`.
7. **Production** : appliquer 066 → 067 → 068, déployer les fonctions, **puis** le front
   (le front tolère l'absence de 067, mais pas l'inverse pour le co-parent).

Retour arrière : chaque migration est idempotente ; pour annuler 066, ré-appliquer les
définitions de fonctions et politiques présentes dans `mirror_schema.sql` (état d'avant).
