# Politique de conservation et de destruction des renseignements personnels

**Thrive Sport Positive** · version 2026-10 · 2 octobre 2026
Responsable : le dirigeant de Thrive Sport Positive (confidentialite@thrivesportpositive.com)

## Principe

Un renseignement personnel est conservé **tant que dure le compte actif** qui le justifie, puis détruit, sauf si une loi impose de le garder plus longtemps (Loi 25, art. 23). Seules les **pièces comptables** suivent ce régime d'exception : **6 ans** (Loi sur l'administration fiscale du Québec, art. 35 ; Loi de l'impôt sur le revenu, art. 230 : 6 ans après la fin de l'année d'imposition concernée).

Ces 6 ans ne s'appliquent pas aux données du programme : garder les données d'un enfant 6 ans après la fermeture d'un compte n'aurait aucune finalité et contreviendrait à l'art. 23.

## Durées

| Données | Durée | Fin de conservation |
|---|---|---|
| Compte parent ou coach (identité, contact, préférences) | Durée du compte actif | Destruction dans les **30 jours** suivant la demande de suppression |
| Famille, enfants, photos | Durée du compte du parent | idem (cascade `admin-delete-user`) |
| Mesures psychoéducatives, bilans, notes et documents du coach | Durée du compte du parent | idem |
| Messages et pièces jointes | Durée du compte | idem ; un message reçu par un coach est détruit avec la famille concernée |
| Activités Maison (moments, carnet) | Durée du compte | idem |
| Compte inactif (aucune connexion ni abonnement actif pendant 24 mois) | 24 mois d'inactivité | Courriel d'avertissement, puis suppression 30 jours plus tard |
| Factures, paiements, abonnements (Stripe, miroir `billing_subscriptions`) | **6 ans** après la fin de l'année d'imposition | Destruction ou anonymisation ; seules les données de facturation sont gardées (nom, courriel, adresse de facturation, montants), jamais les données du programme |
| Demande de suppression (`deletion_requests`) | 6 ans | Preuve du respect de la demande |
| Preuves de consentement (`consents`, version et date acceptées) | Durée du compte + 3 ans | Preuve en cas de plainte |
| Journaux techniques (Vercel, Supabase) et erreurs (Sentry) | 90 jours au plus | Rotation automatique |
| Sauvegardes de la base | 30 jours au plus | Rotation : une donnée supprimée disparaît des sauvegardes au plus tard 30 jours après |
| Registre des incidents de confidentialité | 5 ans après la mise à jour de l'incident | Obligation réglementaire (à confirmer dans le règlement sur les incidents de confidentialité) |
| Liste d'attente (prospects) | 24 mois sans échange | Suppression |

## Destruction

- Suppression définitive en base (pas de « désactivation ») et des fichiers des compartiments `child-avatars` et `athlete-documents`.
- Côté fournisseurs : suppression de l'abonné RevenueCat ; annulation de l'abonnement Stripe (le client Stripe est gardé pour les factures, durée comptable ci-dessus).
- Anonymisation possible à la place de la destruction pour des statistiques, uniquement si la personne ne peut plus être identifiée de façon irréversible (art. 23).

## À mettre en œuvre

1. Traitement des `deletion_requests` sous 30 jours (responsable désigné, tableau de bord admin).
2. Tâche planifiée de purge des comptes inactifs et des factures de plus de 6 ans.
3. Réglage de la conservation de Sentry et des journaux Vercel/Supabase à 90 jours au plus.
