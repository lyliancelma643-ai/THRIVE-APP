# Sécurité des données (Google Play) — THRIVE

Grille complète : `docs/conformite-stores/declarations-stores.md` §1 (corrigée le 8/10/2026). Résumé de la réponse finale.

## Réponses globales
- Collecte ou partage de données : **Oui** (collecte uniquement, aucun partage à des tiers à des fins propres ; Supabase, Expo, RevenueCat, Sentry = prestataires)
- Données chiffrées en transit : **Oui**
- Suppression de compte proposée : **Oui**, dans l'app et par web (`/suppression-compte`)
- Suppression de certaines données sans supprimer le compte : **Non**
- Validation de sécurité indépendante : **Non**

## Types de données collectés (collecte Oui, partage Non, éphémère Non)
- Nom ; adresse e-mail ; identifiant utilisateur (obligatoires)
- Autres infos personnelles : date de naissance, genre et sport de l'enfant (facultatif)
- Historique des achats
- **Informations de santé** : allergies ou besoins particuliers, scores PERMA et LSSS (corrigé le 8/10)
- **Photos** : photo de profil de l'enfant (corrigé le 8/10)
- Messages dans l'app (messagerie)
- Autre contenu généré (carnet Maison, notes de séance, moments vécus)
- **Journaux de plantage et diagnostics** : Sentry (corrigé le 8/10)
- Identifiant d'appareil (jeton de notification)

Non collectés : adresse postale, téléphone, localisation, contacts, fichiers, agenda, historique de recherche, navigation web, publicité.

## Décisions à trancher par Lylian
1. Informations de santé : **Oui** recommandé (voir Apple). Vérifier la cohérence avec la politique de confidentialité, section 2.
2. Sentry : déclaré ; à retirer seulement si le DSN ne sera jamais posé.
3. Google demande une URL de suppression publique : `https://app.thrivesportpositive.com/suppression-compte`. Elle est présente et redirige vers la section de suppression. Google peut demander un formulaire web : si c'est le cas, la réponse est « demande par courriel à confidentialite@thrivesportpositive.com » et il faut le signaler dans la fiche. Non vérifié en ligne dans cette passe.
