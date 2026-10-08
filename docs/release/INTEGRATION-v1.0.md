# Intégration de la base release/v1.0 — 8 octobre 2026

## Base
`main` @ `fae1825` (inchangée sur GitHub depuis le 6 octobre) + les branches GitHub non fusionnées des 1er–6 octobre :

| Branche | Décision | Notes |
|---|---|---|
| `claude/inspiring-dijkstra-dcrlbx` | Fusionnée | Migration 068 `parent_section_access` (packs Groupe / Individuel / Complet). **Non appliquée en prod.** |
| `claude/serene-curie-fet9j0` | Fusionnée | Ses migrations 066 (co-parents) et 067 (sport sans défaut) sont **déjà appliquées en prod** (066a/b/c, 067_identity_sport_no_default). Conflits : `Icon.tsx` (union) ; `login/page.tsx` = refonte de `main` conservée. |
| `claude/lucid-volta-rfz25w` | Fusionnée | Paywall conforme stores, filets serveur facturation. |
| `claude/quirky-brahmagupta-ywc28h` | Fusionnée | Pages support/confidentialité, `/api/health`, Sentry sans données personnelles, `supabase/config.toml`, politique de mot de passe partagée, runbooks. Conflits : `compte/page.tsx` (union), `theme.ts` mobile (version stricte), `login/page.tsx` (main conservée). |
| `claude/hopeful-goldberg-xfnhpi` | Fusionnée | Racine unique des routes mobiles, textes légaux (`docs/conformite-stores/`), comptes de revue (`supabase/seed/review_accounts.sql`). Conflits mobiles résolus par union ; lockfile régénéré. |
| `claude/zealous-einstein-4dwew8` | **Partielle** | Doublon d'une autre session de `serene-curie`, avec des migrations 066/067/068 concurrentes **jamais appliquées** et incompatibles avec la prod. Repris : `2adb3a0` (PWA qui se met à jour), `be53094` (E2E client). Non repris : voir « À reporter ». |

Les migrations `loi25_delai_et_partage_p3_066` et `maison_abonnement_obligatoire_067`, appliquées en prod mais présentes dans **aucune** branche, ont été recopiées depuis `supabase_migrations.schema_migrations` : `20261002_066d_loi25_delai_et_partage_p3.sql`, `20261006_067b_maison_abonnement_obligatoire.sql` (à ne pas réappliquer).

## Écart code ↔ prod à traiter (A11 / A01 / plan de publication)
Constaté en lecture seule sur THRIVE-CA le 8/10 :
- `20261001_066_security_audit_final.sql` (sur `main`) : **non appliquée en prod** — 1 seule des 4 fonctions `private.guard_*` / `is_program_coach_of_child` existe.
- `20261002_067_require_email_confirmation.sql` (sur `main`) : **non appliquée en prod** — `handle_new_user` confirme encore d'office l'e-mail. Le code web de `main` attend pourtant la confirmation par lien (Loi 25).
- `068_parent_section_access` redéfinit `access_state()` / `parent_p3_access` : à vérifier contre la version réellement en prod (`067b`, accès Maison = abonnement seul) pour ne pas régresser.

## À reporter par les agents (correctifs des branches non fusionnables telles quelles)
- **A01** (`login/page.tsx`, refonte de main) : case de consentement explicite + insertion `consents` (`CONSENT_PURPOSE`, `PRIVACY_VERSION` de `lib/signup.ts`) et reprise des enfants non enregistrés (`SIGNUP_MISSED_KEY`) — cf. `serene-curie` `ecd3ef1` ; politique de mot de passe partagée (`@thrive/shared` `validation/password`) et liens confidentialité/support — cf. `quirky-brahmagupta` `c75a8c5` ; liens légaux à l'inscription — cf. `zealous` `f3dc922`.
- **A06** (`q/[token]`) : lien tronqué = « lien invalide », pas « connexion coupée » (statut 0 / 5xx seulement) — cf. `zealous` `438f02e`.
- **A09** (`.github/workflows/ci.yml`) : tests RLS sur miroir Postgres + tests Deno à chaque PR — cf. `zealous` `bb4048a`.
- **A10** : pages légales autonomes `/cgu` `/confidentialite`, section `#suppression`, `lib/legal-entity.ts` — cf. `zealous` `0af603c`, `a45f507` (à comparer avec les textes de `hopeful-goldberg`).
- **A03** : harmoniser `services/legal.ts` (replis vers les pages web) et `components/subscription/theme.ts` (`legalLinks`, paywall bloqué sans URL de confidentialité).
- **Backlog v1.1** : workflow de suppression enrichi (`zealous` 067), « 1 mois offert » du certificat (`zealous` `77bb0df`, migration 068_certificate_reward_grants à renuméroter).
