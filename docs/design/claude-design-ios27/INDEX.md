# Canevas Claude Design — THRIVE iOS 27 (référence d'intégration)

Source : https://claude.ai/artifact/8KWS2yao3sNodDwEB2Y9Kx (version 1791848009). Téléchargé le 2026-10-12.

- `project/*.dc.html` : le HTML exact de chaque écran (V1 = Natif, V2 = Nuit calme, V3 = Carnet de saison ; `Main.dc.html` = V1-A Bienvenue).
- `_blob/c8a22b05c04467fb309a06729e7d51ed.css` : la feuille de style commune (variables `[data-v=v1|v2|v3]`, primitives `.phone .navbar .gbtn .glass .list .rowi .field .sec .sec-h .card .btn .tag .tabbar`…).
- `rendu/*.html` : les écrans rendus en local (images remappées vers les vignettes du dépôt).
- `reference/*.png` (402×874, premier écran) et `reference-long/*.png` (pleine hauteur des écrans longs) : captures de référence — NON versionnées, régénérables (scripts dans le rapport).

Les noms, dates et chiffres des maquettes (Léo, Inès, Camille Tremblay, 7 novembre, 7/13…) sont des DONNÉES DE DÉMO : on reproduit la forme, jamais le contenu.

## Écrans et intention du designer

| Fichier | Intention |
|---|---|
| `Main.dc.html` | A · Bienvenue — Mascotte en médaillon, icône THRIVE en badge, trois promesses. Le bouton lance l’essai d’un mois. |
| `V1-B-Connexion.dc.html` | B · Connexion — Médaillon de la mascotte, liste inset grouped, clavier en verre, rappel de la double authentification. |
| `V1-C-Inscription-le-parent.dc.html` | C · Inscription · le parent — Étape 1 sur 2. Le bouton reste inactif tant que le mot de passe n’a pas 8 caractères. |
| `V1-D-Inscription-les-enfants.dc.html` | D · Inscription · les enfants — Âge par stepper (8–17), sport par menu d’actions en verre. |
| `V1-D2-Essai-gratuit-de-Maison.dc.html` | D2 · Essai gratuit de Maison — Le mois gratuit d’abord : « 0 $ par mois pendant 1 mois », la frise (aujourd’hui 0 $ → ra |
| `V1-D3-Confirmation-App-Store.dc.html` | D3 · Confirmation App Store — La feuille d’achat du système : essai à 0 $, puis 299 $ CA par an, confirmation au bouton  |
| `V1-F-Choisir-le-profil.dc.html` | F · Choisir le profil — Liste système avec coche ; l’abonnement Maison est partagé avec le co-parent. |
| `V1-K-Maison.dc.html` | K · Maison — La présentation d’origine (« Soir de famille »), en ambiance jour : l’affiche du soir dans son arche de lin |
| `V1-K2-Tout-le-parcours.dc.html` | K2 · Tout le parcours — Les 13 semaines et leurs 53 activités, chacune avec sa vignette. Faites, en cours, à venir. Écra |
| `V1-L-Fiche-moment.dc.html` | L · Fiche moment — Vignette en grand, durée 10/20/30, la phrase d’ouverture à copier, 4 étapes, niveau de preuve. |
| `V1-M-Moment-en-cours.dc.html` | M · Moment en cours — Plein écran sombre, mascotte, minuteur en anneau, commandes en verre. Arrêter compte quand même. |
| `V1-N-Le-carnet.dc.html` | N · Le carnet — Ce qu’on garde (avec la vignette de chaque activité), l’objet gagné, la collection. |
| `V1-G-Bilan.dc.html` | G · Bilan — Le passeport : grand titre au prénom, carte d’identité, 13 pastilles, jauges, travail du coach. |
| `V1-H-Competences-de-vie.dc.html` | H · Compétences de vie — Feuille en grand détent : courbe LSSS Départ → Mi-parcours, 8 compétences avec repère de départ |
| `V1-I-Comprendre-loutil.dc.html` | I · Comprendre l’outil — Feuille flottante en verre : ce que ça mesure, pourquoi, comment le lire. |
| `V1-J-Personnaliser.dc.html` | J · Personnaliser — Photo, surnom, numéro, poste, et les 6 couleurs du passeport. |
| `V1-E-Ton-espace-se-prepare.dc.html` | E · Ton espace se prépare — Après l’appel : fiche reçue, confirmée, ouverte par le coach. Le programme démarre 1 à 2 sem |
| `V1-S-Mes-seances.dc.html` | S · Mes séances — Anneau 7/13, séances par phase avec leur vignette : validée, prochaine, à venir. |
| `V1-T-Bilan-du-coach.dc.html` | T · Bilan du coach — Le message du coach, le bilan détaillé, les observations sur 5. |
| `V1-U-Messages.dc.html` | U · Messages — Le coach est l’onglet Prominent : un pouce pour lui écrire. |
| `V1-V-Notifications.dc.html` | V · Notifications — Groupées par jour, pastille non lue, chaque ligne mène au bon endroit. |
| `V1-Y-Offres.dc.html` | Y · Offres — Maison (32,50 $/mois ou 299 $/an, essai 1 mois), puis Groupe 600 $ (phare), Individuel 1 500 $, Complet 2 0 |
| `V1-Y2-Groupe-paiement.dc.html` | Y2 · Groupe · paiement — Moitié aujourd’hui (remboursable pendant la garantie), moitié à la séance 7. Paiement Stripe :  |
| `V1-Y3-Appel-de-15-min.dc.html` | Y3 · Appel de 15 min — Vidéo ou téléphone, jours et créneaux, ajout au calendrier. Rien n’est payé avant ; ensuite 1er v |
| `V1-X2-Mon-abonnement.dc.html` | X2 · Mon abonnement — Maison inclus avec le programme, puis l’option de continuer. |
| `V1-O-Bientot-disponible.dc.html` | O · Bientôt disponible — Mascotte avec la pellicule, « En construction », « Me prévenir », retour vers Maison. Séances à |
| `V1-P-Pret-avec-Leo.dc.html` | P · Prêt avec Léo ? — Aperçu, avec le bandeau « pas disponible ». |
| `V1-Q-Question-en-pause.dc.html` | Q · Question en pause — Aperçu : scène de la mascotte derrière la question, portrait dans la carte. |
| `V1-R-Apres-la-seance.dc.html` | R · Après la séance — Aperçu : célébration avec la mascotte, slider Liquid Glass, action de transfert. |
| `V1-W-Questionnaire-de-Leo.dc.html` | W · Questionnaire de Léo — Interface ambrée pour l’EPOCH, gros boutons 1–5, FR/EN, note de confidentialité. |
| `V1-X-Compte-famille.dc.html` | X · Compte & famille — Mon programme, abonnement Maison, offres, style de l’app (Natif · Nuit calme · Carnet), famille,  |
| `V1-Z-Fin-de-parcours.dc.html` | Z · Fin de parcours — Certificat partageable, Book THRIVE, courbe LSSS complète (+23), bien-être sur 13 séances. |
| `V2-A-Bienvenue.dc.html` | A · Bienvenue — La mascotte au centre des anneaux, accent soleil. |
| `V2-B-Connexion.dc.html` | B · Connexion — Médaillon de la mascotte, liste inset grouped, clavier en verre, rappel de la double authentification. |
| `V2-C-Inscription-le-parent.dc.html` | C · Inscription · le parent — Étape 1 sur 2. Le bouton reste inactif tant que le mot de passe n’a pas 8 caractères. |
| `V2-D-Inscription-les-enfants.dc.html` | D · Inscription · les enfants — Âge par stepper (8–17), sport par menu d’actions en verre. |
| `V2-D2-Essai-gratuit-de-Maison.dc.html` | D2 · Essai gratuit de Maison — Le mois gratuit d’abord : « 0 $ par mois pendant 1 mois », la frise (aujourd’hui 0 $ → ra |
| `V2-D3-Confirmation-App-Store.dc.html` | D3 · Confirmation App Store — La feuille d’achat du système : essai à 0 $, puis 299 $ CA par an, confirmation au bouton  |
| `V2-F-Choisir-le-profil.dc.html` | F · Choisir le profil — Grands avatars plein écran, comme les profils de l’app TV. |
| `V2-K-Maison.dc.html` | K · Maison — La même présentation en ambiance nuit (marine), avec l’essai gratuit en haut et l’invitation discrète vers  |
| `V2-K2-Tout-le-parcours.dc.html` | K2 · Tout le parcours — Les 13 semaines et leurs 53 activités, chacune avec sa vignette. Faites, en cours, à venir. Écra |
| `V2-L-Fiche-moment.dc.html` | L · Fiche moment — Vignette en grand, durée 10/20/30, la phrase d’ouverture à copier, 4 étapes, niveau de preuve. |
| `V2-M-Moment-en-cours.dc.html` | M · Moment en cours — Plein écran sombre, mascotte, minuteur en anneau, commandes en verre. Arrêter compte quand même. |
| `V2-N-Le-carnet.dc.html` | N · Le carnet — Ce qu’on garde (avec la vignette de chaque activité), l’objet gagné, la collection. |
| `V2-G-Bilan.dc.html` | G · Bilan — Onglet visible mais verrouillé : aperçu flouté + carte « s’ouvre avec un coach », garantie des 2 séances, ap |
| `V2-H-Competences-de-vie.dc.html` | H · Compétences de vie — Feuille en grand détent : courbe LSSS Départ → Mi-parcours, 8 compétences avec repère de départ |
| `V2-I-Comprendre-loutil.dc.html` | I · Comprendre l’outil — Feuille flottante en verre : ce que ça mesure, pourquoi, comment le lire. |
| `V2-J-Personnaliser.dc.html` | J · Personnaliser — Photo, surnom, numéro, poste, et les 6 couleurs du passeport. |
| `V2-E-Ton-espace-se-prepare.dc.html` | E · Ton espace se prépare — Après l’appel : fiche reçue, confirmée, ouverte par le coach. Le programme démarre 1 à 2 sem |
| `V2-S-Mes-seances.dc.html` | S · Mes séances — Onglet visible, verrouillé : aperçu flouté des 13 séances et invitation. |
| `V2-T-Bilan-du-coach.dc.html` | T · Bilan du coach — Le message du coach, le bilan détaillé, les observations sur 5. |
| `V2-U-Messages.dc.html` | U · Messages — Aperçu factice + invitation : la messagerie vient avec un programme. |
| `V2-V-Notifications.dc.html` | V · Notifications — Groupées par jour, pastille non lue, chaque ligne mène au bon endroit. |
| `V2-Y-Offres.dc.html` | Y · Offres — Maison (32,50 $/mois ou 299 $/an, essai 1 mois), puis Groupe 600 $ (phare), Individuel 1 500 $, Complet 2 0 |
| `V2-Y2-Groupe-paiement.dc.html` | Y2 · Groupe · paiement — Moitié aujourd’hui (remboursable pendant la garantie), moitié à la séance 7. Paiement Stripe :  |
| `V2-Y3-Appel-de-15-min.dc.html` | Y3 · Appel de 15 min — Vidéo ou téléphone, jours et créneaux, ajout au calendrier. Rien n’est payé avant ; ensuite 1er v |
| `V2-X2-Mon-abonnement.dc.html` | X2 · Mon abonnement — Essai jusqu’au 9 nov., renouvellement annuel, partage co-parent, Gérer dans l’App Store, Restaurer |
| `V2-O-Bientot-disponible.dc.html` | O · Bientôt disponible — Mascotte avec la pellicule, « En construction », « Me prévenir », retour vers Maison. Séances à |
| `V2-P-Pret-avec-Leo.dc.html` | P · Prêt avec Léo ? — Aperçu, avec le bandeau « pas disponible ». |
| `V2-Q-Question-en-pause.dc.html` | Q · Question en pause — Aperçu : scène de la mascotte derrière la question, portrait dans la carte. |
| `V2-R-Apres-la-seance.dc.html` | R · Après la séance — Aperçu : célébration avec la mascotte, slider Liquid Glass, action de transfert. |
| `V2-W-Questionnaire-de-Leo.dc.html` | W · Questionnaire de Léo — Interface ambrée pour l’EPOCH, gros boutons 1–5, FR/EN, note de confidentialité. |
| `V2-X-Compte-famille.dc.html` | X · Compte & famille — Mon programme, abonnement Maison, offres, style de l’app (Natif · Nuit calme · Carnet), famille,  |
| `V2-Z-Fin-de-parcours.dc.html` | Z · Fin de parcours — Certificat partageable, Book THRIVE, courbe LSSS complète (+23), bien-être sur 13 séances. |
| `V3-A-Bienvenue.dc.html` | A · Bienvenue — Couverture marine, mascotte en médaillon, titre Fraunces. |
| `V3-B-Connexion.dc.html` | B · Connexion — Médaillon de la mascotte, liste inset grouped, clavier en verre, rappel de la double authentification. |
| `V3-C-Inscription-le-parent.dc.html` | C · Inscription · le parent — Étape 1 sur 2. Le bouton reste inactif tant que le mot de passe n’a pas 8 caractères. |
| `V3-D-Inscription-les-enfants.dc.html` | D · Inscription · les enfants — Âge par stepper (8–17), sport par menu d’actions en verre. |
| `V3-D2-Essai-gratuit-de-Maison.dc.html` | D2 · Essai gratuit de Maison — Le mois gratuit d’abord : « 0 $ par mois pendant 1 mois », la frise (aujourd’hui 0 $ → ra |
| `V3-D3-Confirmation-App-Store.dc.html` | D3 · Confirmation App Store — La feuille d’achat du système : essai à 0 $, puis 299 $ CA par an, confirmation au bouton  |
| `V3-F-Choisir-le-profil.dc.html` | F · Choisir le profil — Cartes-maillots : le numéro devient la vignette. |
| `V3-K-Maison.dc.html` | K · Maison — La présentation d’origine en ambiance jour, sous les onglets Ce soir · Bilan · Mes séances. |
| `V3-K2-Tout-le-parcours.dc.html` | K2 · Tout le parcours — Les 13 semaines et leurs 53 activités, chacune avec sa vignette. Faites, en cours, à venir. Écra |
| `V3-L-Fiche-moment.dc.html` | L · Fiche moment — Vignette en grand, durée 10/20/30, la phrase d’ouverture à copier, 4 étapes, niveau de preuve. |
| `V3-M-Moment-en-cours.dc.html` | M · Moment en cours — Plein écran sombre, mascotte, minuteur en anneau, commandes en verre. Arrêter compte quand même. |
| `V3-N-Le-carnet.dc.html` | N · Le carnet — Ce qu’on garde (avec la vignette de chaque activité), l’objet gagné, la collection. |
| `V3-G-Bilan.dc.html` | G · Bilan — Le passeport devient un objet : carte couleur de l’enfant, numéro géant, objectif cité. |
| `V3-H-Competences-de-vie.dc.html` | H · Compétences de vie — Feuille en grand détent : courbe LSSS Départ → Mi-parcours, 8 compétences avec repère de départ |
| `V3-I-Comprendre-loutil.dc.html` | I · Comprendre l’outil — Feuille flottante en verre : ce que ça mesure, pourquoi, comment le lire. |
| `V3-J-Personnaliser.dc.html` | J · Personnaliser — Photo, surnom, numéro, poste, et les 6 couleurs du passeport. |
| `V3-E-Ton-espace-se-prepare.dc.html` | E · Ton espace se prépare — Après l’appel : fiche reçue, confirmée, ouverte par le coach. Le programme démarre 1 à 2 sem |
| `V3-S-Mes-seances.dc.html` | S · Mes séances — Anneau 7/13, séances par phase avec leur vignette. |
| `V3-T-Bilan-du-coach.dc.html` | T · Bilan du coach — Le message du coach, le bilan détaillé, les observations sur 5. |
| `V3-U-Messages.dc.html` | U · Messages — Fil poussé depuis le bilan, bulles crème. |
| `V3-V-Notifications.dc.html` | V · Notifications — Groupées par jour, pastille non lue, chaque ligne mène au bon endroit. |
| `V3-Y-Offres.dc.html` | Y · Offres — Maison (32,50 $/mois ou 299 $/an, essai 1 mois), puis Groupe 600 $ (phare), Individuel 1 500 $, Complet 2 0 |
| `V3-Y2-Groupe-paiement.dc.html` | Y2 · Groupe · paiement — Moitié aujourd’hui (remboursable pendant la garantie), moitié à la séance 7. Paiement Stripe :  |
| `V3-Y3-Appel-de-15-min.dc.html` | Y3 · Appel de 15 min — Vidéo ou téléphone, jours et créneaux, ajout au calendrier. Rien n’est payé avant ; ensuite 1er v |
| `V3-X2-Mon-abonnement.dc.html` | X2 · Mon abonnement — Maison inclus avec le programme, puis l’option de continuer. |
| `V3-O-Bientot-disponible.dc.html` | O · Bientôt disponible — Mascotte avec la pellicule, « En construction », « Me prévenir », retour vers Maison. Séances à |
| `V3-P-Pret-avec-Leo.dc.html` | P · Prêt avec Léo ? — Aperçu, avec le bandeau « pas disponible ». |
| `V3-Q-Question-en-pause.dc.html` | Q · Question en pause — Aperçu : scène de la mascotte derrière la question, portrait dans la carte. |
| `V3-R-Apres-la-seance.dc.html` | R · Après la séance — Aperçu : célébration avec la mascotte, slider Liquid Glass, action de transfert. |
| `V3-W-Questionnaire-de-Leo.dc.html` | W · Questionnaire de Léo — Interface ambrée pour l’EPOCH, gros boutons 1–5, FR/EN, note de confidentialité. |
| `V3-X-Compte-famille.dc.html` | X · Compte & famille — Mon programme, abonnement Maison, offres, style de l’app (Natif · Nuit calme · Carnet), famille,  |
| `V3-Z-Fin-de-parcours.dc.html` | Z · Fin de parcours — Certificat partageable, Book THRIVE, courbe LSSS complète (+23), bien-être sur 13 séances. |
