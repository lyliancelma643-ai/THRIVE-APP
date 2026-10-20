# design/ — primitives THRIVE « Lin » et « Veillée » (GO 4)

Source de vérité visuelle : `maquettes-ios27/final.css` (tokens `[data-v="v4"] .phone` = **Lin**, `[data-v="v5"] .phone` =
**Veillée**, et blocs « Matières »), écrans `v4.html` / `v5.html` + `screens-final.js` (cf. `maquettes-ios27/LISEZMOI.md`).
**Deux styles seulement** : `lin` (clair, défaut) et `veillee` (sombre). Les anciens styles du GO 3 n'existent plus ;
leurs valeurs stockées sont converties par `styleMigration.ts` (seul fichier où ces mots ont le droit d'apparaître comme clés).
Noms stricts : `StyleKey`, `STYLE_KEYS`, `STYLE_LABELS`, `COLORS` (alias `ThemeStyleKey`, `THEME_*` conservés).
Import unique : `import { … } from '../../design'`. Aucune couleur en dur : `useTheme().colors.<token>` ; aucune donnée de démo
(prénoms, dates, chiffres des maquettes) : on reproduit la forme, jamais le contenu. Galerie de contrôle (DEV) : route `/__design`.

## Traduire le HTML du canevas, mécaniquement
| Classe CSS | Composant RN (props) |
|---|---|
| `.navbar > .bar` `.grp` `.ttl` `.edge` | `<NavBar title left right edge titleVisible overlay />` ; `<GlassGroup>` ; `useNavBarHeight()` pour le `paddingTop` du contenu ; `useScrollEdge()` / `useLargeTitle()` pilotent `edge` |
| `.largetitle` `.subtitle-nav` | `<LargeTitle subtitle>` (36/42 Fraunces 500, les deux styles) |
| `.gbtn.glass` `.ic` `.tinted` `.pair` | `<GlassButton glyph label tinted onPress accessibilityLabel/>` ; `<GlassPair items=[{glyph,accessibilityLabel,onPress,badge}]/>` |
| `.t-largetitle … .t-cap2` `.c2 .c3 .ctint` `.eyebrow` `.kick` | `<ThemedText variant="largetitle\|title1\|title2\|title3\|headline\|body\|callout\|sub\|foot\|cap\|cap2\|eyebrow\|kick\|navTitle" color="label2\|label3\|tintText\|sageText" weight>` |
| `.sec` / `.sec-h` / `.sec-h.small` / `.sec-f` | `<Section>` / `<SectionHeader title action>` / `<SectionHeader small title>` / `<SectionFooter>` |
| `.list` `.rowi` `.ico` `.ico-lg` `.ibadge` | `<List>` + `<ListRow glyph iconColor="sysBlue" large title subtitle value chevron toggle checked accessory destructive onPress/>` (`last` posé tout seul) ; avatar/vignette en tête : `leading` + `leadingInset` |
| `.rowi.danger` | `<ListRow destructive title onPress/>` (rouge, centré) |
| `.field label .in` `.caret` | `<Field label value onChangeText placeholder secureTextEntry … />` ; valeur statique : `<Field label>…</Field>` |
| `.card` `.card .kick` `.grid2` | `<Card padding onPress>` ; `<Kicker glyph>` ; `<Grid2>` (deux colonnes, gap 12) |
| `.btn.prom` / `.gray` / `.plain` / `.plainglass` / `.sun` / `.sm` / `.md` | `<Button label variant="prom\|gray\|plain\|plainglass\|accent\|danger" size="lg\|md\|sm" glyph flex loading/>` (`lg` pleine largeur 52 pt). `prom` = feutre marine en Lin, **émail en Veillée** ; `accent` = émail (`.btn.sun`) |
| `.tag` `.tag.ok` `.tag.gray` | `<Tag label tone="tint\|ok\|gray" glyph/>` (anciennement `<Pill>` : conservé) |
| `.chip` `.chip.on` `.chips` | `<Chip label on glyph tall surface onPress/>` ; `<Chips scroll>` ; `<Pills>` (wrap). `on` = feutre en Lin, crème en Veillée (jamais jaune) |
| `.seg` | `<Segmented options=[{key,label}] value onChange/>` |
| `.bar-p` | `<ProgressBar value=0..1 color valueText/>` |
| `.tgl` | `<Toggle value onValueChange accessibilityLabel/>` (ou `toggle` d'une ListRow) |
| `.slider` | `<Slider value onChange min max step accessibilityLabel valueText/>` |
| `.sheet` `.grabber` `.sbar` `.dim` `.float` `.glassy` | `<Sheet visible onClose title detent="medium"(float+verre)\|"large" trailing dim scroll/>` |
| `.menu` `.mi` `.mi.on` `.mi.sep` | `<GlassMenu items=[{label,onPress,checked,destructive,separator}]/>` ; `<MenuPopover visible top left right …/>` |
| `.avatar` | `<Avatar label size color="kid" background ink uri/>` |
| `.lock-ov` `.muted-preview` | `<LockOverlay preview align="center\|end">carte</LockOverlay>` + `<MutedPreview>` |
| `.fade-bottom` | `<FadeBottom/>` (sous la barre d'onglets) |
| `.tabbar .tabs .tab .prom` | `<FloatingTabBar tabs activeKey onSelect prominent={{key,label,glyph,onPress}}/>` ; onglets par style : `tabLayoutFor(styleKey)` |
| médaillon mascotte | `<MascotMedallion size=220\|112\|76 withLogo/>` (disque, conservé) ; `<MascotHero>` ancienne mascotte carrée ; fenêtre en arche de lin : `<Arch>` (ci-dessous) |
| `.glass` `.glass.tinted` `.glass.strong` | `<GlassSurface strong tinted radius interactive heavy/>` (verre natif iOS 26+ → flou → opaque) |
| `<svg viewBox="0 0 24 24">` | `<Icon name size color strokeWidth filled/>` |

Mesures du canevas : écran 402 pt, marges 16, barre d'onglets 62 pt à 25 pt du bas, cibles ≥ 44, rangée ≥ 52, filet 0,5 pt.
`.card` / `.list` : rayon 26, filet 1 pt `separator`, ombre `--shadow-card` (Card, List).
Positionnement `.navbar` / `.tabbar` (absolus dans la maquette) : NavBar `overlay` par défaut (réserver `useNavBarHeight()`),
FloatingTabBar dans le flux (réserver `TAB_BAR_INSET` seulement si on la superpose). Un seul empilement de verre par zone.

## Matières (blocs « Matières » de final.css → RN)
Règle : plus un élément se touche ou se garde, plus il a de matière ; ce qu'on lit reste lisse.
verre = ce qui flotte · **papier** = ce qu'on garde · **feutre** = ce qu'on touche · **velours** = la semaine · **émail** = le seul geste jaune · **lin** = l'arche de la mascotte.

| Matière (CSS) | Composant RN | Notes |
|---|---|---|
| `.paper`, `.paper.laid`, `.frame` | `<Paper laid? framed? radius padding/>` | fond `colors.paper` (#FFFEFB Lin, #F7F5F2 Veillée) + tuile `paper` (+ `laid`) ; **encre toujours marine** : le sous-arbre redéfinit `label/label2/separator/sageText/tintText` (comme `.paper` surcharge `--label…`), donc un `ThemedText` y est lisible en Veillée. `framed` = double filet sauge de certificat |
| `.felt`, `.felt-strong` | `<Felt strong? raised? color radius padding/>` | marine #004E7A, tuile `felt` / `feltStrong` en `mixBlendMode: soft-light`, filet de lumière haut, ombre basse. `raised` = feutre #0B3C59 cerclé de Veillée (onglet Prominent) |
| `.velvet` | `<Velvet radius padding/>` | #00314C, tuiles `ribs` + `grainSoft`, reflet diagonal, ombre intérieure basse ; encre crème |
| `.enamel`, `.btn.sun` | `<Enamel radius padding/>` | **le seul geste jaune #F9EB50** (dégradé radial #FDF7A0 → #F9EB50 → #E9D93C + tuile `enamel` soft-light + halo) |
| `.star-on` / `.star-off` | `<Star on size accessibilityLabel/>` | `on` = émail + halo `starGlow` (un geste soleil !) ; `off` = creux sombre |
| `.arch`, `.arch.sm`, `.arch.xs` | `<Arch size="md\|sm\|xs" width height source withLogo/>` | passe-partout de lin #EFE9DD (tuile `linen` en motif SVG) taillé en arche (coins hauts elliptiques 50 %/44,8 %) autour de la mascotte ACT-0603 ; étend `MascotMedallion` (mêmes `withLogo`, `accessibilityLabel`) |
| `--lamp` | `<Lamp/>` | halo de lampe (ellipse soleil, 34 % Lin / 17 % Veillée) en calque `absoluteFill`, sans animation |
| textures (`--mat-*`) | `<Texture name opacity blend/>` | tuiles PNG ≤ 20 Ko dans `assets/brand/textures/` exportées par `scripts/design/export-textures.mjs` ; `Image resizeMode="repeat"`, jamais animées. **Repli** : si la tuile échoue ou sur Android (`repeat` non géré), aplat de couleur seul |

Les spécifications pures (quelle tuile, quel fond, quelle géométrie d'arche) sont dans `materialSpecs.ts` (testées) ; les composants ne font que les poser. Pas de `expo-image` (absent) : `Image` de RN.
Fraunces : l'axe `SOFT 100` n'existe pas en RN → instances statiques 500 (grands titres) et 600 (petits titres, titre de barre), écart connu.

### Règle : un seul geste soleil par écran
Le jaune #F9EB50 est l'identité n° 1 : **un seul** `Enamel` / `Button variant="prom"` en Veillée / `Button variant="accent"` / `Star on` / anneau soleil par écran. Un second geste passe en sauge (`colors.sage`, `badgeBg`/`badgeInk`) ou en verre. En Lin, le bouton principal est un feutre marine (pas de jaune) : le soleil y reste disponible pour Lancer, l'étoile ou l'anneau.

## ThemeScope : forcer un style pour un sous-arbre
`<ThemeScope style="veillee" fill>…</ThemeScope>` : tous les `useTheme()` du sous-arbre voient les tokens Veillée (`isDark`, `colors`, `metrics`…) ; `fill` peint en plus le fond `#022539` et le halo de lampe. `setStyle` et les préférences d'accessibilité restent ceux de l'app. **Le mode activité s'y enveloppe toujours**, même si le parent a choisi Lin. `scopeTheme()` / `themeFor()` (themeValue.ts) sont la version pure, testée.

## Onglets (barre du parent, écrans K · G · S · U)
- **Lin** : Maison (maison) · Bilan (étincelles) · Mes séances (calendrier) + Prominent **Coach** (bulle, `messages`).
- **Veillée** : mêmes trois + Prominent **Ce soir** (lecture, `maison`).
Le Prominent est un feutre rond de 62 pt, icône seule (libellé = `accessibilityLabel`, jamais affiché) ; jamais jaune. Choix : `tabLayoutFor(styleKey)`.
`activeTabKey(layout, route)` : la route du seul Prominent (Coach) n'allume aucun onglet. La barre ne lit ni ne recalcule les droits (`access_state()`) : les écrans verrouillés (Maison seul) sont gérés par `LockedSection`/`LockOverlay`.

## Icônes (`icons.tsx`)
check chevronRight chevronLeft close lock sparkles calendar home chevronDown bell pulse play share chat info timer people gift
document more search tray shieldCheck chevronUpDown star pencil grid video pause mail moon idCard plus phone faceId target toolbox
camera runner compass book arrowRight person quote copy leaf hand medal key arrowUp eye settings restore.
Épaisseur par défaut 1,85 (coche, chevrons 2,4) ; `strokeWidth` pour 1,6 (grandes icônes) ou 2,2.

## Tokens (`useTheme()` → `colors`, `metrics`, `styleKey`, `isDark`)
Fonds `bgGrouped bgGrouped2 bgGrouped3 elev tab` · textes `label label2 label3 label4` · `separator sepOpaque` · `fill fill2 fill3 fill4`
· `tint tintInk tintSoft tintText accent accentInk kid kidText ok okSoft warn bad` · verre `glass glassStrong glassEdge glassSpec glassTint`
· `bubIn bubOut segOn tabOn navActive badgeBg badgeInk tglOn starGlow` · marque `navy600 navy900 cream sun sage sageInk sageText linen`
· papier `paper paperInk paperInk2 paperSage` (l'encre du papier est marine dans les deux styles) · système `sysRed sysOrange sysYellow sysGreen
sysMint sysTeal sysCyan sysBlue sysIndigo sysPurple sysPink`. `sageInk` = #46695F constant (sauge sur papier) ; `sageText` = la sauge
lisible sur le fond du style (#46695F Lin, #A7C4BC Veillée : étiquettes `eyebrow`/`kick`, liens de section).
`metrics` = `cardRadius rowRadius displayFamily displayWeight displayTrack largeTitleSize largeTitleLine cardShadow lamp`.
`MATERIALS` = valeurs des matières (papier, feutre, velours, émail, étoile, arche). Texte secondaire jamais en `label3` (décoratif).
Constantes : `CANVAS`, `SPACING`, `RADIUS`, `SHADOW_CARD`. `withAlpha(color, a)` = `color-mix(… a%, transparent)`.
Contraste : `contrastPairs(style)` liste toutes les paires encre/fond à 4,5:1 (3:1 gros texte ou non-texte), testées pour les deux styles.

## Style choisi, thème, accessibilité, tests
- `<ThemeProvider fontsLoaded>` (app/_layout.tsx). Style : `useStyleChoice()` → `{ styleKey, setStyle }` (`'lin' | 'veillee'`, défaut `lin`),
  persisté dans AsyncStorage `thrive.uiStyle` et synchronisé avec `profiles.ui_style` (RPC `set_ui_style`, migration 083).
- **Migration des valeurs** : tout ce qui est lu (AsyncStorage, serveur) passe par `normalizeStyle()` / `parseStyle()` (`styleMigration.ts`) :
  `natif`/`carnet` → `lin`, `nuit` → `veillee`, inconnue ou absente → défaut. Une ancienne valeur stockée est réécrite au nouveau format.
- « Réduire la transparence » → verre opaque ; « Réduire les animations » → `useTheme().reduceMotion`. Dynamic Type respecté.
- Polices : Inter 400–800, Fraunces 400/500/600 (`FONT_ASSETS`). Repli système tant qu'elles chargent.
- `VignetteImage id` (52 webp, repli ACT-0603), `resolveVignetteId`. `Capsule`, `Pill` : capsule de verre sur image, pastille simple.
- Tests (depuis `apps/mobile`) : `../web/node_modules/.bin/vitest run src/design src/components src/services src/lib` — `canvasFidelity.test.ts`
  compare tokens, matières, échelle de texte et tracés d'icônes à `maquettes-ios27/final.css`, `ios27.css`, `icons.js`.
