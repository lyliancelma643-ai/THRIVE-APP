# CAHIER DES CHARGES — EXPÉRIENCE CLIENT THRIVE

**Le parcours vécu par la famille, de A à Z**

> Document de référence produit, établi le 18 juillet 2026 à partir du code source de l'application en production.
> Périmètre : **exclusivement la partie client** — ce que vivent le parent et le jeune athlète. Les espaces Coach et Admin ne sont décrits que lorsqu'ils produisent quelque chose de visible côté client.
> Chaque élément décrit ici **existe et fonctionne** dans l'application. Les éléments non livrés sont explicitement signalés « à venir ».
> Destination : servir de base à la refonte de la présentation du site vitrine.

---

## Table des matières

**PARTIE I — LE PRODUIT**
1. [Le produit en une page](#1-le-produit-en-une-page)
2. [À qui ça s'adresse](#2-à-qui-ça-sadresse)
3. [Le protocole THRIVE](#3-le-protocole-thrive)
4. [Les 4 piliers de l'expérience client](#4-les-4-piliers-de-lexpérience-client)

**PARTIE II — LE PARCOURS CLIENT DE A À Z**
5. [Vue d'ensemble du parcours](#5-vue-densemble-du-parcours)
6. [Étape 1 — Inscription](#6-étape-1--inscription)
7. [Étape 2 — Activation du compte](#7-étape-2--activation-du-compte)
8. [Étape 3 — Le Passeport athlète](#8-étape-3--le-passeport-athlète)
9. [Étape 4 — Les séances vidéo 20 minutes](#9-étape-4--les-séances-vidéo-20-minutes)
10. [Étape 5 — La séance 1:1 avec le coach](#10-étape-5--la-séance-11-avec-le-coach)
11. [Étape 6 — Le bilan de séance](#11-étape-6--le-bilan-de-séance)
12. [Étape 7 — Les questionnaires de l'enfant](#12-étape-7--les-questionnaires-de-lenfant)
13. [Étape 8 — La messagerie avec le coach](#13-étape-8--la-messagerie-avec-le-coach)
14. [Étape 9 — Fin de parcours & certificat](#14-étape-9--fin-de-parcours--certificat)

**PARTIE III — LE CADRE**
15. [Gestion de la famille & du compte](#15-gestion-de-la-famille--du-compte)
16. [Les 3 forfaits](#16-les-3-forfaits)
17. [Notifications & temps réel](#17-notifications--temps-réel)
18. [Application installable (PWA) & hors-ligne](#18-application-installable-pwa--hors-ligne)
19. [Confidentialité, sécurité & conformité](#19-confidentialité-sécurité--conformité)

**PARTIE IV — POUR LE SITE WEB**
20. [Messages clés & arguments de vente](#20-messages-clés--arguments-de-vente)
21. [Garde-fous : ce qu'on peut promettre](#21-garde-fous--ce-quon-peut-promettre)
22. [FAQ client](#22-faq-client)
23. [Glossaire](#23-glossaire)

---
---

# PARTIE I — LE PRODUIT

## 1. Le produit en une page

### 1.1 La proposition

THRIVE est un **parcours psychoéducatif par le sport** pour les jeunes de **8 à 17 ans**, structuré en **13 séances individuelles** avec un coach certifié, et prolongé à la maison par une **application** qui rend la progression du jeune **visible, mesurable et partagée avec ses parents**.

Le sport est le véhicule. La destination, ce sont les **compétences de vie** : confiance, gestion des émotions, fixation d'objectifs, communication, leadership, gestion du stress, concentration.

### 1.2 Ce qui rend le produit singulier

| | |
|---|---|
| **Un accompagnement humain, pas une app de plus** | Un coach certifié, 13 séances en 1:1. L'application ne remplace jamais le coach — elle prolonge son travail entre les séances et le rend lisible. |
| **La progression devient visible** | Le parent ne reçoit pas « un compte-rendu ». Il ouvre un **Passeport athlète** vivant qui se remplit séance après séance : jauges, courbes, objectifs, documents. |
| **Des instruments scientifiques validés** | La mesure repose sur deux échelles publiées et reconnues — **LSSS** (compétences de vie dans le sport) et **EPOCH** (bien-être de l'adolescent). Aucun questionnaire « maison ». |
| **Le parent devient acteur** | Les séances vidéo de 20 minutes se vivent **avec** l'enfant, pas à sa place. Chaque séance se termine par une action de transfert à la maison. |
| **Le jeune reste un enfant** | Aucun compte, aucun mot de passe, aucun réseau social. Il répond à ses questionnaires par un lien unique, dans une interface conçue pour lui. |
| **Données hébergées au Canada** | Hébergement en région canadienne, conforme à la **Loi 25** du Québec. |

### 1.3 La promesse client, en une phrase

> **« Vous ne saurez plus seulement si votre jeune "a aimé sa séance". Vous verrez exactement ce qui progresse en lui, séance après séance. »**

---

## 2. À qui ça s'adresse

### 2.1 Le client payeur : le parent

Ce qu'il achète réellement :
- **De la clarté** — savoir ce que son enfant travaille, et où il en est.
- **Un lien** — un moment structuré de 20 minutes avec son enfant, sur un sujet qui n'est ni l'école ni les résultats sportifs.
- **Une trace** — un passeport, des courbes, un certificat : la preuve tangible d'un parcours accompli.

### 2.2 Le bénéficiaire : le jeune athlète, 8 à 17 ans

L'application s'adapte à son âge : **trois tranches — 8-11, 12-14, 15-17** — avec des contenus vidéo, des scripts de séance et des grilles d'observation **distincts pour chaque tranche**. Ce n'est pas le même contenu redimensionné : ce sont **39 séances** (13 séances × 3 tranches d'âge).

L'âge est validé strictement à l'inscription (8 à 17 ans).

### 2.3 Les sports couverts

Le sport pratiqué est déclaré à l'inscription (13 options au catalogue). Le protocole est **transversal** : il ne dépend pas de la discipline. C'est le coach qui l'ancre dans le sport du jeune.

### 2.4 La famille, pas juste un parent

Un compte THRIVE est un **compte famille** : plusieurs enfants et plusieurs parents peuvent y être rattachés (selon le forfait). Le second parent reçoit sa propre invitation et son propre accès.

---

## 3. Le protocole THRIVE

### 3.1 Structure : 13 séances, 3 phases

| Phase | Séances | Intention |
|---|---|---|
| **Phase 1 — Ancrer** | Séances 1 à 2 | Poser les bases : qui est ce jeune, d'où il part, ce qu'il veut. |
| **Phase 2 — Développer** | Séances 3 à 10 | Le cœur du travail : compétence par compétence, thème par thème. |
| **Phase 3 — Intégrer** | Séances 11 à 13 | Transférer les acquis hors du terrain, consolider, célébrer. |

### 3.2 Les thèmes travaillés

Identité · Objectifs · Confiance · Émotions · Gestion du stress · Connexion · Concentration · Préparation mentale · Leadership · Transfert · Bilan.

Chaque séance porte **un thème** et **une compétence de vie** (life skill) explicitement identifiée.

### 3.3 La double boucle

Le parcours fonctionne sur deux boucles complémentaires :

```
   BOUCLE COACH                          BOUCLE FAMILLE
   ─────────────                         ──────────────
   Séance 1:1 avec le jeune       →      Séance vidéo 20 min parent + enfant
   Fiche de séance minutée               Moments interactifs (questions)
   Observations cotées                   Action de transfert à la maison
            ↓                                      ↓
        Bilan envoyé au parent  ←─────→  Passeport athlète mis à jour
```

Les deux boucles convergent vers **un seul endroit** : le Passeport athlète, que le parent consulte quand il veut.

### 3.4 La cadence de mesure

| Instrument | Ce qu'il mesure | Quand |
|---|---|---|
| **LSSS** — Life Skills Scale for Sport | 8 compétences de vie (43 items) | **3 fois** : Départ (S1) · Mi-parcours (S7) · Bilan final (S13) |
| **EPOCH** — bien-être de l'adolescent | 5 dimensions du bien-être (20 items) | **À chaque séance** (prise de pouls) |

Cette double cadence donne au parent **deux lectures différentes** : une courbe longue qui montre l'évolution de fond des compétences, et une courbe fine qui montre le climat intérieur séance après séance.

---

## 4. Les 4 piliers de l'expérience client

Toute la présentation commerciale peut s'articuler autour de ces quatre piliers. Ce sont, littéralement, les quatre choses que le parent utilise.

### Pilier 1 — Le Passeport athlète
La carte d'identité vivante du jeune. Photo, surnom, numéro de maillot, couleur, sport, club, coach. Puis : jauges de compétences, courbes de progression, objectifs, boîte à outils, prochaines étapes, documents. **C'est l'écran d'accueil et la pièce maîtresse.**

### Pilier 2 — Les séances vidéo 20 minutes
Un parcours vidéo de 13 séances adapté à l'âge, à vivre **à deux**, avec des moments interactifs où la vidéo se met en pause et pose une question au jeune.

### Pilier 3 — Les bilans de séance
Après chaque séance 1:1, le coach envoie un bilan. Selon le forfait : un message, un bilan détaillé structuré, et des observations chiffrées sur 5.

### Pilier 4 — La mesure scientifique
Les questionnaires LSSS et EPOCH remplis par le jeune, transformés en jauges et en courbes lisibles par le parent.

---
---

# PARTIE II — LE PARCOURS CLIENT DE A À Z

## 5. Vue d'ensemble du parcours

```
1. INSCRIPTION           Le parent crée son compte et déclare ses enfants — 2 minutes, accès immédiat
        ↓
2. ACTIVATION            L'équipe confirme la fiche enfant, le coach valide l'accès
        ↓
3. PASSEPORT             Le parent personnalise le passeport de son enfant
        ↓
4. QUESTIONNAIRE LSSS    Le jeune répond au questionnaire de départ (S1) — la ligne de base
        ↓
   ┌────────────────────────────────────────────────────────┐
   │  BOUCLE RÉPÉTÉE 13 FOIS                                │
   │                                                        │
   │  5. Séance 1:1 avec le coach                           │
   │  6. Bilan envoyé au parent → notification              │
   │  7. Questionnaire EPOCH (prise de pouls)               │
   │  8. Séance vidéo 20 min parent + enfant                │
   │  9. Action de transfert à la maison                    │
   │                                                        │
   │  → Le Passeport se met à jour en direct                │
   └────────────────────────────────────────────────────────┘
        ↓ (S7 : questionnaire LSSS mi-parcours)
        ↓
10. BILAN FINAL          Questionnaire LSSS final (S13) — la courbe se referme
        ↓
11. CERTIFICAT           Documents du parcours + certificat THRIVE téléchargeables
```

---

## 6. Étape 1 — Inscription

### 6.1 Ce que vit le parent

Une inscription **sans friction, style Netflix** : le compte est actif immédiatement, **sans email de validation à aller chercher**.

Le formulaire demande :
1. Prénom, nom, email, mot de passe (8 caractères minimum) ;
2. **Les enfants, dès l'inscription** — lignes ajoutables : prénom, âge (8-17, validé strictement), sport (13 options).

À la validation : le compte est créé, la session ouverte, la famille et les fiches enfants enregistrées. Le parent arrive **directement dans son espace**.

### 6.2 Points de robustesse (à ne pas mettre sur le site, mais à connaître)

- Si la création des fiches enfants échoue pour une raison technique, **le parent entre quand même dans l'app** et pourra ajouter ses enfants ensuite. Aucun cul-de-sac.
- Mot de passe oublié : lien de réinitialisation, message volontairement neutre (on ne révèle jamais si une adresse existe).

### 6.3 Argument site web

> « Créez votre compte en 2 minutes. Pas d'email de confirmation, pas d'attente : vous êtes dans votre espace immédiatement. »

---

## 7. Étape 2 — Activation du compte

### 7.1 Le principe

THRIVE n'est pas un abonnement en libre-service : c'est un accompagnement humain. Le compte suit donc un **cycle d'activation en 3 temps** :

```
Inscription du parent + fiche enfant   →   statut « en attente »
        ↓
Confirmation de la fiche par l'équipe THRIVE
        ↓
Validation de l'accès par le coach attribué
        ↓
Accès complet
```

### 7.2 Ce que voit le parent pendant l'attente

C'est un moment de vérité en termes d'expérience, et il a été soigné :

- Le parent voit **son espace réel, en aperçu grisé** — les titres sont lisibles, les cartes sont là, mais le contenu n'est pas cliquable. Il comprend ce qui l'attend.
- Une bannière premium annonce : **« Votre espace se prépare »**, avec un ton d'accompagnement humain, jamais technique.
- **L'onglet Bilan reste accessible** : le parent n'est jamais enfermé dans un écran mort.

### 7.3 Argument site web

> « Votre espace n'est pas ouvert par un algorithme. Il est ouvert par votre coach, une fois qu'il a pris connaissance du dossier de votre enfant. »

---

## 8. Étape 3 — Le Passeport athlète

**C'est la pièce maîtresse du produit et l'écran d'accueil du parent.**

### 8.1 Ce que c'est

Une **carte d'identité d'athlète** immersive, plein écran, animée — jauges qui se remplissent, courbes qui se dessinent, halos qui respirent. Rien à voir avec un tableau de bord. L'intention visuelle est celle d'un objet de fierté, à montrer à l'enfant.

### 8.2 Ce qu'elle contient

**L'en-tête — l'identité**
Photo de profil · Prénom et nom · **Surnom** · **Numéro de maillot** · **Couleur d'accent** · Âge · Sport · Poste · Club · Coach attribué · Force n°1.

**La progression**
- Pourcentage d'avancement du parcours (séances complétées sur 13, ou ajustement manuel du coach) ;
- Le **chemin des 13 séances**, avec le statut de chaque étape.

**La mesure**
- **Jauge « compétences de vie »** : score global sur 100 + évolution depuis le départ ; détail par compétence *(selon forfait)* ;
- **Courbe LSSS longitudinale** : les 3 points Départ / Mi-parcours / Final *(selon forfait)* ;
- **Courbe de bien-être EPOCH** : un point par séance, 5 dimensions détaillées.

**Le travail du coach, rendu visible**
- **Objectif SMART** et **objectif compétence de vie** ;
- **Mes actions** · **Rêve de saison** · **Histoire sportive** · **Forces** ;
- **Boîte à outils** : jusqu'à 6 outils personnels, chacun avec son contexte d'usage ;
- **Focus word** — le mot d'ancrage du jeune ;
- **Prochaines étapes** : le plan d'action rédigé par le coach (à faire / en cours / fait, avec échéances) ;
- **Dernière émotion relevée** *(roue des émotions, selon forfait)*.

**Les documents**
Contrat de confiance · Lettre à moi-même · **Certificat THRIVE**. Téléchargeables lorsque le coach les rend disponibles.

### 8.3 Ce que le parent peut faire dessus

| Action | Résultat |
|---|---|
| **Toucher une carte** | Une fiche détaillée plein écran s'ouvre avec les données de l'enfant en grand |
| **Toucher la flèche d'une fiche** | Une **fiche d'explication pédagogique** s'ouvre : ce que mesure cet outil, pourquoi il compte, comment le lire |
| **Toucher le bouton d'édition** | La **personnalisation du passeport** s'ouvre : photo, surnom, numéro de maillot, couleur (6 préréglages : Soleil, Ambre, Sauge, Ciel, Corail, Violet) |

> **Le détail qui compte :** chaque outil du passeport est accompagné d'une explication pédagogique accessible en un geste. Le parent n'a jamais à deviner ce qu'il regarde.

### 8.4 Temps réel

Le passeport se met à jour **sans rechargement**. Le coach enregistre une observation, envoie un bilan, ajoute un document : le parent le voit apparaître, même s'il a l'écran ouvert.

### 8.5 Argument site web

> « Un passeport d'athlète que votre enfant a envie de montrer. Sa photo, son numéro, ses couleurs — et derrière, tout ce qu'il a construit. »

---

## 9. Étape 4 — Les séances vidéo 20 minutes

### 9.1 La bibliothèque

L'onglet **Fitness** est conçu comme une plateforme de streaming :

- **Bannière d'accueil (~50 % de l'écran)** : la **prochaine séance** du parcours de l'enfant, grand numéro en filigrane, bouton **« ▶ Lancer la séance »**.
- **Le parcours 20 minutes**, filtré automatiquement sur la **tranche d'âge de l'enfant** : progression X/13, rangées organisées par phase avec sous-titres pédagogiques.
- **La bibliothèque complète** : les **39 séances** (13 × 3 tranches d'âge), avec filtres par âge, phase et thème.

### 9.2 La séance elle-même

**Avant :** une page de présentation — thème, phase, titre, description, durée, compétence de vie travaillée, nombre d'interactions. Puis un écran **« Prêt avec {prénom de l'enfant} ? »**. Le vocabulaire dit tout : cette séance se vit **à deux**.

**Pendant :** la vidéo se lance. Aux moments définis, elle **se met en pause d'elle-même** et affiche une **question à choix multiple** en plein écran. Le jeune répond. Un retour positif s'affiche, puis la vidéo reprend automatiquement.

**Après :**
1. **Le RPE** — « C'était difficile aujourd'hui ? », de 0 à 10 ;
2. **Un écran de célébration** ;
3. **Une suggestion de transfert à la maison**, directement liée à la compétence travaillée dans la séance.

### 9.3 Rien ne se perd

La progression est enregistrée en continu (toutes les 10 secondes, et immédiatement si la page est quittée). Réponses, RPE, temps de visionnage, complétion : tout est conservé. Si une synchronisation échoue, un bandeau discret le signale et la reprise se fait automatiquement.

### 9.4 Argument site web

> « 20 minutes, une fois par séance, avec votre enfant. La vidéo s'arrête, pose une question, écoute la réponse — et vous laisse avec une action concrète à faire ensemble à la maison. »

**Note produit importante :** l'onglet Fitness est piloté par un interrupteur côté serveur. Il peut être affiché en « en construction » à l'échelle de la plateforme. À vérifier avant toute communication commerciale sur ce pilier.

---

## 10. Étape 5 — La séance 1:1 avec le coach

Cette étape se déroule hors application côté client, mais elle est **la source de tout ce que le parent verra**. Il est utile de savoir la décrire sur le site.

### 10.1 Ce que fait le coach, côté outil

- Il travaille sur une **fiche de séance interactive minutée**, générée depuis les documents officiels de la méthode — **39 scripts** distincts (13 séances × 3 tranches d'âge).
- Un **chronomètre de séance** met en évidence le bloc en cours (accueil, exercice, clôture…).
- La fiche contient les **verbatims de la méthode**, les points de vigilance, les checklists, et une **grille d'observation** avec des indicateurs cotés de 1 à 5 — **indicateurs propres à chaque séance et à chaque tranche d'âge**.
- Il rédige le **message de bilan aux parents**, pré-rempli depuis le gabarit officiel avec le prénom de l'enfant et son propre nom, qu'il personnalise.

### 10.2 Pourquoi ça compte pour le client

C'est la garantie que **la séance 12 d'un jeune de 9 ans à Montréal et celle d'un jeune de 16 ans à Québec suivent le même protocole**, avec la même exigence, sans dépendre de la mémoire ou du style du coach.

### 10.3 Argument site web

> « Chaque séance suit un script officiel, minuté, avec sa propre grille d'observation. Votre coach n'improvise pas : il applique une méthode — et il l'adapte à votre enfant. »

---

## 11. Étape 6 — Le bilan de séance

### 11.1 L'onglet « Mes séances »

Le parent y voit **les 13 séances du protocole**, réparties en 3 phases, avec une jauge de progression X/13.

Une séance reste **grisée** tant que le coach ne l'a pas validée. Puis elle **s'éclaire en direct** — badge « Validée par le coach », date. Le parent n'a rien à rafraîchir : la séance s'allume sous ses yeux.

### 11.2 Le bilan, en 3 niveaux

En touchant une séance validée, le parent ouvre son bilan (en dessous sur mobile, en panneau latéral sur ordinateur) :

| Niveau | Contenu | Disponibilité |
|---|---|---|
| **1. Le message du coach** | Un mot écrit à la main par le coach, sur ce qui s'est passé | **Tous les forfaits** |
| **2. Le bilan détaillé** | Compte-rendu structuré : ce qui a été travaillé, ce qui a été observé, ce qui vient ensuite | Performance : **toutes les séances** · Avancé : **séances 3, 7 et 13** · Essentiel : verrouillé |
| **3. Les observations chiffrées** | Grille de jauges circulaires sur 5, avec échelle de couleur, sur les indicateurs officiels de la séance | Selon forfait |

**Règle d'honnêteté produit :** quand un contenu n'est pas inclus dans le forfait, le parent voit **la structure** (les libellés, les anneaux vides) mais **jamais la donnée réelle floutée**. Ce qui est masqué n'est tout simplement **pas transmis** à son appareil. Le flou porte sur un contenu factice.

### 11.3 Argument site web

> « Après chaque séance, vous recevez un bilan. Pas un "tout s'est bien passé" — le thème travaillé, ce que le coach a observé, et ce sur quoi votre enfant va avancer. »

---

## 12. Étape 7 — Les questionnaires de l'enfant

### 12.1 Le principe : pas de compte pour l'enfant

Le jeune **n'a pas de compte, pas de mot de passe, pas de profil**. Quand le coach envoie un questionnaire, le parent reçoit une notification avec un **lien unique**. Il ouvre le lien, tend l'appareil à son enfant.

C'est une décision produit forte, et un excellent argument auprès des parents.

### 12.2 L'expérience du jeune

- Une page **conçue pour lui** : fond turquoise pour le LSSS, ambré chaud pour l'EPOCH.
- **« Salut {prénom} 👋 »**, puis une consigne rassurante : **« il n'y a pas de bonne ou de mauvaise réponse »**.
- Une barre de progression toujours visible (X réponses sur N).
- Des questions groupées par thème, une échelle de 1 à 5 en **gros boutons tactiles avec libellés**.
- Le bouton d'envoi ne s'active que lorsque tout est répondu.
- Une note de confidentialité claire : **« Tes réponses sont partagées avec ton coach. »**
- **Bilingue français / anglais.**

### 12.3 Les deux instruments

| | **LSSS** | **EPOCH** |
|---|---|---|
| Nom complet | Life Skills Scale for Sport | EPOCH Measure of Adolescent Well-Being |
| Référence | Cronin & Allen, 2017 | Kern et al., 2016 |
| Ce que ça mesure | **8 compétences de vie** : travail d'équipe, fixation d'objectifs, habiletés sociales, résolution de problèmes, habiletés émotionnelles, leadership, gestion du temps, communication | **5 dimensions du bien-être** : engagement, persévérance, optimisme, connexion aux autres, bonheur |
| Nombre d'items | **43 items officiels** | **20 items officiels** |
| Échelle | Accord, 1 à 5 (Pas du tout → Tout à fait) | Fréquence, 1 à 5 (Presque jamais → Presque toujours) |
| Cadence | 3 fois : Départ · Mi-parcours · Final | À chaque séance |
| Ce que ça alimente | Jauge de compétences + courbe longitudinale | Courbe de bien-être du passeport |

**Point de crédibilité majeur :** ce sont les **items officiels intégraux** des échelles publiées. Pas d'adaptation maison, pas de version raccourcie.

### 12.4 Un questionnaire, une seule fois

Un même questionnaire ne peut jamais être envoyé deux fois pour la même séance ou le même moment. Aucun risque de doublon, de relance intempestive ou de notification en double.

### 12.5 Argument site web

> « Votre enfant n'a pas de compte à créer, pas de mot de passe à retenir, pas de profil à gérer. Il répond à ses questionnaires par un lien que vous lui tendez — dans une interface pensée pour son âge. »

---

## 13. Étape 8 — La messagerie avec le coach

- Un fil de discussion **direct avec le coach attribué à l'enfant**.
- Bulles horodatées, **réception en temps réel**, défilement automatique.
- **Exclusif au forfait Performance.**

Sur les autres forfaits, le parent voit à quoi ressemblerait la messagerie (sur un contenu factice) et une invitation à passer au forfait supérieur. **Aucun message réel n'est transmis.**

> **Note importante :** si un parent passe d'un forfait supérieur à un forfait inférieur, **il conserve la lecture de son historique**. Seul l'envoi de nouveaux messages est bloqué.

---

## 14. Étape 9 — Fin de parcours & certificat

À l'issue des 13 séances, le parent dispose dans le passeport :

- **La courbe LSSS complète** : les trois points Départ → Mi-parcours → Final, avec le delta global ;
- **La courbe de bien-être EPOCH** sur les 13 séances ;
- **Les documents du parcours** : contrat de confiance, lettre à moi-même ;
- **Le certificat THRIVE**, rendu disponible par le coach.

Tous les documents s'ouvrent par un lien sécurisé à durée limitée.

> **À venir (ne pas communiquer) :** une synthèse de fin de parcours générée par IA est prévue au catalogue mais **n'est pas active**. Aucune intelligence artificielle n'intervient aujourd'hui dans le produit.

---
---

# PARTIE III — LE CADRE

## 15. Gestion de la famille & du compte

### 15.1 Plusieurs enfants, plusieurs parents

- **Sélecteur d'enfant** en haut de l'écran : le parent bascule d'un profil à l'autre, et toute l'application suit (passeport, séances, bilans, messages). Le choix est mémorisé.
- **Ajouter un enfant** : prénom, nom, âge, genre, sport, notes. La fiche part en confirmation chez l'équipe THRIVE.
- **Ajouter un co-parent** : il reçoit automatiquement un email **« définissez votre mot de passe »** et obtient son propre accès. La session du parent en cours n'est pas interrompue.
- **Les quotas dépendent du forfait.** Si le quota est atteint, un écran dédié l'explique et propose de voir les forfaits.

### 15.2 Mon compte

Modification du prénom et du nom · Consultation de l'email et du type de compte · **Activation des notifications push** · Déconnexion.

Le changement d'email et de mot de passe passe par le coach ou l'équipe — **choix produit assumé**, cohérent avec un accompagnement encadré impliquant des mineurs.

---

## 16. Les 3 forfaits

**Paiement unique en dollars canadiens, pour le parcours complet de 13 séances.**

| | **ESSENTIEL**<br>1 700 $ | **AVANCÉ**<br>2 000 $ | **PERFORMANCE**<br>2 500 $ |
|---|:---:|:---:|:---:|
| *Positionnement* | Le parcours THRIVE complet avec votre coach | Comprenez la progression, aux moments clés | L'accompagnement le plus profond et personnalisé |
| **Coach 1:1 — 13 séances** | ✓ | ✓ | ✓ |
| **Bibliothèque vidéo 20 min** | ✓ | ✓ | ✓ |
| **Passeport athlète** | ✓ | ✓ | ✓ |
| **Message du coach à chaque séance** | ✓ | ✓ | ✓ |
| **Jauge globale de compétences** | ✓ | ✓ | ✓ |
| **Certificat THRIVE** | ✓ | ✓ | ✓ |
| Bilan détaillé + observations chiffrées | — | Séances 3 · 7 · 13 | **Toutes les séances** |
| Jauge par compétence + évolution | — | ✓ | ✓ |
| Courbe LSSS longitudinale | — | ✓ | ✓ |
| Roue des émotions | — | ✓ | ✓ |
| Journal de progression | — | ✓ | ✓ |
| Lettre personnalisée du coach | — | ✓ | ✓ |
| **Messagerie directe avec le coach** | — | — | ✓ |
| Export CSV / PDF · gabarits premium | — | — | ✓ |
| **Profils enfants / comptes parents** | 1 / 1 | 2 / 2 | **Illimité** |
| **Historique conservé** | 3 mois | 12 mois | **Illimité** |
| **Stockage de documents** | 100 Mo | 500 Mo | 2 000 Mo |

### 16.1 Le changement de forfait

- Une page de comparaison dédiée dans l'application, avec le forfait actuel mis en évidence.
- Le changement **s'applique immédiatement à toute la famille**, et **les bilans passés sont régénérés à la profondeur du nouveau forfait**. Le parent ne perd pas l'historique : il le débloque.

### 16.2 État du paiement en ligne

La chaîne de paiement (Stripe Checkout) est **développée, déployée et testée**, mais les **clés de production ne sont pas encore posées**. En attendant, l'application invite proprement le parent à contacter son coach pour changer de forfait.

**→ À aligner avec le site web avant lancement commercial.**

---

## 17. Notifications & temps réel

### 17.1 Ce que reçoit le parent

- **Une cloche de notifications** dans l'en-tête de l'application ;
- **Des notifications push** sur son téléphone (activables depuis « Mon compte ») ;
- Chaque notification est **cliquable et mène exactement au bon endroit** : la bonne page, la bonne carte, mise en évidence à l'arrivée.

### 17.2 Ce qui déclenche une notification

Nouveau bilan de séance · Questionnaire à faire remplir par l'enfant · Nouveau message du coach · Nouveau document disponible.

### 17.3 Le temps réel, partout

L'application est connectée en continu. Une action du coach apparaît chez le parent **sans rechargement** : séance validée, bilan envoyé, document ajouté, changement de forfait.

> **Argument site :** « Votre coach valide la séance : elle s'allume dans votre application. Pas demain, pas au prochain rafraîchissement — tout de suite. »

---

## 18. Application installable (PWA) & hors-ligne

- **Installable sur l'écran d'accueil**, iPhone comme Android — sans passer par un store.
- **Conçue mobile d'abord** : environ 80 % de l'usage est mobile. Barre d'onglets basse façon application native, gestion des encoches iOS, lisible dès les petits écrans.
- **Notifications push** natives.
- **Page hors-ligne** propre en cas de perte de réseau.

> **Argument site :** « Installez THRIVE sur l'écran d'accueil de votre téléphone. Ça s'ouvre comme une application — parce que c'en est une. »

**Note :** une application mobile native (Expo) existe à l'état de prototype. **Elle n'est pas déployée.** Le produit livré est l'application web installable. Ne rien promettre sur les stores.

---

## 19. Confidentialité, sécurité & conformité

Un chapitre à traiter frontalement sur le site : le client confie des données sur son enfant mineur.

### 19.1 Hébergement et conformité

- **Données hébergées au Canada** (région `ca-central-1`).
- Architecture conçue pour la conformité à la **Loi 25** du Québec.

### 19.2 Protection des données

- **L'autorisation est appliquée par la base de données, pas par l'interface.** Une donnée à laquelle un utilisateur n'a pas droit ne quitte jamais le serveur. C'est aussi ce qui garantit que les limites de forfait ne sont pas contournables.
- **Documents et photos dans un stockage privé** : chaque ouverture passe par un lien signé à durée limitée (120 secondes). Aucune URL permanente ne circule.
- **Double authentification (TOTP)** disponible sur les comptes, avec application d'authentification.
- **Aucune donnée de l'enfant n'est publique.** L'enfant n'a ni compte, ni profil, ni présence publique.

### 19.3 Argument site web

> « Les données de votre enfant sont hébergées au Canada et protégées au niveau de la base de données elle-même — pas seulement par ce que l'écran affiche. »

---
---

# PARTIE IV — POUR LE SITE WEB

## 20. Messages clés & arguments de vente

### 20.1 Accroche principale (3 options)

1. **« Le sport développe bien plus que des athlètes. Encore faut-il pouvoir le voir. »**
2. **« 13 séances avec un coach. Un passeport qui se remplit. Une progression que vous voyez enfin. »**
3. **« Votre enfant grandit dans son sport. THRIVE vous montre exactement comment. »**

### 20.2 Les 5 arguments à marteler

| # | Argument | Preuve dans le produit |
|---|---|---|
| **1** | **Un vrai coach, pas une app** | 13 séances 1:1, scripts officiels minutés, grilles d'observation par âge |
| **2** | **La progression devient visible** | Passeport athlète : jauges, courbes, objectifs, documents — mis à jour en direct |
| **3** | **De la science, pas des impressions** | LSSS (43 items) et EPOCH (20 items), échelles publiées, items officiels intégraux |
| **4** | **Le parent est acteur** | Séances vidéo 20 min à vivre à deux + action de transfert à la maison |
| **5** | **Conçu pour la famille, respectueux de l'enfant** | Aucun compte enfant, données au Canada, plusieurs enfants et parents par famille |

### 20.3 Objections et réponses

| Objection | Réponse |
|---|---|
| *« C'est cher. »* | C'est **13 séances individuelles avec un coach certifié**, pas un abonnement à une bibliothèque. Prix ramené à la séance, et paiement unique. |
| *« Mon enfant n'a pas besoin d'un psychologue. »* | Ce n'est pas de la thérapie. C'est de la **psychoéducation par le sport** : des compétences de vie, développées sur un terrain que l'enfant aime déjà. |
| *« Encore un écran. »* | 20 minutes par séance, **avec vous**. Et chaque séance se termine par une action à faire **loin de l'écran**. |
| *« Comment savoir si ça marche ? »* | Deux échelles scientifiques validées, mesurées au départ, à mi-parcours et à la fin. **Vous voyez la courbe.** |
| *« Est-ce que je vais devoir gérer un truc de plus ? »* | Non. Vous recevez une notification quand il y a quelque chose à faire. Le reste se remplit tout seul. |

### 20.4 Structure de page d'accueil recommandée

```
1. HÉRO              Accroche + visuel du Passeport athlète + CTA
2. LE PROBLÈME       « Vous savez si sa séance s'est bien passée. Vous ne savez pas
                       ce qui progresse en lui. »
3. LA MÉTHODE        13 séances, 3 phases, un coach — le schéma de la double boucle
4. LES 4 PILIERS     Passeport · Séances vidéo · Bilans · Mesure scientifique
                       (une capture d'écran par pilier)
5. LA PREUVE         LSSS + EPOCH, les références publiées, la courbe
6. LE PARCOURS       Le schéma A→Z de la §5, simplifié en 5 étapes
7. LES FORFAITS      Le tableau comparatif de la §16
8. CONFIANCE         Données au Canada, Loi 25, aucun compte enfant
9. FAQ               La §22
10. CTA FINAL
```

### 20.5 Ce qu'il faut absolument montrer en visuel

Par ordre d'impact commercial :
1. **Le Passeport athlète** — c'est le produit. Une capture, en grand, dès le héros.
2. **Un bilan de séance** avec ses jauges d'observation chiffrées.
3. **La courbe LSSS** Départ → Mi-parcours → Final.
4. **Un moment interactif** de séance vidéo (la question en plein écran).
5. **Le questionnaire enfant** — son design chaleureux rassure immédiatement les parents.

---

## 21. Garde-fous : ce qu'on peut promettre

À respecter strictement dans toute communication.

### ✅ On peut affirmer

- 13 séances individuelles avec un coach certifié ;
- 39 séances vidéo (13 × 3 tranches d'âge) de 20 minutes, avec moments interactifs ;
- Passeport athlète personnalisable, mis à jour en temps réel ;
- Mesure par LSSS (43 items officiels) et EPOCH (20 items officiels) ;
- Bilan du coach après chaque séance ;
- Application installable sur mobile, avec notifications ;
- Données hébergées au Canada, conformité Loi 25 ;
- Aucun compte requis pour l'enfant ;
- Messagerie directe avec le coach (forfait Performance).

### ⚠️ À vérifier avant de communiquer

- **L'onglet Fitness / bibliothèque vidéo** : piloté par un interrupteur serveur, potentiellement affiché « en construction ». Vérifier son état avant de l'afficher comme argument.
- **Le paiement en ligne** : la chaîne Stripe est prête mais les clés de production ne sont pas posées. Le site ne doit pas promettre un achat en ligne immédiat tant que ce n'est pas fait.
- **Le certificat THRIVE** : il est disponible **quand le coach le rend disponible**, pas automatiquement.

### ❌ Ne pas promettre

- **Aucune fonctionnalité d'intelligence artificielle.** La synthèse IA de fin de parcours est au catalogue mais n'est pas active. Aucun LLM n'intervient dans le produit.
- **Aucune application native sur l'App Store ou Google Play.** Le prototype mobile n'est pas déployé. Le produit est une application web installable.
- **Aucune promesse de résultat thérapeutique ou clinique.** THRIVE est psychoéducatif, pas thérapeutique.
- **Aucune promesse de performance sportive.** Le produit mesure des compétences de vie et du bien-être, pas des résultats sportifs.
- **Aucune promesse d'export PDF/CSV en libre-service** sans validation préalable de l'état de cette fonctionnalité.

---

## 22. FAQ client

**Mon enfant doit-il créer un compte ?**
Non. Il n'a ni compte, ni mot de passe, ni profil. Il répond à ses questionnaires par un lien que vous lui ouvrez.

**Combien de temps dure le parcours ?**
13 séances individuelles avec le coach, prolongées par 13 séances vidéo de 20 minutes à vivre en famille. Le rythme est fixé avec votre coach.

**À partir de quel âge ?**
De 8 à 17 ans. Le contenu est différent selon trois tranches d'âge : 8-11, 12-14 et 15-17 ans.

**Est-ce que ça marche pour n'importe quel sport ?**
Oui. La méthode est transversale : c'est le coach qui l'ancre dans le sport de votre enfant.

**Combien de temps ça me demande, à moi ?**
20 minutes par séance vidéo, avec votre enfant. Le reste — bilans, courbes, documents — arrive tout seul dans votre espace.

**Est-ce que c'est de la thérapie ?**
Non. C'est de la psychoéducation par le sport : le développement de compétences de vie. Ce n'est pas un suivi clinique et cela ne remplace pas un accompagnement psychologique.

**Puis-je inscrire plusieurs enfants ?**
Oui, selon votre forfait. Un compte THRIVE est un compte famille : plusieurs enfants et plusieurs parents peuvent y être rattachés.

**Le deuxième parent peut-il avoir accès ?**
Oui, selon votre forfait. Il reçoit sa propre invitation et son propre accès.

**Où sont stockées les données de mon enfant ?**
Au Canada, dans une infrastructure conçue pour la conformité à la Loi 25 du Québec. Les documents et photos sont dans un stockage privé, accessibles uniquement par des liens sécurisés à durée limitée.

**Puis-je changer de forfait en cours de parcours ?**
Oui. Le changement s'applique immédiatement à toute la famille, et vos bilans passés sont automatiquement enrichis au niveau du nouveau forfait.

**Faut-il télécharger une application ?**
Non. THRIVE s'ouvre dans votre navigateur et s'installe en un geste sur l'écran d'accueil de votre téléphone.

**Que se passe-t-il à la fin du parcours ?**
Vous conservez le passeport complet, les courbes de progression, les documents du parcours et le certificat THRIVE de votre enfant.

---

## 23. Glossaire

| Terme | Définition |
|---|---|
| **Passeport athlète** | La carte d'identité vivante du jeune dans l'application : identité, progression, mesures, objectifs, documents |
| **LSSS** | *Life Skills Scale for Sport* (Cronin & Allen, 2017) — échelle des 8 compétences de vie développées par le sport, 43 items |
| **EPOCH** | *EPOCH Measure of Adolescent Well-Being* (Kern et al., 2016) — 5 dimensions du bien-être adolescent, 20 items |
| **Life skill / compétence de vie** | Une compétence transférable hors du terrain : leadership, gestion des émotions, communication… |
| **Phase Ancrer / Développer / Intégrer** | Les 3 temps du protocole : poser les bases (S1-2), travailler (S3-10), transférer (S11-13) |
| **Moment interactif** | Un point de la séance vidéo où la vidéo se met en pause et pose une question au jeune |
| **RPE** | *Rate of Perceived Exertion* — l'échelle de difficulté ressentie de 0 à 10, en fin de séance vidéo |
| **Focus word** | Le mot d'ancrage personnel du jeune, choisi avec son coach |
| **Boîte à outils** | Les outils personnels du jeune, chacun avec son contexte d'usage |
| **Transfert** | L'action concrète à faire à la maison, hors écran, après une séance vidéo |
| **PWA** | *Progressive Web App* — une application web installable sur l'écran d'accueil, sans passer par un store |

---

*Fin du document — Cahier des charges Expérience Client THRIVE, 18 juillet 2026.*
