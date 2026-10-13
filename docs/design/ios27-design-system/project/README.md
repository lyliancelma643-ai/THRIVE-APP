# THRIVE iOS 27

Le système d'interface de l'espace client THRIVE (parents et questionnaire de l'enfant), aligné sur la grammaire du kit Apple **iOS and iPadOS 27**. Il sert de référence aux trois directions maquettées — **Natif**, **Nuit calme**, **Carnet de saison** — qui sont les trois thèmes de couleur de ce système.

> Promesse produit : « Tu ne sauras plus seulement si ton enfant a aimé sa séance. Tu verras ce qui progresse en lui, séance après séance. »

## Fondamentaux de contenu

- **Tutoiement partout**, ton bienveillant et concret. Vocabulaire : *séance* (1:1 et vidéo), *moment* (Maison), *bilan*, *coach*, *passeport*.
- On parle à un parent fatigué, le soir : une phrase courte vaut mieux qu'un paragraphe. Exemple : « Les trois suffisent pour passer à la semaine 9. Rien n'est obligatoire. »
- L'enfant n'a **ni compte ni mot de passe** ; son interface (questionnaire) a sa propre matière et dit toujours : « Il n'y a pas de bonne ou de mauvaise réponse. »
- **Honnêteté des forfaits** : un contenu non inclus montre sa structure (libellés, anneaux vides) sur un contenu factice. La vraie donnée n'est jamais transmise à l'appareil.
- Pas d'emoji comme icône d'interface ; pas de promesse que le produit ne tient pas.

## Fondations visuelles (iOS 27)

| Règle du kit | Application THRIVE | Tokens |
|---|---|---|
| Liquid Glass à **bords définis**, reflet plus vif, pas d'ombre portée | Boutons de barre (44 pt), tab bar, menus, feuilles flottantes | `glass`, `glass-strong`, `glass-edge`, `glass-spec`, `shadow-glass` |
| **Scroll edge effect dur** + filet bas (défaut iOS 27) | Barres de navigation des écrans poussés | `bg-grouped` à 78 % + flou 22 px, `separator` |
| Tab bar flottante + **onglet Prominent** | 3 onglets en capsule + un rond détaché teinté | `tabbar-h`, `radius-full`, `tint` |
| **Slider Liquid Glass** | Effort ressenti (RPE 0–10) après une séance vidéo | `fill`, `tint`, `shadow-thumb` |
| Listes inset grouped à grands rayons | Réglages, séances, notifications, compte | `bg-grouped-2`, `radius-card`, `row-min` |
| Feuilles et détents | Grand détent (coins `radius-sheet`), détent moyen flottant (`radius-sheet-float`) | |
| Styles SF Pro | Large Title 34/41 → Caption 2 11/13 | groupe « SF Pro · styles iOS 27 » |
| Contraste jaune / orange corrigé | `accent` ne porte que du texte foncé ; jamais de texte jaune sur fond clair | `accent`, `accent-ink` |

**Thèmes.** `light` = Natif (fond groupé système, teinte marine `#004E7A`). `dark` = Nuit calme (noir pur, teinte soleil `#F9EB50`). `creme` = Carnet de saison (crème `#F7F5F2`, marine profond, titres Fraunces, seule ombre de carte autorisée `shadow-card-creme`).

**Typographie.** SF Pro (police système, non distribuée : `-apple-system`) pour tout le texte ; SF Pro Rounded pour les grands chiffres (minuteur, numéro de maillot, filigrane de séance), toujours en chiffres tabulaires ; **Fraunces** (Google Fonts) seulement pour les grands titres et citations du thème Carnet de saison. Champs à 17 pt : jamais de zoom iOS.

**Mise en page.** iPhone 17 Pro, 402 × 874 pt. Marge latérale `space-4` (16 pt). Tab bar à `space-6` du bas ; barre d'action flottante à `space-8`. Cible tactile minimale `touch-min` (44 pt).

**Couleur de l'enfant.** Six préréglages (Soleil, Ambre, Sauge, Ciel, Corail, Violet) ; le token `kid` en porte la version assombrie quand elle reçoit du texte blanc (3:1 minimum sur le numéro de maillot).

## Iconographie

Icônes au trait façon SF Symbols (grille 24, trait régulier ~1,85), arrondies. Dans le code final : **SF Symbols** natifs (house, person.text.rectangle, play.rectangle, bubble.left, bell, sparkles, target…). Icônes de rangée sur pastille carrée arrondie de couleur système (`sys-orange`, `sys-teal`, `sys-indigo`…), blanc dessus.

## Composants

- **TabBar** — capsule de verre à 3 onglets + onglet Prominent.
- **GlassButton** — bouton de barre (icône seule, texte, paire), neutre ou teinté.
- **ListRow** — rangée inset grouped avec pastille d'icône, sous-titre, valeur, chevron.
- **Sheet** — feuille flottante en verre (détent moyen) avec poignée.

## Logo

`assets/Logos/thrive-logo.png` — tuile marine `#004E7A`, silhouette crème. Affiché en icône d'app (coins ≈ 22 %), jamais recoloré.

## Maquettes

Les 26 écrans de A à Z dans les trois thèmes vivent dans le dépôt de l'app, dossier `maquettes-ios27/` (hors du code de l'app).
