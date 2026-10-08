# Checklist de soumission — App Store et Google Play (THRIVE v1.0)

Légende : **[A]** fait par l'agent (code ou docs, dans la branche) · **[L]** action de Lylian · **[D]** dépend d'un déploiement prod (aucune écriture prod faite par l'agent).
État au 8/10/2026.

## 1. Pages légales et URL publiques
| # | Étape | Qui | État |
|---|---|---|---|
| 1.1 | `/politique-confidentialite` publique, section #suppression, responsable PRP et NEQ en placeholders visibles | [A] | fait (commit 50db388) |
| 1.2 | `/conditions` publique (abonnement, santé, résiliation, droit québécois) | [A] | fait |
| 1.3 | `/confidentialite` et `/suppression-compte` redirigent vers les bonnes pages | [A] | fait |
| 1.4 | Renseigner raison sociale définitive, NEQ, adresse du siège dans `apps/web/src/lib/legal.ts` (`neq`, `address`) | [L] | **à faire** |
| 1.5 | Nommer le responsable de la protection des renseignements personnels (`privacyOfficerName`) ou désigner la direction par écrit (art. 3.1 Loi 25) | [L] | **à faire** |
| 1.6 | Version anglaise (`/en/terms`, `/en/privacy`) si l'app est livrée en anglais | [L] décision | non fait |
| 1.7 | Liens légaux à l'inscription, au paywall web et mobile, au profil : vérifier après déploiement | [A-01]/[A-03] | ouvert (patch demandé aux propriétaires des fichiers) |
| 1.8 | Publication sur `app.thrivesportpositive.com` après déploiement (preview puis prod) | [D] | après merge |
| 1.9 | Vérifier que `EXPO_PUBLIC_PRIVACY_URL` et `EXPO_PUBLIC_TERMS_URL` pointent sur ces URL dans EAS | [L] | à faire |

## 2. Données et conformité
| # | Étape | Qui | État |
|---|---|---|---|
| 2.1 | Grilles App Privacy et Data safety corrigées (santé, photos, Sentry) | [A] | fait |
| 2.2 | Confirmer « Santé = Oui » et « Sentry = Oui » | [L] | **à trancher** |
| 2.3 | Migration 067 (confirmation e-mail, Loi 25) et 066 (sécurité) appliquées en prod | [L] + A11 | non appliquées (voir INTEGRATION-v1.0.md) |
| 2.4 | Signalement et blocage dans la messagerie (rapport A-02, guideline 1.2) | agent A03 | **bloquant** |
| 2.5 | Suppression de compte dans l'app (5.1.1(v)) et URL web | [A] existant + vérifier | à tester |

## 3. Fiches store
| # | Étape | Qui | État |
|---|---|---|---|
| 3.1 | Fiche App Store (`fiche-app-store.md`) | [A] | fait |
| 3.2 | Fiche Google Play (`fiche-google-play.md`) | [A] | fait |
| 3.3 | Questionnaire de classification d'âge Apple et IARC | [L] (réponses dans les fiches) | à saisir |
| 3.4 | Recherche de marque « THRIVE Sport Positive » (INPI, marques Apple, Play) | [L] | à faire |
| 3.5 | Captures d'écran : iPhone 6,9" (1320×2868), 6,5" (1284×2778), Android (1080×1920 min.) | agent A10 suite | **non faites** (script Playwright à écrire, comptes démo) |
| 3.6 | Icône 1024×1024 (iOS, sans transparence) et 512×512 (Android), image 1024×500 | [L] / design | à vérifier |

## 4. Revue
| # | Étape | Qui | État |
|---|---|---|---|
| 4.1 | Comptes démo `parent-test` et `coach-test` créés en production (seed `review_accounts.sql`), mots de passe transmis dans le champ sécurisé | [L] | **à faire, feu vert requis** |
| 4.2 | Notes de revue (`notes-revue-apple.md`) collées dans App Store Connect et Play | [L] | après 4.1 |
| 4.3 | Point 3.1.3 (abonnement web reconnu dans l'app) à valider | [L] | à valider |

## 5. Play Console
| # | Étape | Qui | État |
|---|---|---|---|
| 5.1 | Type de compte développeur (personnel récent = test fermé 12 testeurs / 14 jours) | [L] | à confirmer |
| 5.2 | Piste de test fermé, invitation des testeurs | [L] | après 5.1 |
| 5.3 | Data safety, contenu de l'app, public cible 18+, accès à l'app | [L] avec `google-data-safety.md` | après 2.2 |

## 6. Soumission
| # | Étape | Qui | État |
|---|---|---|---|
| 6.1 | Build EAS production (iOS et Android) | [L] | à lancer |
| 6.2 | Achats in-app créés et testés (sandbox Apple, Play tests), RevenueCat configuré | [L] | à faire |
| 6.3 | Envoi pour revue App Store | [L] | après tout le reste |
| 6.4 | Envoi en production Google Play | [L] | après le test fermé |

## Reste explicitement hors de cette passe
- Captures d'écran générées et vérifiées visuellement (3.5).
- Version anglaise des textes légaux (1.6).
- Validation juridique par un juriste des pages légales (les textes sont des brouillons ⚖️ du rapport de conformité).
