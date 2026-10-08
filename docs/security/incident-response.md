# Plan de réponse aux incidents — THRIVE

> Version 1.0 · 2026-10-02 · Propriétaire : la direction de Thrive Sport Positive
> (responsable de la protection des renseignements personnels, Loi 25 art. 3.1).
> Révision : après chaque incident S1/S2 et au moins une fois par an.
> Procédures techniques (rollback, restauration, rotation des clés) :
> [`docs/exploitation/RUNBOOK-INCIDENT-ROLLBACK.md`](../exploitation/RUNBOOK-INCIDENT-ROLLBACK.md).

---

## 1. Rôles et responsabilités

### 1.1 Rôles

| Rôle | Titulaire par défaut | Suppléant | Responsabilités |
|---|---|---|---|
| **Responsable d'incident (RI)** | Direction de Thrive Sport Positive | Développeur principal | Ouvre et clôt l'incident, fixe la sévérité, arbitre (rollback, coupure d'une fonction, communication), tient la chronologie |
| **Responsable technique (RT)** | Développeur principal | Direction | Diagnostic, contention technique, rollback, correctif, preuves techniques (journaux, exports) |
| **Responsable de la protection des renseignements personnels (RPRP)** | Direction de Thrive Sport Positive (art. 3.1) | — (toute délégation se fait **par écrit**) | Qualifie l'incident de confidentialité, évalue le risque de préjudice sérieux, tient le **registre**, signe les avis à la CAI et aux personnes |
| **Communication** | Direction | Responsable du support | Page de statut, messages aux familles, réponses au support, stores, coachs |
| **Support** | Responsable du support | Direction | Signale les remontées (≥ 2 plaintes similaires = alerte), applique les messages validés, ne promet aucun délai non validé |

Une même personne peut tenir plusieurs rôles (petite équipe). **Le RPRP ne peut pas être
contourné** pour toute décision touchant des renseignements personnels.

### 1.2 Matrice RACI

| Activité | RI | RT | RPRP | Comm. | Support |
|---|---|---|---|---|---|
| Détection et ouverture | A | R | I | I | R |
| Qualification de la sévérité | A/R | C | C | I | I |
| Contention (rollback, coupure, révocation de clé) | A | R | C | I | I |
| Qualification « incident de confidentialité » | C | C | **A/R** | I | I |
| Évaluation du préjudice sérieux | C | C | **A/R** | I | — |
| Inscription au registre | I | C | **A/R** | — | — |
| Avis à la CAI / aux personnes | C | I | **A/R** | R | I |
| Communication publique (statut, courriels) | A | C | C (si données) | R | I |
| Correctif et vérification | A | R | I | I | I |
| Post-mortem | A/R | R | C | C | C |

R = réalise · A = approuve et répond · C = consulté · I = informé.

### 1.3 Joignabilité

- Un seul canal d'astreinte : alertes Sentry et d'uptime par **SMS + courriel** au RI et au RT.
- Pendant le lancement (J-0 à J+14) : astreinte nommée chaque jour, de 7 h à 22 h (heure de l'Est).
- Hors de ces heures, seuls les incidents **S1** réveillent quelqu'un.
- Les coordonnées personnelles d'astreinte ne sont **pas** dans ce dépôt : elles sont dans le
  coffre de mots de passe de l'équipe (entrée « Astreinte THRIVE »).

---

## 2. Gestion d'un incident

### 2.1 Niveaux de sévérité

| Sév. | Définition | Exemples (espace client) | Prise en charge | Mise à jour du statut |
|---|---|---|---|---|
| **S1 — critique** | Service indisponible pour tous, perte ou fuite de données, paiement faussé à grande échelle | App inaccessible ; connexion impossible ; abonnés payants privés d'accès ; données d'un enfant visibles par une autre famille ; clé secrète exposée | **15 min**, 24/7 | Page de statut sous 30 min, puis toutes les heures |
| **S2 — majeur** | Fonction importante en panne, sans contournement simple | Maison, Bilan, paiement web ou messagerie en panne ; webhook Stripe/RevenueCat en échec ; crash mobile au démarrage pour une partie des appareils | **1 h** (heures ouvrables étendues) | Page de statut sous 2 h |
| **S3 — mineur** | Gêne avec contournement | Notification non reçue ; affichage cassé sur un navigateur | 1 jour ouvrable | Réponse au support |
| **S4 — cosmétique** | Aucun impact fonctionnel | Faute, alignement | Prochain cycle | — |

**Règle** : toute suspicion d'accès non autorisé à des renseignements personnels est traitée en
**S1** jusqu'à preuve du contraire.

### 2.2 Déroulé

1. **Détecter.** Alerte (Sentry, uptime, webhooks), plainte au support ou signalement interne.
2. **Ouvrir.** Le premier qui voit l'incident crée une issue GitHub **privée** (ou une note dans
   le coffre si elle contient des données personnelles) : `INC-AAAAMMJJ-n`, heure de début,
   symptôme. **Ne jamais coller de données personnelles ni de secret** dans une issue, un chat
   ou un commit.
3. **Qualifier.** Le RI fixe la sévérité et répond à la question : *des renseignements personnels
   sont-ils concernés ?* Si oui ou si c'est incertain, le RPRP est prévenu immédiatement (§ 2.4).
4. **Contenir.** Priorité au rétablissement, pas à la cause :
   - panne apparue après un déploiement → **rollback d'abord** (runbook § 3) ;
   - fuite → couper l'accès (révoquer la clé, désactiver la fonction, retirer la règle RLS fautive),
     **conserver les preuves** (journaux exportés avant leur rotation : 1 jour en plan Free) ;
   - paiement → suspendre la fonction de vente plutôt que de laisser des prélèvements faux.
5. **Communiquer.** Modèles § 2.6. Rien n'est publié sur les données sans l'accord du RPRP.
6. **Corriger.** Par PR, CI verte, vérifié sur staging puis en prod. Jamais de push direct sur `main`.
7. **Clore.** Le RI clôt quand le service est rétabli **et** que les obligations du § 2.4 sont remplies.
8. **Post-mortem** sous 5 jours ouvrables pour S1/S2 : chronologie, cause racine, ce qui a bien
   ou mal marché, actions avec responsable et date. Sans recherche de coupable.

### 2.3 Chronologie à tenir (dans l'issue)

| Heure | Qui | Observation / décision / action |
|---|---|---|
| | | |

### 2.4 Incident de confidentialité (Loi 25 et RGPD)

**Définition** (Loi 25, art. 3.6) : accès, utilisation ou communication non autorisés par la loi
d'un renseignement personnel, sa perte, ou toute autre atteinte à sa protection.
Exemples THRIVE : bilan d'un enfant visible par une autre famille, export de données envoyé à la
mauvaise adresse, clé `service_role` publiée, ordinateur volé avec un export, compte admin compromis.

#### a) Dans l'heure

1. Le RPRP est prévenu.
2. Mesures raisonnables pour **diminuer le risque de préjudice** et éviter que l'incident se
   reproduise (art. 3.5) : révocation, coupure, rollback, réinitialisation forcée des sessions.
3. Préserver les preuves : exporter les journaux Supabase (Auth, API, base) et Vercel de la période.

#### b) Évaluation du risque de préjudice sérieux (art. 3.7)

Le RPRP tient compte de :

| Facteur | Questions | Pour THRIVE |
|---|---|---|
| **Sensibilité** | Quels renseignements ? | Données de **mineurs**, réponses aux questionnaires psychoéducatifs et bilans = **très sensibles**. Courriel seul = sensibilité faible |
| **Conséquences** | Que peut-il arriver aux personnes ? | Atteinte à la réputation, stigmatisation de l'enfant, hameçonnage, fraude |
| **Probabilité d'utilisation malveillante** | Qui a eu accès ? Données chiffrées ? Récupérées ? | Accès par une autre famille identifiée qui confirme la suppression → probabilité faible ; fuite publique ou accès par un inconnu → élevée |

**Arbre de décision**

```
Renseignements personnels touchés ?
├─ Non → incident technique ordinaire (pas de registre).
└─ Oui → INSCRIRE AU REGISTRE (toujours, même mineur).
         └─ Risque de préjudice sérieux ?
            ├─ Non → registre seulement, motif de la décision écrit.
            └─ Oui → avis à la CAI ET aux personnes concernées, avec diligence.
                     + résidents de l'UE touchés ? → autorité de contrôle sous 72 h (RGPD art. 33),
                       personnes concernées « dans les meilleurs délais » si risque élevé (art. 34).
                     + autre province ? → LPRPDE : rapport au Commissariat fédéral si
                       « risque réel de préjudice grave ».
```

En cas de doute sur le caractère « sérieux », **notifier** : le coût d'un avis inutile est faible,
celui d'une absence d'avis est élevé (sanctions administratives pécuniaires de la CAI).

#### c) Avis à la Commission d'accès à l'information

- Formulaire officiel « Avis d'incident de confidentialité » sur cai.gouv.qc.ca.
- Contenu (Règlement sur les incidents de confidentialité) : nom de l'entreprise et du RPRP ;
  description des renseignements ; circonstances ; date ou période de l'incident et date de sa
  connaissance ; nombre de personnes concernées (dont nombre au Québec) ; évaluation du préjudice ;
  mesures prises et prévues ; avis faits ou prévus aux personnes ; personne à joindre.
- Délai : **avec diligence**. Objectif interne : **72 h** après la décision du RPRP (aligné sur le RGPD).

#### d) Avis aux personnes concernées

- À chaque personne dont un renseignement est touché ; pour un enfant, **au titulaire de
  l'autorité parentale**.
- Contenu : description des renseignements ; circonstances (brèves) ; date ou période ; mesures
  prises ; mesures recommandées à la personne ; coordonnées du RPRP.
- Moyen : courriel depuis l'adresse officielle + message dans l'app. Avis public seulement si
  l'avis individuel est impossible ou causerait un préjudice accru.
- Exception : l'avis peut être retardé seulement s'il risque d'entraver une enquête policière.

#### e) Registre des incidents de confidentialité (art. 3.8)

Tenu par le RPRP, **conservé au moins 5 ans** après la date à laquelle l'entreprise a pris
connaissance de l'incident, communiqué à la CAI sur demande. Il vit dans le coffre de documents
de l'entreprise, **pas dans ce dépôt public**.

| Champ | Contenu |
|---|---|
| Identifiant | INC-AAAAMMJJ-n |
| Description des renseignements | Catégories (pas les données elles-mêmes) |
| Circonstances | Cause, vecteur |
| Date ou période de l'incident | |
| Date de prise de connaissance | |
| Nombre de personnes concernées | Total / au Québec / dans l'UE |
| Évaluation du préjudice | Sensibilité, conséquences, probabilité, conclusion motivée |
| Avis à la CAI | Oui/Non — date — motif si non |
| Avis aux personnes | Oui/Non — date — moyen |
| Mesures prises | Contention, correction, prévention |

#### f) Paiements et fournisseurs

- Clé Stripe ou RevenueCat exposée : rouler la clé (runbook § 6) et prévenir le support Stripe.
- Incident chez un fournisseur (Supabase, Vercel, Stripe…) : il doit nous prévenir (engagement
  contractuel) ; le RPRP évalue alors l'impact pour nos utilisateurs comme ci-dessus.

### 2.5 Communication

| Qui | Quand | Canal | Validé par |
|---|---|---|---|
| Familles touchées par une panne S1/S2 | Sous 30 min (S1) / 2 h (S2) | Page de statut ; courriel si > 2 h | RI |
| Familles touchées par un incident de confidentialité | Après décision du RPRP | Courriel + message dans l'app | RPRP |
| Coachs | Si leur travail est touché | Messagerie interne | RI |
| CAI | § 2.4 c | Formulaire officiel | RPRP |
| Apple / Google | Si une version mobile doit être retirée ou accélérée | App Store Connect / Play Console | RI |

Règles : phrases simples, faits vérifiés seulement, pas de spéculation sur la cause, pas de
minimisation (« aucune donnée n'a été touchée » seulement si c'est **prouvé**), et une heure de
prochaine mise à jour.

### 2.6 Modèles

**Statut — début**
> Nous constatons un problème qui empêche certaines familles d'utiliser THRIVE. Notre équipe y
> travaille. Prochaine mise à jour à HH:MM.

**Statut — résolu**
> Le problème est résolu depuis HH:MM. [Vos données n'ont pas été affectées. — seulement si prouvé]
> Merci pour votre patience.

**Avis aux personnes — incident de confidentialité** (à adapter et faire valider par le RPRP)
> Objet : Information importante concernant vos renseignements personnels
>
> Bonjour,
>
> Le [date], nous avons constaté [description simple de l'incident]. Les renseignements
> concernés sont : [catégories]. Ils concernent [vous / votre enfant].
>
> Dès que nous l'avons constaté, nous avons [mesures]. Nous évaluons le risque pour vous comme
> [évaluation] et vous recommandons de [actions concrètes : changer votre mot de passe, se méfier
> des courriels demandant…].
>
> Nous avons avisé la Commission d'accès à l'information du Québec.
>
> Pour toute question : la direction de Thrive Sport Positive, responsable de la protection des
> renseignements personnels — confidentialite@thrivesportpositive.com.
>
> Nous sommes sincèrement désolés de cet incident.

### 2.7 Après l'incident

- Post-mortem publié en interne (S1/S2) ; actions suivies dans GitHub jusqu'à leur clôture.
- Mise à jour de ce plan et du runbook si une étape a manqué.
- Exercice sur table (simulation d'une fuite de bilan) : **une fois avant le lancement public**,
  puis une fois par an.
