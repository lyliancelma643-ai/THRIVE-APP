# Audit qualité final — partie CLIENT (parent + lien enfant)

**Date : 2026-10-01 · Auditrice : Lydia · Branche : `claude/zealous-einstein-4dwew8`**
**Périmètre : uniquement la partie client de l'app web/PWA (`apps/web`) — connexion, inscription, réinitialisation, espace parent (Bilan, Mes séances, Maison, messagerie, abonnement, forfaits, compte, ajout de profil), questionnaire enfant `/q/[token]`.** L'app Expo (`apps/mobile`) n'est pas déployée (hors CI) : hors périmètre. Coach et admin : cités seulement quand ils bloquent un parcours client.

Méthode : lecture du code client, build + lint + typecheck + tests, captures automatisées sur le backend Supabase simulé (236 captures, 4 formats, axe-core), E2E Playwright connectés, vérifications **en lecture seule** sur la base de production (aucune donnée modifiée).

---

## 1. Tableau principal

Gravité : 🔴 bloquant · 🟠 majeur · 🟡 mineur

| ID | Zone | Constat | Impact utilisateur / revenu | Gravité | Preuve | Statut | Correctif (commit) |
|---|---|---|---|---|---|---|---|
| C-01 | Inscription | Les enfants saisis à l'inscription ne sont **jamais enregistrés** : `children.last_name` est NOT NULL en base, l'inscription ne l'envoyait pas, l'erreur était avalée. | Premier contact raté : le parent arrive sur « Aucun profil enfant », doit tout ressaisir, le coach n'est pas déclenché. Perte de conversion directe. | 🔴 | Prod : les 2 dernières familles (14/06, 08/07) ont 0 enfant alors qu'une famille n'est créée que si des enfants sont déclarés. E2E : le test échoue si on réintroduit le bug. | CORRIGÉ | `692043b` |
| C-02 | Compte | Aucune **suppression de compte** ni **export des données** dans l'app (les fonctions serveur existaient, déployées). | Refus App Store (5.1.1(v)) / Google Play ; non-conformité Loi 25. | 🔴 | `/parent/compte` sans ces actions ; `request-account-deletion`, `export-my-data` actives en prod. | CORRIGÉ (côté client) — traitement admin à organiser (A-02) | `e6c52d4` |
| C-03 | Légal | Ni l'inscription ni l'offre d'abonnement ne renvoient vers des **conditions d'utilisation / politique de confidentialité** ; aucune URL n'existe dans la config. | Vente d'un abonnement + données de mineurs sans documents opposables ; exigé par les stores. | 🔴 | Recherche dans `apps/web/src` : 0 lien. | PARTIEL : liens prêts, s'affichent dès que les URL existent | `f3dc922` → action Lylian n°1 |
| C-04 | Co-parent | Un co-parent invité **ne voit aucun enfant** : les règles d'accès en base (RLS `families`, `children`…) ne connaissent que le titulaire. L'offre promet « Accès pour les deux parents ». | Promesse commerciale fausse dès la 1re invitation. | 🔴 | Prod `pg_policies` : `parent_id = auth.uid()` seulement. 0 co-parent en prod aujourd'hui (latent). | NON CORRIGÉ (migration RLS à tester sur branche Supabase) | — action Lylian n°3 |
| C-05 | Questionnaire enfant | `Shell` recréé à chaque rendu → **toute la page démontée/remontée à chaque réponse** : focus VoiceOver/TalkBack renvoyé en haut, 43 cartes reconstruites par toucher. | Questionnaire LSSS (43 items) pénible, inutilisable au lecteur d'écran ; données de mesure moins fiables. | 🟠 | E2E « le focus reste sur le choix » (échouait avant). | CORRIGÉ | `a49b4bc` |
| C-06 | Questionnaire enfant | Aucune sauvegarde : un rechargement / verrouillage d'écran fait **tout recommencer**. | Abandons, questionnaires non remplis → bilans incomplets. | 🟠 | E2E « les réponses survivent à un rechargement ». | CORRIGÉ | `a49b4bc` |
| C-07 | Questionnaire enfant | Coupure réseau affichée « Lien invalide » ; erreurs techniques brutes à l'envoi ; libellés de l'échelle en 8 px ; état choisi non annoncé (pas d'`aria-pressed`). | Enfant bloqué, parent qui redemande un lien inutilement. | 🟠 | E2E coupure réseau + lien tronqué (jeton non-UUID → 400). | CORRIGÉ | `a49b4bc`, `438f02e` |
| C-08 | Bilan | Erreur réseau → **squelette de chargement infini** (ou dossier vide). | Le parent croit l'app cassée sur l'écran principal. | 🟠 | E2E « coupure réseau → Réessayer ». | CORRIGÉ (écran d'erreur en ~7 s au lieu de ~16 s : double nouvel essai supprimé) | `1036212`, `be53094` |
| C-09 | Bilan | Sport affiché **« Hockey sur glace » écrit en dur** tant que le coach n'a rien saisi. | Donnée fausse sur la carte d'identité de l'enfant (un nageur affiché hockeyeur). | 🟠 | `bilans/page.tsx` (2 occurrences). | CORRIGÉ : sport déclaré par le parent | `1036212` |
| C-10 | Bilan | Contrat / lettre / certificat : `window.open` après un `await` → **bloqué par Safari iOS**. | Documents payés inaccessibles sur iPhone. | 🟠 | Code ; NON_VERIFIE sur appareil (action n°4). | CORRIGÉ (onglet ouvert dans le geste) | `1036212` |
| C-11 | Bilan, Mes séances | État « Aucun profil enfant » **sans bouton** (impasse). | Parent bloqué sur 2 onglets sur 3. | 🟠 | Captures. | CORRIGÉ : « + Ajouter mon enfant » | `1036212` |
| C-12 | PWA | Après un déploiement, une PWA ouverte plante sur un écran non chargé (ChunkLoadError) ; « Réessayer » rejoue l'échec. | Erreur visible à chaque mise en production pour les utilisateurs actifs. | 🟠 | `error.tsx` ; Serwist `skipWaiting`. | CORRIGÉ : rechargement automatique unique | `2adb3a0` |
| C-13 | Ajout de profil | Âge accepté **1 à 25 ans** (inscription : 8–17), autre liste de sports (« Gym »), libellés non reliés aux champs, erreurs Postgres brutes. | Profils hors cible (contenu Maison absent < 8 ans), incohérence. | 🟡 | `select-profile/page.tsx`. | CORRIGÉ (`lib/child-form` commun) | `692043b` |
| C-14 | Auth | Erreurs Supabase **en anglais** affichées telles quelles (mot de passe oublié, réinitialisation, profil). | Message incompréhensible au moment le plus sensible. | 🟡 | `lib/auth-errors` + 13 tests. | CORRIGÉ | `e6c52d4`, `692043b` |
| C-15 | Inscription | Enfant avec prénom mais sans âge **ignoré en silence**. | Enfant « perdu » sans explication. | 🟡 | E2E dédié. | CORRIGÉ | `692043b` |
| C-16 | Compte | Changer de mot de passe : « écris à ton coach ». | Support inutile, friction. | 🟡 | — | CORRIGÉ : lien envoyé à sa propre adresse | `e6c52d4` |
| C-17 | Abonnement | « Ouvrir Maison » écrasé à **25 px** de haut sur mobile ; « Actualiser mon accès » muet en cas d'échec. | Cible ratée au pouce ; parent payeur sans retour. | 🟡 | Audit captures : 5 → 0 cibles < 44 px. | CORRIGÉ | `e6c52d4` |
| C-18 | Connexion | « Mot de passe oublié ? » à 40 px. | Cible tactile < 44 px. | 🟡 | Audit captures. | CORRIGÉ | `692043b` |
| C-19 | Textes | Promesses « à venir » visibles : ligne « Synthèse IA — À venir » des forfaits, « version pour les plus jeunes en préparation ». | Fonctionnalités annoncées non livrées. | 🟡 | — | CORRIGÉ (retirées) | `1036212` |
| C-20 | Maison | Le certificat de fin affiche **« 1 mois offert »**, mais rien n'applique ce mois dans la facturation (TODO dans le code). | Promesse non tenue à un abonné fidèle → réclamation / remboursement. | 🟠 | `RewardView.tsx:190`, `p3-moments/index.ts:259`. | NON CORRIGÉ (décision commerciale) | — action n°5 |
| C-21 | Revenu | Le contenu payant Maison (52 fiches, 477 Ko) est **embarqué dans le JS public** ; le paywall n'est qu'un écran. En cas d'erreur de `access_state`, repli « ouvert ». | Contournable par toute personne technique ; dette acceptée à court terme. | 🟡 | Build : écrans Maison 380–394 kB. | DETTE (servir le contenu côté serveur) | — |
| C-22 | Performance | « Mes séances » : un appel RPC `session_report` **par séance validée** (jusqu'à 13). | Lenteur en 4G en fin de parcours. | 🟡 | `my-sessions/page.tsx`. | DETTE (RPC groupé côté base) | — |
| C-23 | Suppression | Les demandes de suppression arrivent dans `deletion_requests` mais **aucun écran admin ne les liste**. | Demande sans réponse = non-conformité. | 🟠 | Prod : table présente, 0 ligne, aucune lecture côté admin. | NON CORRIGÉ (hors périmètre client) | — action n°2 |

Vérifié conforme (aucune correction) : paiement Stripe — `billing-plans` répond 200 en prod (offre affichée) ; drapeaux `p3_enabled` / `fitness_enabled` actifs (aucun écran « En construction » visible) ; support toujours joignable depuis la messagerie (le lien « Passer au pack … avec mon coach » n'est pas une impasse) ; 0 lorem ipsum ; 0 `console.log` (3 `console.warn` volontaires dans le repli local de Maison) ; 0 débordement horizontal, 0 violation axe sur 236 captures.

---

## 2. Métriques avant / après

| Indicateur | Avant | Après |
|---|---|---|
| `tsc --noEmit` | 0 erreur | 0 erreur |
| ESLint | 0 avertissement | 0 avertissement |
| Build de prod | OK, 4 avertissements connus (metadataBase ×3, supabase-js en Edge) | OK, mêmes 4 |
| Tests unitaires (Vitest) | 365 | **401** (+ auth-errors, child-form, account, stale-build) |
| E2E client connectés | 0 (seules les redirections sans compte étaient testées) | **14** sur mobile, en CI (job `e2e-client`) |
| Captures client (236) — cibles < 44 px | 5 | **0** |
| Captures — CLS > 0,1 | 3 | 3 en mesure isolée (écrans non modifiés ; un 4e relevé sous charge, 0,152 confirmé sur 3 passes isolées) |
| Captures — violations axe / erreurs JS | 0 / 0 | 0 / 0 |
| Socle JS commun | 185 kB | 185 kB |
| Premier chargement (login / bilans / compte / abonnement / q) | 274 / 307 / 269 / 272 / 266 kB | 275 / 309 / 273 / 273 / 266 kB |
| Lighthouse | Référence 29/09 : mobile 83–87, accessibilité 100 | **NON_VERIFIE** (mesure non relancée) |

Rapports bruts : `ux-audit/client-before/summary.md`, `ux-audit/client-after/summary.md`.

---

## 3. Couverture de la checklist (partie client)

- **A. Santé du code** : build/lint/TS propres ; valeurs en dur retirées (sport, âge) ; duplications réduites (`lib/child-form`, `lib/auth-errors`) ; gestion d'erreurs ajoutée sur les écrans principaux. Env : aucune URL de dev en prod (`localhost:5173` seulement hors production).
- **B. Tests** : suite E2E client sur backend simulé, rendu fidèle à la prod (NOT NULL de `children`). Le paiement réel reste NON_VERIFIE (aucun achat dans la base : action n°4).
- **C. Parcours** : parent payant, parent essentiel, parent en attente d'activation, lien enfant : normal / vide / chargement / erreur / hors ligne / accès refusé (verrou) capturés.
- **D. Mobile** : PWA, pas de wrapper natif publié. Zones sûres, 320 px → tablette OK en captures. Appareils physiques, push web, gestes : NON_VERIFIE (action n°4).
- **E. Performance** : bundles stables ; doublon de nouvel essai réseau supprimé sur le bilan ; dettes C-21, C-22.
- **F. Accessibilité** : axe 0 violation ; questionnaire enfant rendu utilisable au lecteur d'écran ; libellés reliés dans l'ajout de profil. VoiceOver / TalkBack réels : NON_VERIFIE.
- **G. Conversion** : bloquant d'onboarding C-01 levé ; e-mails transactionnels (SPF / DKIM / DMARC, rendu) : NON_VERIFIE.
- **H. Internationalisation** : app 100 % en français codé en dur, sans fichier de traduction ; seul le questionnaire enfant existe en anglais. Dates et devise en `fr-CA` / CAD pour tous, France comprise. Dette assumée tant que la cible est le Québec.
- **I. Actifs** : icônes PWA présentes ; droits sur médias et polices (Inter, Fraunces : licence OFL) — à confirmer pour les visuels Maison.

---

## 4. Synthèse

**Bloquants restants (avant publication payante)**
1. C-03 — URL des conditions d'utilisation et de la politique de confidentialité à fournir.
2. C-04 — accès co-parent (RLS) à construire, **ou** retirer « Accès pour les deux parents » de l'offre.
3. C-23 — traitement des demandes de suppression côté admin (même manuel, mais avec un délai annoncé).

**Dette technique acceptable** : C-21 (contenu Maison dans le bundle), C-22 (N+1 Mes séances), i18n anglais, avertissement `metadataBase`.

**Verdict : NO-GO** tant que les 3 bloquants ci-dessus ne sont pas levés. Ils dépendent d'URL légales, d'un choix commercial et d'une migration en base ; aucun ne demande de refonte. Une fois levés et l'achat test (action n°4) validé : **GO**.

---

## ACTIONS_REQUISES_DE_LYLIAN

| N° | Action | Étapes précises | Pourquoi | Ce que je dois renvoyer à Lydia |
|---|---|---|---|---|
| 1 | Fournir les pages légales | Publier sur le site vitrine les CGU et la politique de confidentialité, puis dans Vercel → projet web → Settings → Environment Variables, ajouter `NEXT_PUBLIC_TERMS_URL` et `NEXT_PUBLIC_PRIVACY_URL` (Production), puis redéployer. | Les liens sont prêts dans l'inscription et l'offre, mais n'apparaissent pas sans URL. | Les 2 URL, ou une capture de l'inscription montrant les liens. |
| 2 | Décider du traitement des demandes de suppression | Choisir le délai annoncé (ex. 30 jours) et qui traite. Je peux ensuite ajouter l'écran admin ou, en attendant, une requête hebdomadaire sur `deletion_requests` suivie d'un `admin-delete-user`. | Le parent peut désormais demander la suppression ; sans traitement, la demande reste sans réponse. | Le délai et la personne responsable. |
| 3 | Trancher sur le co-parent | Soit me demander la migration RLS (testée sur une branche Supabase avant la prod), soit valider le retrait de « Accès pour les deux parents » de l'offre et de l'ajout de parent. | La promesse est fausse aujourd'hui. | « Migration » ou « Retirer la promesse ». |
| 4 | Tester sur appareils physiques | iPhone (Safari + PWA installée) et Android (Chrome + PWA) : inscription avec 1 enfant ; ouverture du certificat / contrat dans le Bilan ; questionnaire enfant avec VoiceOver / TalkBack ; activation des notifications ; **un achat réel** de l'abonnement Maison en mode test Stripe puis annulation depuis le portail ; réception et rendu des e-mails (réinitialisation, confirmation) dans Gmail et Outlook. | Non vérifiable dans mon environnement (pas d'appareil, Supabase et Stripe non joignables). | Pour chaque étape : OK / KO + capture si KO, et les en-têtes d'un e-mail reçu (SPF / DKIM / DMARC « pass »). |
| 5 | Décider du « 1 mois offert » du certificat | Soit l'honorer (coupon Stripe appliqué à la fin des 13 semaines — je peux l'implémenter), soit me demander de retirer la mention. | Promesse affichée à l'abonné, non appliquée par la facturation. | « Honorer » ou « Retirer ». |
| 6 | Valider les textes ajoutés | Relire dans `/parent/compte` les sections « Mes données » et « Supprimer mon compte », et le message de reprise du questionnaire enfant. | Ton et engagements (« L'équipe THRIVE supprime ton compte… puis te le confirme »). | OK ou corrections. |
