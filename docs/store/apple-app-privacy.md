# App Privacy (Apple) — THRIVE

Grille complète : `docs/conformite-stores/declarations-stores.md` §2 (corrigée le 8/10/2026). Ce fichier résume la réponse finale et les décisions à trancher.

## Réponses globales
- Collecte de données : **Oui**
- Suivi (tracking) : **Non** pour tous les types (pas de SDK publicitaire, pas d'ATT)

## Données déclarées (liées à l'identité = Oui, suivi = Non, finalité = fonctionnalité de l'app sauf mention)

| Catégorie Apple | Type | Collecté | Note |
|---|---|---|---|
| Coordonnées | Nom | Oui | parent et enfant (prénom et nom) |
| Coordonnées | Adresse e-mail | Oui | compte parent et coach |
| Contenu utilisateur | Messages (messagerie in-app) | Oui | |
| Contenu utilisateur | Autre contenu (carnet Maison, notes du coach) | Oui | |
| Contenu utilisateur | Photos ou vidéos | Oui | photo de profil de l'enfant, facultative (corrigé le 8/10) |
| Identifiants | Identifiant utilisateur | Oui | |
| Identifiants | Identifiant d'appareil (jeton push) | Oui | |
| Achats | Historique des achats | Oui | finalités : fonctionnalité, analyses (RevenueCat) |
| Santé et forme | Santé, forme | **Oui** (corrigé le 8/10) | allergies ou besoins saisis par le parent, scores PERMA et LSSS |
| Diagnostics | Plantages, performances | **Oui** (corrigé le 8/10) | Sentry, identifiant opaque, pas de capture d'écran ni de courriel |

Non collectés : localisation, contacts, finances (paiement géré par Apple), navigation, publicité, données d'utilisation à des fins de suivi.

## Décisions à trancher par Lylian avant soumission
1. **Santé et forme = Oui** : recommandation prudente. Si Lylian conteste, il doit pouvoir justifier qu'aucune donnée de santé n'est saisie (ce qui n'est pas le cas : champ « allergie, besoin particulier » dans le profil enfant, bilans PERMA/LSSS).
2. **Sentry** : déclaré dès maintenant. Le SDK mobile reste inerte tant que `EXPO_PUBLIC_SENTRY_DSN` n'est pas posé ; la déclaration reste valable dès qu'il l'est. Si le DSN n'est jamais posé, on peut repasser « Diagnostics » à Non.
3. **Enfant mineur dans les données** : Apple n'a pas de case « enfants » ; le compte est adulte. La déclaration porte sur les données de l'enfant saisies par le parent. Aucun compte enfant n'existe.

## Mise à jour
Refaire ce questionnaire à chaque nouvelle donnée (ex. : intégration des questionnaires dans l'app, HealthKit, photo via la caméra).
