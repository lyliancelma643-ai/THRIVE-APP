# Audit 360° pré-soumission stores — THRIVE

Oct 8, 2026 · @Lylian

**Verdict : NO-GO aujourd'hui, mais proche.** Le code est sérieux (RLS étanche testée en direct, paywall conforme, webhook RevenueCat robuste). Ce qui bloque est surtout de la configuration hors code : RevenueCat n'est relié ni à App Store Connect ni à Google Play, les comptes de revue n'existent pas en production, et un achat sandbox fait par un reviewer ne débloquerait pas Maison. 11 P0, 14 P1, 8 P2. Périmètre audité : dépôt `thrive APP` (branche main, commit bb547d3), Supabase THRIVE-CA, RevenueCat, Vercel, pages légales en ligne.

## Matrice d'exécution

Ordre conseillé : P0-1 à P0-6 (configuration, 1 à 2 jours), puis P0-7 et P0-8 (code et textes), puis la preuve de bout en bout P0-9 avant tout envoi. « Toi » = action dans une console ; « Code » = Claude Code peut le faire.

### P0 — Bloquants stricts pour la publication

| ID | Pilier | Problème constaté | Correctif | Qui |
| --- | --- | --- | --- | --- |
| P0-1 | Paiement | App iOS RevenueCat : clé API App Store Connect **non configurée**, clé In-App Purchase (.p8) **non configurée**, vendor number vide | Créer les deux clés dans App Store Connect › Utilisateurs et accès › Intégrations, les charger dans RevenueCat › THRIVE iOS | Toi |
| P0-2 | Paiement | App Android RevenueCat : identifiants du compte de service Google Play **non configurés** | Créer le compte de service (Google Cloud), l'inviter dans la Play Console (droits finances + commandes), charger le JSON dans RevenueCat ; activer les notifications temps réel (Pub/Sub) | Toi |
| P0-3 | Paiement | Produits présents dans RevenueCat seulement ; existence côté stores non vérifiable | Créer `thrive_moments_mensuel` / `thrive_moments_annuel` (iOS, un seul groupe d'abonnement) et l'abonnement `thrive_moments` avec les forfaits de base `mensuel` / `annuel` (Play). Essai gratuit d'un mois sur les deux stores, comme promis à l'art. 4 des conditions. Joindre les achats intégrés à la **première** version soumise | Toi |
| P0-4 | Stores | Un achat sandbox fait depuis un compte créé par le reviewer est **ignoré** (migration 070) alors que les notes de revue lui demandent justement de créer un compte → l'achat réussit, Maison reste verrouillée → rejet 2.1 | Compte dédié `parent-abonnement@thrivesportpositive.com` (sans pack, donc paywall visible ; reconnu QA par son domaine) + notes réécrites (section Notes de revue). Filet de sécurité : migration 076 proposée | Toi + Code |
| P0-5 | Stores | Comptes de revue **absents en production** (0 compte `*-test@thrivesportpositive.com`) | Exécuter `supabase/seed/review_accounts.sql` avec un vrai mot de passe, puis créer le compte abonnement (Auth › Add user, confirmé) | Toi |
| P0-6 | Stores | Build EAS impossible ou vide : `extra.eas.projectId` absent (jetons push en échec), `ascAppId` / `appleTeamId` = `A_COMPLETER`, aucune variable `EXPO_PUBLIC_*` dans `eas.json` | `eas init` ; compléter `eas.json` ; poser dans l'environnement EAS « production » : URL et clé publique Supabase, clés publiques RevenueCat iOS et Android, URL légales, DSN Sentry. Sans clé RevenueCat, le paywall affiche « indisponible » | Toi + Code |
| P0-7 | Stores | Messagerie parent ↔ coach sans « Signaler » ni « Bloquer » (Apple 1.2) ; vos propres notes de revue la classent bloquante | Appui long sur un message → Signaler (table `message_reports`, alerte admin) ; Bloquer / quitter la conversation ; mention dans les CGU | Code |
| P0-8 | Légal | Pages en ligne `/confidentialite`, `/conditions`, `/suppression-compte` affichent « \[À COMPLÉTER : NEQ\] », « \[À COMPLÉTER : adresse du siège\] », « \[À COMPLÉTER : nom du responsable…\] » | Remplir les trois champs (responsable par défaut : la personne ayant la plus haute autorité, donc toi), redéployer | Toi + Code |
| P0-9 | Paiement | Le tunnel n'a jamais tourné de bout en bout : 1 seule ligne `billing_subscriptions`, inactive, dernière synchro le 29 sept. | 1 achat sandbox iOS (TestFlight) + 1 achat test Android (piste interne) → webhook → `access_state().p3_access = true` ; puis annulation → expiration → reverrouillage | Toi |
| P0-10 | Stores | Google Play : type et date du compte inconnus ; formulaires non remplis | Compte personnel créé après le 13/11/2023 → test fermé 12 testeurs pendant 14 jours avant la production. Vérification d'identité, Data safety, classification IARC, déclaration santé, public cible 18 ans et plus | Toi |
| P0-11 | Paiement | Contrat « Paid Applications » Apple : non vérifiable | Signer le contrat, saisir banque et fiscalité dans App Store Connect › Accords. Sans contrat actif, les achats intégrés ne se chargent pas, même pour le reviewer | Toi |

### P1 — Risques financiers, de marge ou de sécurité

| ID | Pilier | Problème | Correctif | Qui |
| --- | --- | --- | --- | --- |
| P1-1 | Marge | Programme Small Business d'Apple non confirmé | S'inscrire **avant** la première vente : 15 % au lieu de 30 % la première année d'abonnement | Toi |
| P1-2 | Marge | Google : les abonnements sont déjà à 15 % ; le palier 15 % ne couvre les achats ponctuels qu'après inscription | Inscrire le compte au palier 15 % (groupe de comptes) dans la Play Console | Toi |
| P1-3 | Fiscalité | TPS/TVQ et formulaire fiscal non arrêtés | Apple et Google perçoivent et reversent TPS/TVQ sur leurs ventes au Canada ; les ventes Stripe web restent à ta charge (Stripe Tax). W-8BEN (personne) ou W-8BEN-E (entreprise) selon l'entité titulaire du compte, à valider avec le comptable | Toi |
| P1-4 | Anti-churn | Période de grâce non vérifiable côté stores ; aucune relance dans l'app | Activer Billing Grace Period (App Store Connect, 16 jours) et période de grâce + suspension de compte (Play). Bannière « Mettez à jour votre moyen de paiement » quand `billing_issue_at` est renseigné | Toi + Code |
| P1-5 | Autonomie | Demandes de suppression traitées à la main : aucune tâche planifiée (pas de pg\_cron) | Tâche planifiée quotidienne qui exécute `admin-delete-user` à l'échéance + alerte (requête S1) | Code |
| P1-6 | Sécurité | Protection contre les mots de passe compromis désactivée (alerte Supabase) | Auth › Password security › activer | Toi |
| P1-7 | Stabilité | Aucun ErrorBoundary dans l'app mobile ; 12 écrans sur 18 sans état d'erreur ni hors-ligne | `ErrorBoundary` exporté par les layouts Expo Router + écran « Pas de connexion » + bouton Réessayer | Code |
| P1-8 | Sécurité | Pas de limitation de débit sur `billing-sync`, `request-account-deletion`, `export-my-data` ; insertion publique sur `waitlist` | Limite par utilisateur (table de compteurs ou Upstash) ; captcha ou jeton sur la liste d'attente | Code |
| P1-9 | Stores | Libellé incohérent : politique et notes disent « Supprimer mon compte et mes données », l'app affiche « Supprimer mon compte » | Aligner sur un seul libellé, chemin exact dans les notes | Code |
| P1-10 | Stores | `apple-app-site-association` en ligne contient `TEAM_ID_A_COMPLETER` ; `assetlinks.json` contient une empreinte factice | Remplacer par le Team ID et l'empreinte SHA-256 de Play App Signing | Toi + Code |
| P1-11 | Loi 25 | Les notifications push transportent un extrait de message via Expo, APNs et FCM (hors Québec) | Texte générique « Nouveau message de votre coach » | Code |
| P1-12 | Stores | Confirmation de courriel imposée à l'inscription (migration 067) : réglage Auth et retour dans l'app non vérifiés | Vérifier « Confirm email » dans Supabase et que le lien ramène dans l'app ; atténué par le compte dédié (P0-4) | Toi |
| P1-13 | CI | Résultat des workflows GitHub non vérifiable d'ici ; aucun test bout-en-bout mobile (Playwright couvre le web) | Exiger CI verte sur `main` ; ajouter un flux Maestro : connexion → Maison → paywall → restaurer | Code |
| P1-14 | Sécurité | Webhook RevenueCat authentifié par un simple secret d'en-tête ; signature HMAC non activée | Activer la signature HMAC sur l'intégration, vérifier X-RevenueCat-Webhook-Signature (horodatage + corps brut) et rejeter au-delà de 5 minutes ; garder l'en-tête en plus | Toi + Code |

### P2 — Conversion et confort

| ID | Sujet | Action |
| --- | --- | --- |
| P2-1 | Paywall | Essai gratuit dans le titre, preuve sociale, expérience A/B RevenueCat sur le prix annuel |
| P2-2 | Bilans | Ouvrir les questionnaires dans le navigateur intégré (`expo-web-browser`) plutôt que Safari |
| P2-3 | Code mort | Supprimer `apps/mobile/app/` (racine ignorée, contient un « À venir ») et les navigateurs TODO |
| P2-4 | RevenueCat | Supprimer l'app Stripe en double (vide), archiver l'offering `default`, positions 1 et 2 aux packages |
| P2-5 | Supabase | Déplacer `pg_net` hors du schéma public |
| P2-6 | Edge | Comparer la clé service\_role à temps constant dans `send-push-notification` |
| P2-7 | Fiches | Nom « THRIVE Sport Positive », captures de l'app réelle, mots-clés FR et EN |
| P2-8 | Mesure | Brancher les événements RevenueCat (essai, conversion, résiliation) sur un tableau de bord |

## Pilier 1 — Double homologation

Le binaire est conforme sur le fond ; les risques de rejet viennent de l'accès du reviewer et de la messagerie.

| Exigence | État | Preuve |
| --- | --- | --- |
| Apple 2.1 — app complète | À risque | Sans clés RevenueCat dans EAS, le paywall affiche « L'abonnement n'est pas disponible » (`Paywall.tsx`). Sans `projectId`, l'enregistrement push échoue silencieusement |
| Apple 3.1.1 — numérique = achat intégré | Conforme | Paywall StoreKit / Play Billing uniquement ; aucun prix des packs (600 $, 1 500 $, 2 000 $) ni lien Stripe dans `apps/mobile` ; le lien de gestion n'ouvre que apps.apple.com ou play.google.com |
| Apple 3.1.3(b) et 3.1.3(e) — accès acquis ailleurs, services réels | Conforme | Maison ouverte aux familles inscrites à un pack (services humains vendus hors app) et aux abonnés web, tout en restant achetable dans l'app |
| Apple 3.1.2 — mentions d'abonnement | Conforme | Prix, période, essai, renouvellement, annulation 24 h avant, Restaurer, CGU et confidentialité sur le paywall |
| Apple 5.1.1(v) — suppression dans l'app | Conforme | Profil › Confidentialité et compte › Supprimer mon compte → `request-account-deletion`, délai 30 jours, rappel d'annuler l'abonnement store |
| Apple 1.2 — contenu entre utilisateurs | **Non conforme** | Aucun signalement ni blocage dans `chat/[conversationId].tsx` (P0-7) |
| Apple — compte démo | **Absent** | Comptes de revue non créés en production ; parcours d'achat contradictoire (P0-4, P0-5) |
| Absence de « Bêta », « Bientôt », placeholders | Conforme dans le binaire | Seul « À venir » trouvé est dans `apps/mobile/app/`, dossier ignoré par Expo Router car `src/app` existe (vérifié dans le code d'Expo CLI 55) |
| Privacy manifest, chiffrement | Conforme | `privacyManifests` (4 raisons d'API), `ITSAppUsesNonExemptEncryption: false` |
| Google — permissions | Conforme | `INTERNET`, `POST_NOTIFICATIONS`, `VIBRATE`, `BILLING` ; localisation, caméra, micro, stockage bloqués |
| Google — suppression : lien web | Conforme sur le fond | `/suppression-compte` répond et décrit la procédure (app + courriel) ; libellé à aligner (P1-9) |
| Google — test fermé, identité | Non vérifiable | Dépend du type de compte (P0-10) |

Identifiant `app.thrive.mobile` : il n'appartient à aucun domaine que tu possèdes. C'est permis, mais l'unicité n'est garantie qu'à la création de l'app dans chaque console. Réserve-le tout de suite des deux côtés.

## Pilier 2 — Paiement, marges, fiscalité

L'architecture est bonne ; la plomberie entre RevenueCat et les stores n'est pas branchée.

**Catalogue RevenueCat (lu en direct).** Entitlement `thrive_moments` actif, relié à 8 produits : iOS `thrive_moments_mensuel` / `_annuel`, Android `thrive_moments:mensuel` / `:annuel`, Stripe web (2 prix), Test Store (2). Offering courant `principal` avec `$rc_monthly` et `$rc_annual`, identique à ce que lit le paywall. Webhook unique vers `revenuecat-webhook`, tous environnements.

**Ce qui manque côté RevenueCat.** iOS : `app_store_connect_api_key_configured: false`, `subscription_key_configured: false`. Android : `play_service_account_credentials_configured: false`. Sans ces clés, RevenueCat ne peut ni valider un reçu ni importer les prix. Le paywall resterait vide chez le reviewer (P0-1, P0-2).

**Webhook Supabase.** Conforme sur le fond. L'authentification passe aujourd'hui par un en-tête `Authorization` secret, comparé à temps constant. Chaque événement déclenche une relecture de l'abonné chez RevenueCat, puis un `upsert` sur `user_id`. Le traitement est donc idempotent par construction et couvre achat, renouvellement, annulation, problème de paiement, expiration et transfert sans `switch` fragile. Les erreurs renvoient 500, et RevenueCat réessaie. Manque : RevenueCat propose désormais une signature HMAC-SHA256 (en-tête X-RevenueCat-Webhook-Signature), non activée ici (P1-14).

**Étanchéité Stripe / achats intégrés.** Stripe ne vit que sur le web (`create-checkout-session`, `create-portal-session`). Le mobile n'en contient aucune trace, et la gestion d'un abonnement Stripe vu depuis le téléphone est volontairement non cliquable. C'est conforme.

**Point d'attention sandbox.** `has_p3_subscription` ignore les achats sandbox hors staff, adresses `@thrivesportpositive.com` et `qa_accounts`. C'est une bonne protection contre les testeurs TestFlight, mais elle casse la revue si le reviewer achète depuis son propre compte (P0-4).

**Commissions.**

| Store | Abonnements | Condition | Action |
| --- | --- | --- | --- |
| Apple | 15 % la 1re année avec le Small Business Program (sinon 30 %), 15 % ensuite dans tous les cas | Revenus < 1 M$ US l'année précédente | S'inscrire avant la 1re vente |
| Google Play | 15 % dès le 1er jour | Automatique pour les abonnements | Inscrire le palier 15 % pour les achats ponctuels éventuels |

**Fiscalité.** Sur les achats intégrés, Apple et Google sont le vendeur : ils facturent et reversent la TPS et la TVQ au Canada. Tu ne factures donc pas de taxe sur ces ventes. Les ventes Stripe web (packs, abonnement web) restent à ta charge dès que tu es inscrit (seuil du petit fournisseur : 30 000 $ sur 4 trimestres). Le formulaire fiscal américain dépend du titulaire du compte développeur : W-8BEN pour une personne, W-8BEN-E pour une entreprise. Il doit correspondre à la structure juridique choisie. À faire valider par ton comptable : je ne suis pas fiscaliste.

## Pilier 3 — Sécurité Supabase

La base de production est étanche sur tous les tests d'intrusion menés ce soir, en me faisant passer pour un parent, dans une transaction annulée.

| Test (en tant que parent connecté) | Résultat |
| --- | --- |
| Lire les enfants d'une autre famille | 0 ligne — OK |
| Lire l'abonnement d'un autre compte | 0 ligne — OK |
| Lire les demandes de suppression d'autrui, les profils d'autres parents, `qa_accounts` | 0 ligne — OK |
| Se promouvoir ADMIN | Refusé par trigger (« Modification du rôle ou du statut non autorisée ») |
| S'auto-valider `coach_validated` | Refusé par trigger |
| S'offrir un abonnement actif dans `billing_subscriptions` | Refusé : aucun droit d'écriture client |
| Forcer l'accès Maison via `parent_access` | Refusé par RLS |
| S'ajouter à `qa_accounts` pour profiter des achats sandbox | Refusé par RLS |
| Modifier l'enfant d'une autre famille | 0 ligne — OK |

**Statut premium.** Il est écrit uniquement par le webhook et `billing-sync` (service role). Il est lu via `access_state()`, et le mobile n'ouvre l'accès que sur ce verdict serveur, jamais sur l'état RevenueCat local. Conforme.

**Inventaire.** Aucune table publique sans RLS. 4 buckets, tous privés. Aucune fonction `SECURITY DEFINER` sans `search_path` figé. 87 migrations appliquées, dont 070, 071, 074 et 075. Production Vercel alignée sur `main` (bb547d3).

**Alertes Supabase restantes.**

- Protection des mots de passe compromis désactivée (P1-6).
- 5 fonctions appelables sans connexion : `questionnaire_get` / `_submit`, `lsss_get` / `_submit` (accès par jeton UUID, voulu) et `vapid_public_key` (clé publique, voulu). Vérifier que les jetons expirent après soumission.
- Les 28 fonctions accessibles aux connectés contrôlent toutes le rôle dans leur corps (vérifié pour les 8 fonctions admin).
- `waitlist` accepte des insertions anonymes (formulaire public), sans limite de débit (P1-8).
- `pg_net` dans le schéma public (P2-5).

**Edge Functions.** Les 15 fonctions déployées correspondent au dépôt. Les réglages `verify_jwt` sont conformes : `false` seulement pour les deux webhooks et `send-web-push`. Les fonctions admin revérifient le rôle dans `app_metadata`. `send-push-notification` refuse désormais un parent qui écrirait à n'importe qui. Il n'y a aucune limitation de débit applicative : la seule en place est celle de Supabase Auth (P1-8).

## Pilier 4 — Loi 25, confidentialité, documents légaux

Les textes sont rédigés, publiés et complets sur le fond. Trois trous visibles les rendent toutefois non conformes à la Loi 25 en l'état (P0-8).

| Élément | État en ligne (vérifié ce soir) |
| --- | --- |
| Politique de confidentialité `/confidentialite` | Publiée, 11 sections, sous-traitants listés (Supabase, Vercel, Stripe, RevenueCat, Sentry, Expo, Apple, Google, Wistia), conservation et délai de suppression de 30 jours |
| Responsable de la protection des renseignements personnels | **« \[À COMPLÉTER : nom du responsable…\] »** — la Loi 25 exige de publier son titre et ses coordonnées |
| NEQ et adresse du siège | **« \[À COMPLÉTER\] »** sur la politique et les conditions |
| Conditions `/conditions` | Publiées ; renouvellement automatique, essai d'un mois, annulation 24 h avant ; renvoi au contrat de licence standard d'Apple (art. 14) |
| Support `/support`, suppression `/suppression-compte` | Publiées |
| Consentement à l'inscription | Case obligatoire (18 ans et plus, parent ou tuteur, textes acceptés), version `2026-10` et date enregistrées |
| Évaluation des facteurs relatifs à la vie privée, politique de conservation | Rédigées (`docs/conformite-stores/efvp.md`, `politique-conservation.md`) |
| Transferts hors Québec | Déclarés ; reste l'extrait de message dans les notifications push (P1-11) |

**Fiches App Privacy et Data safety.** Elles collent au code : Sentry (diagnostics, sans données personnelles), RevenueCat (achats), Expo Push (jeton), Supabase (compte, enfants, bilans, messages). Il n'y a ni suivi publicitaire ni App Tracking Transparency, et aucun SDK d'analytics ou de publicité. Si le DSN Sentry n'est jamais posé dans EAS, déclare « Diagnostics : non ». Les deux réponses doivent rester identiques au contenu réel du build.

Ce pilier relève d'un juriste pour la validation finale. Ce rapport n'est pas un avis juridique.

## Pilier 5 — Tests, stabilité, CI/CD

Le web est bien couvert ; l'app mobile, celle que les stores testent, ne l'est presque pas.

- **CI GitHub Actions** (`ci.yml`) : typecheck web et mobile, tests unitaires web, Playwright (parcours admin et parcours client), tous les tests Deno des Edge Functions, `deno check`, et tests de régression RLS sur une base locale. Je n'ai pas pu lire le résultat des derniers runs (accès GitHub non activé pour cette session).
- **Surveillance** : `uptime.yml` et la sonde `/api/health`.
- **Déploiement Vercel** : production « Ready » sur le dernier commit de `main`. Un déploiement en erreur sur la branche `backup/local-mac-2026-10-08`, sans impact.
- **Mobile** : aucun test de bout en bout (connexion, Maison, paywall, restauration). La logique d'abonnement a des tests unitaires (`subscription-logic.test.ts`). Aucun `ErrorBoundary` : une erreur de rendu ferme l'app, et c'est le premier motif de rejet 2.1. 12 écrans sur 18 n'ont ni état d'erreur ni bouton Réessayer : hors ligne, ils restent vides ou en chargement (P1-7).
- **Achats** : le SDK ne plante jamais si la clé manque (no-op), ce qui est bien pour la stabilité. Mais une clé absente donne alors un paywall vide, d'où la vérification P0-6.

Avant soumission : un build EAS `production`, installé via TestFlight et la piste interne Play, puis le parcours complet à la main sur un iPhone et un Android. Teste aussi en mode avion au lancement et pendant un achat.

## Scripts SQL à exécuter maintenant

Les trois fichiers sont déjà dans ton dossier `thrive APP`. Ils ne sont pas commités. Le test d'étanchéité a tourné ce soir en production, toujours annulé : tous les résultats étaient OK.

| Fichier | Rôle | Quand |
| --- | --- | --- |
| `supabase/tests/audit_rls_simulation.sql` | Se fait passer pour un parent, tente 5 lectures et 6 écritures interdites, puis annule tout | Après chaque migration touchant la RLS |
| `supabase/tests/audit_inventaire_surveillance.sql` | Inventaire A1 à A7 (RLS, droits, fonctions publiques, buckets) + surveillance S1 à S5 (suppressions en retard, miroir d'abonnement incohérent, période de grâce, fraîcheur du webhook, comptes de revue) | Chaque jour (S) et avant chaque soumission (A) |
| `docs/release/PROPOSITION_20261009_076_sandbox_revue_stores.sql` | Interrupteur `app_settings.accept_sandbox_purchases` : laisse un achat sandbox ouvrir Maison pendant les revues, sans toucher au reste de `has_p3_subscription` (corps identique à la production, vérifié) | Avant la soumission, à décider (P0-4) |

### Test d'étanchéité (à coller dans Supabase › SQL Editor)

```sql
begin;
create temp table _audit (test text, verdict text, detail text) on commit drop;
grant insert, select on _audit to authenticated;

-- Parent testé : le compte de revue s'il existe, sinon le plus ancien parent.
select set_config('audit.uid', coalesce(
  (select id::text from public.profiles where email = 'parent-test@thrivesportpositive.com'),
  (select id::text from public.profiles where role = 'PARENT' order by created_at limit 1)), true);
select set_config('request.jwt.claims', json_build_object(
  'sub', current_setting('audit.uid'), 'role', 'authenticated',
  'app_metadata', json_build_object('role', 'PARENT'))::text, true);
set local role authenticated;

do $$
declare n int; me uuid := auth.uid();
begin
  select count(*) into n from public.children c
  where c.family_id not in (select id from public.families where parent_id = me)
    and c.family_id not in (select family_id from public.family_members where profile_id = me);
  insert into _audit values ('R1 enfants d''autres familles', case when n = 0 then 'OK' else 'FUITE' end, n::text);

  select count(*) into n from public.billing_subscriptions where user_id <> me;
  insert into _audit values ('R2 abonnements d''autrui', case when n = 0 then 'OK' else 'FUITE' end, n::text);

  begin
    update public.profiles set role = 'ADMIN' where id = me;
    get diagnostics n = row_count;
    insert into _audit values ('W1 devenir ADMIN', case when n = 0 then 'OK' else 'FAILLE' end, n::text);
  exception when others then insert into _audit values ('W1 devenir ADMIN', 'OK (refusé)', sqlerrm); end;

  begin
    update public.profiles set coach_validated = not coalesce(coach_validated, false) where id = me;
    get diagnostics n = row_count;
    insert into _audit values ('W2 coach_validated', case when n = 0 then 'OK' else 'FAILLE' end, n::text);
  exception when others then insert into _audit values ('W2 coach_validated', 'OK (refusé)', sqlerrm); end;

  begin
    insert into public.billing_subscriptions (user_id, active, ever_subscribed, synced_at)
    values (me, true, true, now())
    on conflict (user_id) do update set active = true, expires_at = null;
    insert into _audit values ('W3 s''offrir un abonnement', 'FAILLE', 'accepté');
  exception when others then insert into _audit values ('W3 s''offrir un abonnement', 'OK (refusé)', sqlerrm); end;

  begin
    insert into public.parent_access (parent_id, maison) values (me, true)
    on conflict (parent_id) do update set maison = true;
    insert into _audit values ('W4 forcer Maison', 'FAILLE', 'accepté');
  exception when others then insert into _audit values ('W4 forcer Maison', 'OK (refusé)', sqlerrm); end;

  begin
    insert into public.qa_accounts (email) values ('pirate@example.com');
    insert into _audit values ('W5 devenir compte QA', 'FAILLE', 'accepté');
  exception when others then insert into _audit values ('W5 devenir compte QA', 'OK (refusé)', sqlerrm); end;
end $$;

reset role;
select * from _audit order by test;
rollback;  -- rien n'est conservé
```

La version complète du fichier ajoute R3 à R5 (suppressions, profils, `qa_accounts`), W6 (enfant d'une autre famille) et l'`access_state()` du parent testé.

### Trois requêtes de surveillance à brancher sur une alerte

```sql
-- S1. Suppressions en retard sur les 30 jours annoncés (attendu : 0)
select id, target_profile_id, requested_at, due_at from public.deletion_requests
where processed_at is null
  and coalesce(due_at, requested_at + interval '30 days') < now() + interval '5 days';

-- S2. Abonnement marqué actif mais expiré : webhook manqué (attendu : 0)
select user_id, store, expires_at, synced_at from public.billing_subscriptions
where active and expires_at < now() - interval '1 hour';

-- S5. Comptes de revue présents et confirmés (attendu : 3 lignes, confirmed = true)
select email, email_confirmed_at is not null as confirmed from auth.users
where email in ('parent-test@thrivesportpositive.com', 'coach-test@thrivesportpositive.com',
                'parent-abonnement@thrivesportpositive.com');
```

## Notes de revue prêtes à coller

Elles remplacent `docs/store/notes-revue-apple.md`, qui demande au reviewer de créer un compte. Avec la règle sandbox actuelle, ce parcours mène au rejet. Elles sont en anglais, la langue de travail des reviewers ; l'interface reste en français. Les mots de passe vont dans les champs sécurisés des consoles, jamais dans ce texte. Prérequis : P0-5 (trois comptes créés et confirmés) et P0-7 livré, avec le libellé « Signaler » ci-dessous.

### App Store Connect › App Review Information › Notes

```text
THRIVE is a sport-based psychoeducation program for families. The app is for ADULTS only (parents and coaches). Children never have an account; a parent enters their child's first name and birth date. The interface is in French.

DEMO ACCOUNTS (passwords in the Sign-In Information fields)
1) parent-abonnement@thrivesportpositive.com - parent WITHOUT any plan. Use it to test the in-app subscription.
2) parent-test@thrivesportpositive.com - parent enrolled in an in-person coaching program, with sample data (2 fictional children, session reports, coach messages, activity journal).
3) coach-test@thrivesportpositive.com - coach view.
No 2FA or SMS code is required. All data is fictional.

HOW TO TEST THE SUBSCRIPTION (account 1)
Sign in > tab "Maison". The paywall shows the auto-renewable subscription "THRIVE - Le moment qui compte" (monthly and annual, 1-month free trial for new subscribers), price and renewal terms, "Restaurer les achats" (Restore Purchases), Terms of Use (EULA) and Privacy Policy. After purchase the "Maison" content unlocks within seconds. Add a child in "Mes enfants" to receive the daily activities. Subscription status and "Gérer mon abonnement" are in tab "Profil".

PAYMENTS
Digital content ("Maison" activities) is sold only through In-App Purchase. Families enrolled in our in-person coaching sessions with a real coach (a person-to-person service delivered outside the app, guideline 3.1.3(e)) get the same content included, as does a subscription bought on our website (3.1.3(b)); both remain available as In-App Purchase. The app contains no link, button or text pointing to any other payment method.

MESSAGING
Private messaging only between a parent and the coach assigned by THRIVE; no public or anonymous content. Long-press any message > "Signaler" to report it or block the conversation. Reports are reviewed within 24 hours (support@thrivesportpositive.com).

ACCOUNT DELETION
Tab "Profil" > "Confidentialité et compte" > "Supprimer mon compte". Data is deleted within 30 days; the app reminds users to cancel their App Store subscription in Settings.

HEALTH
Educational content only: no diagnosis or treatment. Maison and Profil display a reminder to consult a professional and Canadian crisis resources.

PERMISSIONS
Notifications only, requested after sign-in and optional. No camera, microphone, location, contacts or tracking.

Contact: support@thrivesportpositive.com
```

### Google Play Console › Contenu de l'appli › Accès à l'appli

Choisir « Tout ou partie des fonctionnalités sont soumises à restrictions », puis ajouter trois instructions (nom, identifiant, mot de passe, et le texte ci-dessous en « autres informations »).

```text
Account 1 - Subscription test: parent-abonnement@thrivesportpositive.com. Sign in > tab "Maison" shows the Google Play Billing paywall (monthly / annual, 1-month free trial). After purchase, Maison unlocks. Add a child in "Mes enfants" to see activities.

Account 2 - Full parent experience: parent-test@thrivesportpositive.com. Sample children, session reports (tab "Bilans"), coach messages (tab "Messages", long-press > "Signaler" to report/block).

Account 3 - Coach: coach-test@thrivesportpositive.com.

No 2FA, SMS or email code required. All data is fictional. App for adults (parents and coaches) only; children have no account. Account deletion: Profil > Confidentialité et compte > Supprimer mon compte, or https://app.thrivesportpositive.com/suppression-compte.
```

URL à déclarer dans les deux consoles : confidentialité `https://app.thrivesportpositive.com/confidentialite`, conditions `https://app.thrivesportpositive.com/conditions`, support `https://app.thrivesportpositive.com/support`, suppression (Play) `https://app.thrivesportpositive.com/suppression-compte`. Dans App Store Connect, ajoute le lien des conditions dans la description, ou choisis le CLUF standard d'Apple, pour satisfaire 3.1.2.

## Limites de cet audit et sources

Vérifié en direct : code du dépôt, base Supabase THRIVE-CA (requêtes en lecture et transactions annulées), catalogue et webhooks RevenueCat, déploiements Vercel, pages légales en ligne. **Non vérifiable d'ici**, donc à contrôler toi-même :

- App Store Connect : contrats, produits, groupe d'abonnement, période de grâce, Small Business Program.
- Play Console : type de compte, produits, palier 15 %, formulaires.
- Variables d'environnement EAS, résultat des derniers runs GitHub Actions.
- Réglage « Confirm email » de Supabase Auth.
- Rendu réel de l'app sur appareil : aucun build natif n'a été lancé.

Les règles des stores évoluent. Je me suis appuyé sur les guidelines connues à mi-2026 et sur le rapport de veille du 1er octobre déjà présent dans `docs/conformite-stores/`. Relis les pages officielles avant l'envoi.

**Sources**

- [App Review Guidelines — Apple](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/)
- [Account deletion requirements — Google Play](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Service fees — Google Play](https://support.google.com/googleplay/android-developer/answer/112622)
- [RevenueCat — Webhooks](https://www.revenuecat.com/docs/integrations/webhooks)
- [RevenueCat — In-App Purchase Key (iOS)](https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret/in-app-purchase-key-configuration)
- [Supabase — Password security](https://supabase.com/docs/guides/auth/password-security)
- [Loi 25 — Commission d'accès à l'information du Québec](https://www.cai.gouv.qc.ca/protection-renseignements-personnels/sujets-et-domaines-dinteret/principaux-changements-loi-25)
- Pages en ligne lues le 8 octobre : [confidentialité](https://app.thrivesportpositive.com/confidentialite), [conditions](https://app.thrivesportpositive.com/conditions), [suppression](https://app.thrivesportpositive.com/suppression-compte)
