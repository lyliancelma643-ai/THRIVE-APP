# Droits d'accès parents — diagnostic et correction (octobre 2026)

Branche : `fix/droits-acces-unifies` · Migration : `supabase/migrations/20261010_080_droits_acces_unifies.sql`
Rollback : `supabase/rollbacks/20261010_080_droits_acces_unifies_rollback.sql`
**Rien n'est appliqué en production.**

---

## 1. Diagnostic (avant 080)

Trois moteurs indépendants décidaient chacun d'une partie de l'accès :

| Moteur | Décidait | Problème |
|---|---|---|
| `parent_access.program_pack` (068/075), saisi à la main | Maison | sans date : un pack ne finissait jamais |
| Activation coach (`parent_access_unlocked` : coach validé + enfant confirmé) | Bilan, Mes séances, cartes Maison, séances vidéo | sans lien avec le pack acheté |
| `families.pack` (ESSENTIEL / AVANCE / PERFORMANCE) + `plans` | profondeur du Bilan en RLS, et côté web `usePlan()` | valeur par défaut ESSENTIEL pour tous ; synchro 075 qui créait des packs |

| # | Bug | Cause racine | Preuve |
|---|---|---|---|
| B1 | Pack acheté, mais Bilan / Mes séances fermés | branche bilan/séances de `parent_section_access` = activation coach seulement | `access_matrix.sql` cas `pf` : pack Complet → bilan `false` |
| B2 | Maison jamais refermée après un pack | aucune date sur le pack | schéma `parent_access` |
| B3 | Repasser une famille en « Essentiel » **créait** un pack Groupe (Maison ouverte) | trigger 075 ESSENTIEL→GROUPE | `trg_sync_program_pack_from_family_pack` ; test B3 |
| B4 | Fin de pack : niveau de bilan resté au niveau payé | `program_pack = null` ne touchait pas `families.pack` | — (désormais : historique consultable au niveau payé, voulu) |
| B5 | Abonné Maison : cartes « À la maison » refusées | RLS `home_card_moments` = activation coach | `pg_policies` prod |
| B6 | Compte sans droit : « ton coach finalise l'activation » | `sectionLockReason` → `'pending'` | `lib/access.ts` |
| B7 | Offre payante montrée à un détenteur de pack | page abonnement testait `unlocked`, checkout ne testait rien | `abonnement/page.tsx`, `create-checkout-session` |
| B8 | Accès mis à jour seulement au redémarrage | aucune relecture au premier plan / en temps réel | web `useAccessStore`, mobile `serverAccess` |
| B9 | Mobile : Bilans sans aucune garde, pas d'onglet Mes séances | — | `app/(parent)/bilans.tsx` |
| F1 | **Fuite** : un parent sans droit lisait le dossier Bilan via l'API | RLS des tables / RPC Bilan = « est parent de l'enfant » seulement | `bilan_leak_regression.sql` **avant 080** : questionnaires, athlete_identity, athlete_objectives, athlete_next_steps, focus_word_history, gauge_summary lisibles |
| S1 | Forçages sans raison obligatoire, sans expiration, sans historique, écrits par Admin | table `parent_access` | policies 068 |

État prod au 2026-10-09 (lecture seule) : 5 parents, 2 packs (Groupe, Individuel, tous deux activés coach), 0 forçage, 0 abonnement actif. La migration ne change l'accès effectif de personne aujourd'hui, à part la fermeture de la fuite F1.

---

## 2. Ce qui a été fait

### Base (migration 080)
- **`private.access_compute(user)`** : le calcul **unique**. L'ordre de priorité est :
  1. override actif ;
  2. pack actif ;
  3. abonnement Maison ;
  4. rien.

  Il renvoie `maison`, `bilan`, `seances`, `*_mode` (complet / lecture / verrouille), `source_*`, `pack_actif`, `pack_debut`, `pack_fin`, `fin_acces_maison`, `pack_et_abonnement`. Corrige B1, B2.
- `parent_section_access`, `parent_p3_access`, `can_view_child_bilan` et `access_state()` en découlent. L'écran et la RLS lisent donc la **même** fonction. Les anciennes clés de `access_state()` sont conservées.
- **`pack_enrollments`** : packs datés. Écriture par `admin_set_pack` / `admin_end_pack` (Admin ou Super Admin, raison obligatoire). Les packs existants y sont repris.
- **`access_overrides`** : section, état, raison obligatoire, expiration, auteur, révocation.
  - Écriture **Super Admin seulement**, par RPC. Un trigger de garde vérifie aussi le profil, donc un JWT « SUPER_ADMIN » forgé est refusé.
  - Un override ne se modifie pas : on le révoque, puis on en crée un nouveau.
  - Les webhooks n'y touchent pas.
- **`access_audit_log`** : toute écriture (overrides, packs, paramètres), qui, quoi, quand, pourquoi, avant/après. Écrite par triggers.
- **`access_parameters`** : les décisions ouvertes du § 6, modifiables par le Super Admin.
- **`access_versions`** : signal temps réel par compte, incrémenté à chaque pack / override / abonnement. Corrige B8.
- **RLS** :
  - garde Bilan sur `questionnaires`, `athlete_*`, `focus_word_history`, `emotion_logs`, `skill_scores`, `progress_log`, `perma_scores`, `coach_reports` ;
  - RPC Bilan protégées via `can_view_child_bilan` (corrige F1) ;
  - cartes Maison rattachées à Maison (corrige B5) ;
  - séances vidéo rattachées à Mes séances.
- Suppression des triggers de synchro 075 (corrige B3). `parent_access` n'est plus écrite (conservée pour le rollback).

### Web
- `lib/access.ts` : modes, sources, dates, `sectionView()`. Une clé absente = **fermé** (avant, repli sur `unlocked`).
- Rafraîchissement sans recharger : temps réel `access_versions`, retour au premier plan, filet de 5 min.
- Bilan / Mes séances verrouillés : **squelette factice** flouté (aucune donnée chargée) + cadenas + « Découvrir le programme » / « Rencontrer un coach ». Bandeau « lecture seule » quand le pack est terminé.
- Onglets toujours cliquables. Cartes Maison gardées sur `p3Access`.
- Paywall Maison : abonnement d'abord (essai si jamais consommé), puis les packs. Dans la WebView native : paywall natif seul.
- Page abonnement : « inclus dans ton pack » si Maison vient d'un pack ou d'un override (corrige B7).
- Admin, modale « Gérer les accès » :
  - état calculé + source ;
  - pack daté (attribuer / prolonger / terminer) ;
  - overrides (Super Admin), règles globales ;
  - journal ;
  - badge ⚠ « Pack + abonnement ».
- La colonne Pack de la liste est en lecture seule.

### Backend
- `create-checkout-session` : 409 `included_in_pack` si un pack est en cours (le sien ou celui du titulaire de la famille).

### Mobile
- `services/access.ts` (lecture pure).
- Store : état complet, relu au premier plan (AppState) et en temps réel.
- Bilans gardé (corrige B9). Nouvel onglet **Séances** (à venir + historique), même garde.
- Écrans verrouillés sans paiement, prix ni lien vers le site.

---

## 3. Tests

| Suite | Commande | Résultat |
|---|---|---|
| SQL (PGlite, sans Docker) | `npm i --no-save @electric-sql/pglite@0.2.17 && node supabase/tests/local/run-pglite.mjs` | ✅ fuite **présente avant** 080 / **corrigée après** ; matrice 080 ; régression sécurité ; idempotence (080 ×2) ; rollback → ancienne matrice ; réapplication |
| Web vitest | `cd apps/web && npx vitest run` | ✅ 462/462 (dont `access.test.ts`, `locked-cta.test.ts`) ; `tsc` ✅ ; lint ✅ |
| Mobile vitest | `cd apps/web && npx vitest run --root ../mobile src/services` | ✅ 20/20 (dont scénario 14 anti-steering) ; `tsc` ✅ |
| Deno | `deno test supabase/functions/_shared/billing_core.test.ts` | ✅ 14/14 |

Scénarios du cahier :

| # | Couvert par | Statut |
|---|---|---|
| 1–3 | packs Individuel / Groupe / Complet → 3 sections sans abonnement (+ co-parent) | ✅ SQL |
| 4 | fin de pack → Maison fermée, Bilan / Séances en lecture seule ; variantes « floute » et grâce | ✅ SQL |
| 5 | abonnement Stripe → Maison seule | ✅ SQL (ligne miroir). **Paiement réel carte 4242 non exécuté** (clés Stripe test absentes) |
| 6 | abonnement App Store → Maison, reconnu partout (même `user_id`) | ✅ SQL. **Test Store RevenueCat non exécuté** |
| 7 | abonnement expiré → Maison fermée | ✅ SQL. **Test Clocks Stripe non exécutés** |
| 8 | essai déjà consommé (`trial_used`) | ✅ SQL + logique checkout existante (`ever_subscribed` + historique Stripe) |
| 9 | Maison seul / aucun droit / expiré → **0 ligne** Bilan / Séances via l'API | ✅ SQL, rôle `authenticated` + claims JWT (pas sur la prod) |
| 10 | override « Maison ouverte, 7 jours » → ouvert puis fermé à l'échéance | ✅ SQL |
| 11 | override « Maison fermée » sur pack + webhook entrant → reste fermé | ✅ SQL |
| 12 | Admin / Coach / Parent / JWT forgé ne peuvent pas écrire d'override | ✅ SQL |
| 13 | pack + abonnement → accès, signalement, abonnement intact | ✅ SQL + badge admin |
| 14 | aucun lien de paiement web sur les écrans verrouillés mobiles | ✅ vitest mobile + web |

---

## 4. Décisions ouvertes (valeurs par défaut appliquées, modifiables par le Super Admin)

| Paramètre | Défaut appliqué | Alternatives |
|---|---|---|
| `fin_pack_mode` | **`lecture_seule`** : historique Bilan / Séances consultable | `floute` (verrouillé) |
| `delai_grace_jours` | **0** | 0 à 365 jours de Maison après la fin du pack |
| `pack_et_abonnement` | **`signalement`** : rien d'automatique, badge ⚠ dans l'admin | pause / remboursement / choix du parent : non implémentés |
| Pack sans activation coach | **le pack ouvre seul** Bilan + Mes séances ; l'activation n'est plus qu'un affichage (« ton espace se prépare ») | exiger pack ET activation |
| Séances vidéo du programme | rattachées à **Mes séances** (contenu des packs) | Maison |
| Coach validé sans pack | **n'ouvre plus** Bilan / Séances (0 compte concerné en prod) | — |

---

## 5. Ce qui reste fragile

1. **Les packs restent saisis à la main.** Aucun flux de paiement de pack n'existe dans le code : un paiement reçu doit être reporté dans « Gérer les accès ». Les 2 packs repris n'ont **pas de date de fin**, à poser.
2. **Essai sur mobile.** Apple et Google gèrent l'essai par identifiant de store, pas par compte THRIVE. Un parent qui a déjà eu l'essai sur le web peut en obtenir un second sur iOS / Android. Impossible à bloquer côté serveur.
3. **Tests SQL sur une réplique partielle** du schéma prod (PGlite), pas sur la prod. Une policy prod absente de la réplique pourrait interagir. À rejouer `bilan_leak_regression.sql` sur une branche Supabase après application.
4. **Override « Bilan fermé + Séances ouvert ».** `session_report` et `gauge_summary` restent lisibles, car Mes séances en a besoin (`can_view_child_bilan` = bilan OU séances).
5. **Non gardés :** `coach_assignments` (le nom du coach reste visible) et la messagerie.
6. **Liens de questionnaire déjà envoyés** (`/q/<token>`) : ils restent valides après la fin du pack.
7. **Échéances (fin d'essai, d'override, de pack) sans événement.** La base les applique immédiatement. L'écran se met à jour au retour au premier plan ou dans les 5 min.
8. **Lecture seule :** seules les nouvelles séances vidéo sont bloquées en écriture. Le reste du Bilan n'est de toute façon écrit que par le coach.
9. **Mobile :** si `access_state()` échoue au lancement, Bilans / Séances affichent un chargement jusqu'au prochain retour au premier plan.
10. **Partage de l'abonnement Maison à un co-parent :** seul le premier co-parent en profite (066d, inchangé).
11. **Le journal d'audit conserve des UUID** (sans nom) après l'effacement d'un compte.
12. **`deno check`** de `create-checkout-session` échoue sur un type `npm:openai` de l'edge-runtime. Déjà le cas avant ce travail.

---

## 6. Mise en production (à faire par Lylian, dans cet ordre)

1. SQL Editor THRIVE-CA : coller et exécuter `supabase/migrations/20261010_080_droits_acces_unifies.sql`.
2. **Tout de suite après**, déployer le web. Merger la branche dans `main` ; Vercel « thrive-app » se déploie seul. Sinon, l'ancien écran admin tente d'écrire `parent_access` et échoue.
3. Edge function :
   ```bash
   supabase functions deploy create-checkout-session --project-ref kkdcgzvdmipmrgkawnky
   ```
4. Mobile : nouveau build EAS (onglet Séances, gardes).
5. Optionnel (Vercel / EAS) : `NEXT_PUBLIC_PROGRAM_VIDEO_URL`, `NEXT_PUBLIC_COACH_CALL_URL`, `EXPO_PUBLIC_PROGRAM_VIDEO_URL`, `EXPO_PUBLIC_COACH_CALL_URL`. Sans page vidéo dédiée, l'app native n'affiche pas « Découvrir le programme ».
6. Vérification :
   ```sql
   select id, private.access_compute(id) from profiles where role = 'PARENT';
   ```
7. Poser les dates de fin des 2 packs existants.

En cas de problème : exécuter le fichier de rollback. Il recopie les packs en cours et les overrides actifs dans `parent_access` avant de retirer les nouvelles tables.
