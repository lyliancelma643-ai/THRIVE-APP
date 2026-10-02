# Note au comptable — taxes de vente, abonnements et commissions des stores

> **De :** Thrive Sport Positive (Montréal, Québec) · **Date :** 2 octobre 2026
> **Objet :** validation avant le lancement payant de l'application THRIVE
> **Ce que nous attendons de vous :** une réponse « oui / non / à modifier » à chacune des
> **7 questions** de la section 6.
>
> Les faits ci-dessous ont été relevés le 2 octobre 2026 directement dans le compte Stripe
> (mode réel) et dans le code de l'application. Les points réglementaires sont notre
> compréhension et **doivent être confirmés par vous**.

## 1. L'activité en bref

| Élément | Détail |
|---|---|
| Produit | Abonnement numérique « THRIVE — Maison » : contenus et activités sportives parent-enfant (application web et mobile) |
| Clients | Parents, consommateurs (B2C), principalement au Québec, puis au Canada |
| Prix | **32,50 $ CA / mois** ou **299 $ CA / an**, **taxes incluses** (`tax_behavior = inclusive`) |
| Essai | 1 mois gratuit, une seule fois par compte ; renouvellement automatique |
| Canaux de vente | **Web** : Stripe Checkout (Thrive est le vendeur) · **iPhone** : App Store (Apple) · **Android** : Google Play (Google) |
| Code fiscal produit Stripe | `txcd_50021103` (produits numériques / logiciels) |

## 2. Seuil de petit fournisseur TPS/TVQ (30 000 $)

**État au 2 octobre 2026 :**

| Indicateur | Valeur |
|---|---|
| Paiements encaissés dans Stripe (mode réel) | **0** (aucune charge enregistrée) |
| Ventes App Store / Google Play | 0 (applications mobiles pas encore publiées) |
| Abonnés payants actifs | 0 |
| Inscription TPS/TVQ connue | aucune déclarée dans Stripe (0 immatriculation) |

→ **Thrive est aujourd'hui sous le seuil de 30 000 $.** Rappel de notre compréhension :

- Le seuil de 30 000 $ s'apprécie sur les fournitures taxables **mondiales** (avec les personnes
  associées) au cours d'un **trimestre civil** ou des **quatre derniers trimestres civils
  consécutifs**. Il est identique pour la TPS/TVH et la TVQ.
- Au Québec, **Revenu Québec administre à la fois la TPS/TVH et la TVQ** (inscription unique).
- Dépassement **au cours d'un seul trimestre** : l'inscription est obligatoire dès la vente qui
  fait dépasser le seuil. Dépassement **sur quatre trimestres** : inscription requise dans le mois
  qui suit (à confirmer).
- L'**inscription volontaire** avant le seuil est possible (récupération des CTI/RTI sur les
  dépenses : hébergement, logiciels, publicité), mais elle oblige à percevoir les taxes dès
  l'inscription — et nos prix étant **taxes incluses**, notre revenu net baisse d'autant.

**Impact prix taxes incluses** (exemple Québec, 14,975 %) : 32,50 $ ÷ 1,14975 = **28,27 $**
de revenu, 4,23 $ de taxes. Ontario (TVH 13 %) : 28,76 $. Alberta (TPS 5 %) : 30,95 $.

**Suivi du seuil** : Stripe Tax surveille les seuils (Tax › Registrations › « Monitoring »).
Les ventes App Store et Google Play n'y apparaissent pas : nous les additionnerons chaque mois
à partir des rapports financiers des stores.

## 3. Stripe Tax (ventes web)

**État relevé :**

| Réglage | Valeur |
|---|---|
| Stripe Tax | **actif** (`status: active`) |
| Siège social déclaré | Montréal, QC, Canada |
| Comportement par défaut | `inferred_by_currency` ; nos prix sont configurés « taxes incluses » |
| Immatriculations fiscales | **aucune** → Stripe **ne perçoit aucune taxe** aujourd'hui |
| Checkout | `automatic_tax` **non activé** dans le code de création de session |

**Plan proposé dès l'inscription TPS/TVQ :**
1. Stripe › Tax › Registrations : ajouter **Canada — TPS/TVH** et **Québec — TVQ** avec la date
   d'effet et les numéros d'inscription.
2. Nous activons `automatic_tax: { enabled: true }` dans le Checkout (changement de code prêt à
   faire le même jour) ; l'adresse de facturation du client est déjà collectée.
3. Ajouter les provinces à **taxe de vente provinciale sur les services numériques** si nos ventes
   y dépassent leurs seuils : **Colombie-Britannique** (TVP 7 %), **Saskatchewan** (TVP 6 %),
   **Manitoba** (TVD 7 %). Seuils et obligations d'inscription **à confirmer**.
4. Coût : Stripe Tax facture des frais par transaction taxée (de l'ordre de 0,5 % — à confirmer
   sur la grille en vigueur).
5. Stripe **calcule et perçoit**, mais **ne produit pas les déclarations** : vous les produisez à
   partir des rapports Stripe Tax (exports mensuels).

## 4. Ventes par l'App Store et Google Play

- Apple et Google vendent l'abonnement au consommateur. Notre compréhension : en tant que
  **plateformes de distribution**, ils **perçoivent et remettent** la TPS/TVH et la TVQ sur ces
  ventes au Canada ; Thrive reçoit un montant net de taxes et de commission.
- **À confirmer :** (a) ces ventes comptent-elles dans **notre** calcul du seuil de 30 000 $ ?
  (b) le traitement comptable du produit (brut ou net de commission) ?
- **Programmes à commission réduite (15 % au lieu de 30 %) :**

| Store | Programme | Condition | Démarche | Effet pour THRIVE |
|---|---|---|---|---|
| Apple | **App Store Small Business Program** | ≤ 1 M$ US de produits nets l'année civile précédente (tous comptes associés) | Formulaire d'inscription sur developer.apple.com, **avant** les premières ventes | 15 % dès la 1ʳᵉ année d'abonnement (sinon 30 % la 1ʳᵉ année, 15 % ensuite) |
| Google | Commission de 15 % sur le 1ᵉʳ M$ US annuel | Inscription d'un « groupe de comptes » dans Play Console | Play Console › Paramètres › Programme de frais de service | Abonnements déjà à 15 % ; utile pour les autres achats intégrés |

- Formulaires fiscaux des stores : **W-8BEN-E** (entité canadienne, convention Canada–États-Unis)
  dans App Store Connect et Play Console pour éviter une retenue américaine sur les ventes aux
  États-Unis ; numéros TPS/TVQ à y déclarer une fois inscrits.

## 5. Renouvellements automatiques — Loi sur la protection du consommateur (Québec)

Notre analyse, à faire valider (juriste ou comptable) :

| Exigence | Référence (LPC) | État THRIVE |
|---|---|---|
| Interdiction d'exiger un paiement pour un service non demandé : le passage de l'essai gratuit au payant doit reposer sur un **consentement clair** donné à l'inscription | art. 230 a) | Le prix après essai, la date de premier prélèvement et le renouvellement automatique sont affichés sur le paywall et la page Stripe Checkout ; **à valider** que la formulation suffit |
| Contrat conclu à distance : informations obligatoires **avant** la conclusion (identité et adresse du commerçant, description, prix total taxes comprises, durée, modalités d'annulation…) et possibilité d'accepter ou refuser expressément | art. 54.4 et 54.5 | Paywall web + Checkout ; **adresse du commerçant à ajouter** sur le paywall ou les conditions |
| Copie écrite du contrat dans les **15 jours** | art. 54.7 | Reçu Stripe envoyé automatiquement ; **à compléter** par les conditions d'abonnement en lien |
| Résolution par le consommateur si l'information n'a pas été fournie (7 jours) ; rétrofacturation | art. 54.8 à 54.14 | Procédure de remboursement documentée (support) |
| Rappel avant la fin de l'essai et avant le renouvellement **annuel** | Bonne pratique (exigée aussi par Visa/Mastercard pour les essais) | Événement Stripe `trial_will_end` reçu ; **activer** Stripe › Paramètres › Billing › « Envoyer un rappel 7 jours avant la fin d'un essai » et « avant un renouvellement annuel » |
| Annulation simple, au moins aussi facile que l'abonnement | Bonne pratique / conformité stores | Web : portail Stripe ; mobile : réglages du store |

Merci de nous signaler toute modification récente de la LPC applicable aux contrats
d'abonnement que nous n'aurions pas prise en compte.

## 6. Questions — merci de répondre par oui / non / à modifier

1. **Inscription TPS/TVQ** : attendre le seuil de 30 000 $ ou s'inscrire volontairement dès le lancement ?
2. **Seuil** : les ventes App Store / Google Play comptent-elles dans notre calcul ?
3. **Provinces** : faut-il prévoir une inscription en Colombie-Britannique, en Saskatchewan ou au Manitoba (TVP sur les services numériques) dès la première vente, ou à partir d'un seuil ?
4. **Prix taxes incluses** : confirmez-vous ce choix (prix identique partout, revenu net variable) plutôt que des prix hors taxes ?
5. **Stripe Tax** : validez-vous le plan de la section 3 (immatriculations, `automatic_tax`, exports mensuels) ?
6. **Revenus annuels** : traitement en produit reporté (abonnement annuel de 299 $ étalé sur 12 mois) ?
7. **Small Business Program d'Apple et W-8BEN-E** : y a-t-il un frein à l'inscription au nom de l'entité actuelle ?

Pièces disponibles sur demande : export des réglages Stripe Tax, grille de prix, captures du
paywall et du Checkout, rapports financiers des stores après publication.
