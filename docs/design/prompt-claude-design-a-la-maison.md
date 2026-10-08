# Prompt Claude Design — THRIVE « À la maison » (onglet Fitness)

> Copier tout ce qui suit la ligne ci-dessous dans Claude Design.

---

## Qui tu es, ce que je te demande

Tu es designer produit senior sur une app mobile grand public (PWA, 80 % d'usage sur téléphone). Je veux que tu dessines **l'onglet Fitness de l'espace parent THRIVE**. Il était au départ un parcours de **vidéos**. Il devient un **jeu de cartes d'activités parent ↔ enfant** : « Les cartes à la maison ».

L'objectif est une expérience **hyper interactive et hyper agréable**. On doit avoir envie de toucher les cartes, de les faire glisser, de cocher les étapes, de voir sa carte recevoir son tampon. Mais on garde **le calme et la sobriété** de la direction visuelle existante : c'est le soir, un parent fatigué, 10 minutes avec son enfant.

Une version fonctionnelle est déjà codée. Je te décris ci-dessous ce qu'elle fait. **Tu peux tout remettre en question côté forme et interaction.** Tu ne touches pas au contenu ni aux règles produit.

---

## 1. Le produit en une phrase

Après chaque séance de coaching sportif (programme de 13 semaines), le parent reçoit 2 ou 3 cartes d'activité de moins de 20 minutes à faire avec son enfant. Chaque carte est reliée à ce que l'enfant vient de travailler avec son coach.

**Promesse :** « Votre enfant vient de travailler sa concentration avec son coach. Voici 10 minutes, ce soir, pour que ça reste. »

**Qui l'utilise :** des parents d'enfants et d'ados sportifs (8 à 17 ans) à Montréal. Ils ne sont pas psychologues. Ils ouvrent l'app le soir, souvent sur le canapé ou dans la voiture après l'aréna.

---

## 2. Règles produit NON négociables (le design doit les servir)

1. **Aucun état d'échec dans l'app.** Ni croix rouge, ni « raté », ni jauge vide. Un parent qui se sent jugé désinstalle.
2. **Pas de score, pas de série (streak), pas de classement.** Le compteur est **une phrase** : « 7 moments avec votre enfant depuis le début du programme. »
3. **Le parent ne voit jamais les autres paquets d'âge.** Un parent d'enfant de 13 ans ne doit jamais voir les cartes des 16 ans. Aucun sélecteur d'âge, aucun teaser.
4. **Une carte s'ouvre seulement après sa séance**, jamais avant, et reste ouverte à vie. Les séances pas encore faites se montrent sans dévoiler le titre des cartes.
5. **La carte joker est disponible dès l'inscription**, sans condition.
6. **Le contenu s'affiche tel quel.** Pas de reformulation, pas de raccourci. Les textes peuvent être longs, le design doit les accueillir.
7. **Le code du thème (P1…P8) n'est jamais affiché.** Seul son nom en langage courant l'est (« L'effort plutôt que le résultat »), toujours suivi de son explication.
8. **Aucune comparaison avec un autre enfant**, nulle part.
9. **Une seule carte par semaine suffit** : l'interface ne doit jamais faire sentir au parent qu'il est « en retard ».

---

## 3. Direction visuelle existante (à respecter)

L'espace parent a **deux ambiances** qui partagent la même mise en page : **Nuit calme** (par défaut) et **Jour clair**. Tu dessines **les deux**.

**Principes « Nuit calme » :**
- Surfaces plates : **aucune bordure, aucune ombre, aucun dégradé** sur les cartes la nuit.
- **Un seul accent** : jaune `#F9EB50`, réservé à l'action (fonds de boutons). Le vert sauge `#A7C4BC` sert au secondaire (ex. tampon « Faite »).
- **Zéro halo, zéro lueur, zéro verre (glassmorphism).**
- **Une seule animation à la fois** sur un écran.
- Titres et chiffres en **Fraunces 600** (serif display). Texte courant en **Inter**. Étiquettes de section en CAPITALES 12 px / 700 / interlettrage 0.12em.

**Tokens (garde ces noms, ils existent dans le code) :**

| Token | Nuit calme | Jour clair |
|---|---|---|
| `--bg` | `#06161E` | `#F2EFE9` |
| `--surface` (cartes) | `#0C2029` | `#FFFFFF` |
| `--surface-sub` | `rgba(255,255,255,.03)` | `rgba(0,49,76,.045)` |
| `--tab` (barre d'onglets) | `#0A1C24` | `#FFFFFF` |
| `--text` (titres) | `#F7F5F2` | `#022539` |
| `--text2` (courant) | `rgba(234,243,241,.86)` | `#3C4A52` |
| `--text3` (doux) | `rgba(234,243,241,.68)` | `#5B6A73` |
| `--text4` (discret) | `rgba(234,243,241,.52)` | `#8B979E` |
| `--line` / `--line2` | `rgba(255,255,255,.08)` / `.16` | `rgba(0,49,76,.10)` / `.16` |
| `--accent` (fond d'action) | `#F9EB50` | `#F9EB50` |
| `--accent-ink` (accent en texte) | `#F9EB50` | `#004E7A` |
| `--on-accent` (texte sur jaune) | `#022539` | `#022539` |
| `--sage` | `#A7C4BC` | `#7FA197` |
| `--bub-out` (bulle de phrase) | `#123F55` | `#D9E8F2` |
| `--shadow` | aucune | `0 4px 22px rgba(0,49,76,.07)` |

Rayons existants : cartes 22 px, rangées 18 px, pastilles/boutons en pilule.

**Coque de l'espace parent (déjà là, ne pas redessiner, juste en tenir compte) :**
- **Header** collant, environ 68 px : logo, sélecteur d'enfant, messagerie, cloche, bascule soleil/lune, menu.
- **Barre d'onglets fixe** en bas, environ 80 px avec la zone de sécurité : Bilan · Mes séances · **Fitness**.
- On change d'onglet en **glissant le pouce horizontalement** sur l'écran. Tout élément qui défile lui-même à l'horizontale (carrousel) doit « capturer » le geste. Signale-le dans tes specs.
- Gouttière latérale de 20 px sur mobile.

---

## 4. Le contenu (modèle de données d'une carte)

100 cartes en 3 paquets. **A** = 8–11 ans (34 cartes), **B** = 12–14 ans (33), **C** = 15–17 ans (33). Chaque paquet a 13 séances, de 2 à 3 cartes par séance.

| Champ | Affiché comme | Exemple réel (B17) |
|---|---|---|
| `title` | Titre | Le débrief 3 – 1 |
| `session` + `session_label` | Badge « Idéal après la séance 7 » | 7 · Bilan de mi-parcours |
| `duration_label` / `duration_min` | Durée | 10 minutes |
| `materials` | Matériel | Rien (affiché « Aucun matériel ») |
| `notes` | Mentions | Après chaque match · À répéter |
| `objective` | **Objectif** | remplacer le débrief d'après-match par quelque chose qui construit. |
| `session_link` | **Ce qu'il a fait avec son coach** | La séance 7 est le bilan de mi-programme. Le coach lui a fait nommer **lui-même** ses progrès avant de parler d'ajustement. C'est l'ordre qui compte. |
| `steps[]` (1 à 3) | **Comment faire** (à cocher) | Il nomme **trois** progrès de son match. / Puis **un** ajustement, choisi par lui. / Vous ne rajoutez rien : ni un quatrième progrès, ni un deuxième ajustement. |
| `script` | **Demandez-lui** (le plus important) | « Trois choses qui ont marché. Après, une seule à ajuster. » |
| `trap` | **À éviter** (replié) | commencer par l'ajustement. L'ordre n'est pas décoratif, il change tout. |
| `what_it_builds` | **Ce que ça travaille** (replié) | *L'effort plutôt que le résultat* — le climat de maîtrise, c'est-à-dire l'ambiance que créent les adultes autour de lui. C'est la carte qui change le plus de choses dans une famille. |
| `success_marker` | **C'est réussi si** | il trouve ses trois progrès sans aide, même après une défaite. |
| `context` (interne) | filtre | maison · voiture · apres_match · avant_match · arena · coucher · dehors |
| `energy` (interne) | filtre | calme · actif |

Le texte contient du **gras** et de l'*italique* inline.

**Cas limites de contenu à tester dans tes maquettes :**
- **Carte la plus longue en écran 1 : C15.**
  - Titre : « La routine pré-performance en 3 étapes ».
  - Coach : « En séance 6, il a construit sa routine en trois étapes — une routine de gestion du stress avant une action sous pression. Le protocole prévoit qu'elle serve aussi pour les examens, les présentations et les entretiens. »
- **Phrase « Demandez-lui » avec indication de mise en scène : A22.**
  - Phrase : `*(rien avant qu'il demande)* Puis : « T'as demandé. C'est exactement ça qu'il fallait faire. »`
  - L'indication entre parenthèses est **pour le parent** : elle ne se dit pas et ne se copie pas.
- **Phrase uniquement indication : C26.** `*(rien — ce carnet ne se lit pas)*`
- **Durée atypique : A04.** « 5 minutes pour le créer, 10 secondes par jour ».
- **Carte joker** (hors paquet, disponible tout de suite) :
  - « Il y a des soirs où ça ne va pas. Il rentre fermé, fâché, ou il ne veut rien faire. Ces soirs-là, ne sortez aucune carte. Faites ça : »
  - « Asseyez-vous à côté de lui. Dites-lui : « Je ne te demande rien. Je suis juste content que tu sois là. » **Puis taisez-vous.** Restez 5 minutes. Partez. »
  - « C'est la carte la plus puissante du paquet. Elle ne travaille aucun exercice — elle construit la seule chose sans laquelle rien d'autre ne fonctionne. »

---

## 5. Écrans à dessiner (mobile 375 × 812 d'abord, vérifier 375 × 667)

### Écran A — Accueil de l'onglet Fitness « À la maison »

Ce qui existe aujourd'hui, de haut en bas :
1. **En-tête contextuel.**
   - Étiquette « À LA MAISON · MAYA ».
   - Titre « Après la séance 7 ». Entre 24 et 48 h après une séance, il devient : « 10 minutes ce soir pour prolonger la séance d'hier. »
   - Sous-titre : « Maya a travaillé « bilan de mi-parcours » avec son coach. Voici de quoi faire durer ça. »
   - Phrase de moments avec le chiffre qui monte en animation.
2. **Mot de bienvenue** (première visite seulement, se ferme avec « C'est parti »).
3. **« Cette semaine · 2 cartes — Une seule suffit ».** Un **carrousel de grandes cartes à jouer** (≈ 78 % de la largeur, ratio 4:5) :
   - la carte du centre est pleine, ses voisines reculent (échelle 0.94, opacité 0.55) ;
   - aimantation au centre, points de pagination ;
   - la **carte joker** est la dernière du paquet ;
   - face de carte : « SÉANCE 7 », durée, titre, objectif, matériel, bouton lecture rond jaune, tampon « FAITE » si faite.
4. **« Ce soir, j'ai… ».** Pastilles filtres avec compteur : 10 minutes ou moins · Rien sous la main · En voiture · Avant le coucher · Il a besoin de bouger · Un moment calme. Un toucher déroule les cartes ouvertes correspondantes.
5. **« Quand ça ne va pas ».** Pastilles de situations : Il rentre frustré d'un match · Il doute de lui · Il n'a plus de plaisir · Il stresse avant les matchs · On ne se parle plus · Il est débordé, épuisé · Ça se passe mal dans l'équipe · Il ne veut rien faire ce soir (→ joker). Un toucher montre les 2 ou 3 cartes conseillées ; les cartes pas encore ouvertes s'affichent en pointillés, sans titre.
6. **« Le chemin ».** Frise verticale des 13 séances :
   - séance ouverte = pastille jaune numérotée ; coche si toutes ses cartes sont faites ;
   - la dernière séance a un anneau qui respire ;
   - séance à venir = contour discret, « s'ouvre après la séance » ;
   - un toucher sur une séance ouverte déroule ses cartes.
7. **Encart « Le guide · 2 minutes »** avec les 3 règles, vers une page guide.
8. **Lien discret « Les séances vidéo 20 minutes »** (l'ancien contenu de l'onglet, conservé).

**États à dessiner aussi :**
- Aucune séance encore faite : pas de cartes, message + carte joker.
- Enfant sans date de naissance : on ne devine pas son paquet, message + joker.
- Compte pas encore activé par le coach : bannière « Votre espace se prépare » + joker seul.
- Programme terminé et enfant passé à la tranche suivante : section **« En bonus »** avec le paquet suivant.
- Chargement (squelettes).

### Écran B — Carte, temps 1 « Est-ce que je fais ça ce soir ? »

**Tient sans défilement**, y compris C15 sur 375 × 667 (aujourd'hui ça dépasse d'environ 15 px : à résoudre).

Contenu :
- barre du haut : ✕ fermer + progression en 3 temps « Ce soir · Maintenant · Et alors ? » ;
- la carte : badge « Idéal après la séance n », durée, titre, mentions, **Objectif**, **Ce qu'il a fait avec son coach** ;
- bouton **« On le fait »** et lien discret **« Plus tard »**.

### Écran C — Carte, temps 2 « Je le fais, là, maintenant »

- **Comment faire** : 3 grandes rangées à cocher. Le numéro devient une coche qui rebondit, le texte s'estompe et se barre légèrement, compteur 1/3, petite vibration sur Android.
- **Demandez-lui** : **la pièce maîtresse**. Grosse bulle de conversation, lisible d'un coup d'œil. **Toucher la bulle copie la phrase** (retour « Copié »). Les indications entre parenthèses sont plus petites, sur leur propre ligne, jamais copiées.
- **Compteur de silence** sous la bulle (règle n° 2 : « Il parle en premier. Comptez jusqu'à 5 avant de relancer. ») : 5 points qui se remplissent une fois par seconde, puis « Cinq secondes. Vous pouvez relancer. »
- **À éviter** et **Ce que ça travaille** : repliés.
- **C'est réussi si** : en bas.
- Bouton **« C'est fait »** : il reçoit l'anneau quand les 3 étapes sont cochées, mais il n'est **jamais bloqué**.

### Écran D — « Ça s'est passé ? »

Le `success_marker` en grand, la question, deux gros boutons **Oui** / **Pas vraiment**. Aucun des deux ne doit avoir l'air d'une mauvaise réponse.

### Écran E — Oui

- La carte miniature reçoit son **tampon « FAITE »** (animation d'impact).
- « Vous venez de faire quelque chose que la plupart des parents ne font jamais. »
- La phrase de moments, le chiffre monte.
- « Une prochaine fois » : une carte suggérée.
- « Retour aux cartes ».

### Écran F — Pas vraiment

- « Normal. Celle-là marche souvent mieux au deuxième essai. »
- « La refaire » + « Ou en essayer une autre » (carte suggérée).
- **Aucune** connotation d'échec.

### Écran G — Carte joker

- Texte du joker.
- Bouton **« Je m'assois à côté de lui »** qui lance une barre de 5 minutes qui se remplit (pas de chrono qui défile : on pose le téléphone).
- Puis « C'est fait » → écran E version joker.

### Écran H — Carte pas encore ouverte (ouverte par lien direct)

« Cette carte s'ouvre après la séance 5 » + libellé de séance + « Faite avant la séance, une carte perd son effet. »

### Écran I — Le guide

Pages de lecture avec des sections repliables :
- Les 3 seules règles (ouvert par défaut) ;
- Comment ça marche ;
- Votre paquet (uniquement celui de l'enfant) ;
- Si vous ne deviez en faire que cinq ;
- Pourquoi ces activités fonctionnent ;
- Les 8 thèmes de la méthode ;
- Le rôle du parent ;
- Trois choses, pour finir ;
- l'avertissement légal en pied de page.

---

## 6. Ce que j'attends de toi en « hyper interactif, hyper agréable »

Propose et **spécifie** :
- **La métaphore de la carte à jouer** poussée plus loin : face / dos, retournement pour passer du temps 1 au temps 2, glisser pour écarter « Plus tard », empilement du paquet de la semaine, tampon, carte « rangée » dans le chemin une fois faite…
- **Micro-interactions** : cocher, copier, compteur de silence, filtres, déroulé du chemin, compteur de moments, retour haptique.
- **Transitions entre les temps** d'une carte, et entre l'accueil et une carte (élément partagé : la carte du carrousel devient l'écran).
- **Un moment de fierté** mémorable **sans confettis ni lueur**, dans l'esprit sobre de la direction.
- **Gestes** compatibles avec la navigation d'onglets au pouce (dis explicitement quelles zones capturent le glissement horizontal).
- Ce qu'on garde ou retire de l'accueil pour qu'il ne soit **pas trop long** : aujourd'hui il empile 6 blocs. Tu peux proposer des onglets internes, un ordre différent, du repli…

Contraintes de mouvement :
- une animation à la fois ;
- durées entre 200 et 500 ms (courbe `cubic-bezier(.22,.61,.36,1)` pour les entrées, ressort léger `cubic-bezier(.34,1.56,.64,1)` pour les rebonds) ;
- tout doit avoir une variante `prefers-reduced-motion`.

---

## 7. Accessibilité

- Cibles tactiles ≥ 44 px. Contraste AA dans les deux ambiances (attention au jaune en texte le jour : c'est `--accent-ink` marine, jamais le jaune).
- Les étapes sont des vraies cases à cocher. La pagination du carrousel est navigable. La phrase « Demandez-lui » reste sélectionnable.
- Lisible d'un coup d'œil à 40 cm, dans la pénombre.

---

## 8. Livrables attendus (pour que le développeur puisse tout reprendre fidèlement)

1. **Artboards mobile 375 × 812** pour chaque écran A → I et chaque état listé, **en Nuit calme ET en Jour clair**. Plus les écrans B et C en **375 × 667**.
2. **Une vue tablette/desktop** de l'accueil (A) et d'une carte (C), contenu centré avec une largeur max.
3. **Planche de composants** : carte de carrousel (normale / faite / joker / active / inactive), rangée de carte (normale / imbriquée / verrouillée), pastille filtre (repos / active / désactivée / avec compteur), station du chemin (ouverte / dernière / complète / à venir / dépliée), étape à cocher (repos / cochée), bulle « Demandez-lui » (avec et sans indication), compteur de silence (0 / en cours / terminé), barre des 3 temps, tampon « Faite », boutons (primaire / secondaire / texte).
4. **Spécifications chiffrées** : tailles, espacements, rayons, typographies (taille / graisse / interligne), **uniquement avec les tokens du §3** (aucune couleur en dur ; si tu as besoin d'un nouveau token, nomme-le et donne ses deux valeurs).
5. **Spécifications de mouvement** pour chaque interaction : déclencheur, propriétés animées, durée, courbe, délai, variante mouvement réduit.
6. Un court **texte de justification** : ce que tu as changé par rapport à la version actuelle, et pourquoi.

Utilise le **vrai contenu** des exemples ci-dessus (B17, B18, C15, A22, A07, joker) plutôt que du faux texte.
