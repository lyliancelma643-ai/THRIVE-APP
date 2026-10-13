# design/ — primitives THRIVE fidèles au canevas Claude Design

Source de vérité visuelle : `docs/design/claude-design-ios27/` (feuille `_blob/c8a22b05….css`, écrans `project/*.dc.html`,
captures `reference/*.png`). V1 = **natif**, V2 = **nuit** (Nuit calme), V3 = **carnet** (Carnet de saison).
Import unique : `import { … } from '../../design'`. Aucune couleur en dur : `useTheme().colors.<token>` ; aucune donnée de démo
(Léo, Camille, 7 novembre…) : on reproduit la forme, jamais le contenu. Galerie de contrôle (DEV) : route `/__design`.

## Traduire le HTML du canevas, mécaniquement
| Classe CSS | Composant RN (props) |
|---|---|
| `.navbar > .bar` `.grp` `.ttl` `.edge` | `<NavBar title left right edge titleVisible overlay />` ; `<GlassGroup>` ; `useNavBarHeight()` pour le `paddingTop` du contenu ; `useScrollEdge()` / `useLargeTitle()` pilotent `edge` |
| `.largetitle` `.subtitle-nav` | `<LargeTitle subtitle>` (34/41 Inter 700 ; 36/42 Fraunces 600 en Carnet) |
| `.gbtn.glass` `.ic` `.tinted` `.pair` | `<GlassButton glyph label tinted onPress accessibilityLabel/>` ; `<GlassPair items=[{glyph,accessibilityLabel,onPress,badge}]/>` |
| `.t-largetitle … .t-cap2` `.c2 .c3 .ctint` | `<ThemedText variant="largetitle\|title1\|title2\|title3\|headline\|body\|callout\|sub\|foot\|cap\|cap2" color="label2\|label3\|tintText" weight>` |
| `.sec` / `.sec-h` / `.sec-h.small` / `.sec-f` | `<Section>` / `<SectionHeader title action>` / `<SectionHeader small title>` / `<SectionFooter>` |
| `.list` `.rowi` `.ico` `.ico-lg` `.ibadge` | `<List>` + `<ListRow glyph iconColor="sysBlue" large title subtitle value chevron toggle checked accessory destructive onPress/>` (`last` posé tout seul) ; avatar/vignette en tête : `leading` + `leadingInset` |
| `.rowi.danger` | `<ListRow destructive title onPress/>` (rouge, centré) |
| `.field label .in` `.caret` | `<Field label value onChangeText placeholder secureTextEntry … />` ; valeur statique : `<Field label>…</Field>` |
| `.card` `.card .kick` `.grid2` | `<Card padding onPress>` ; `<Kicker glyph>` ; `<Grid2>` (deux colonnes, gap 12) |
| `.btn.prom` / `.gray` / `.plain` / `.plainglass` / `.accent` / `.sm` / `.md` | `<Button label variant="prom\|gray\|plain\|plainglass\|accent\|danger" size="lg\|md\|sm" glyph flex loading/>` (`lg` pleine largeur 52 pt) |
| `.tag` `.tag.ok` `.tag.gray` | `<Tag label tone="tint\|ok\|gray" glyph/>` (anciennement `<Pill>` : conservé) |
| `.chip` `.chip.on` `.chips` | `<Chip label on glyph tall surface onPress/>` ; `<Chips scroll>` ; `<Pills>` (wrap) |
| `.seg` | `<Segmented options=[{key,label}] value onChange/>` |
| `.bar-p` | `<ProgressBar value=0..1 color valueText/>` |
| `.tgl` | `<Toggle value onValueChange accessibilityLabel/>` (ou `toggle` d'une ListRow) |
| `.slider` | `<Slider value onChange min max step accessibilityLabel valueText/>` |
| `.sheet` `.grabber` `.sbar` `.dim` `.float` `.glassy` | `<Sheet visible onClose title detent="medium"(float+verre)\|"large" trailing dim scroll/>` |
| `.menu` `.mi` `.mi.on` `.mi.sep` | `<GlassMenu items=[{label,onPress,checked,destructive,separator}]/>` ; `<MenuPopover visible top left right …/>` |
| `.avatar` | `<Avatar label size color="kid" background ink uri/>` |
| `.lock-ov` `.muted-preview` | `<LockOverlay preview align="center\|end">carte</LockOverlay>` + `<MutedPreview>` |
| `.fade-bottom` | `<FadeBottom/>` (sous la barre d'onglets) |
| `.tabbar .tabs .tab .prom` | `<FloatingTabBar tabs activeKey onSelect prominent={{label,glyph,tinted,onPress}}/>` ; onglets par style : `TAB_LAYOUTS[style]` |
| médaillon mascotte (A, B) | `<MascotMedallion size=220\|112\|76 withLogo/>` ; `<MascotHero>` reste l'ancienne mascotte carrée |
| `.glass` `.glass.tinted` `.glass.strong` | `<GlassSurface strong tinted radius interactive heavy/>` (verre natif iOS 26+ → flou → opaque) |
| `<svg viewBox="0 0 24 24">` | `<Icon name size color strokeWidth filled/>` |

Mesures du canevas : écran 402 pt, marges 16, barre d'onglets 62 pt à 25 pt du bas, cibles ≥ 44, rangée ≥ 52, filet 0,5 pt.
Positionnement `.navbar` / `.tabbar` (absolus dans la maquette) : NavBar `overlay` par défaut (réserver `useNavBarHeight()`),
FloatingTabBar dans le flux (réserver `TAB_BAR_INSET` seulement si on la superpose). Un seul empilement de verre par zone.

## Onglets (barre du parent, écrans K · G · S · U)
- Natif : Maison (maison) · Bilan (étincelles) · Mes séances (calendrier) + Coach (bulle, `messages`), verre neutre, teinté quand actif.
- Nuit calme : mêmes trois + « Ce soir » (lecture, `maison`) toujours teinté soleil.
- Carnet : Ce soir (lune) · Bilan (carte d'identité) · Mes séances + « Rechercher » (loupe, renvoie vers `maison`), verre neutre.
L'onglet Prominent est une icône seule (libellé = VoiceOver).

## Icônes (`icons.tsx`, 53, tracés extraits des écrans)
check chevronRight chevronLeft close lock sparkles calendar home chevronDown bell pulse play share chat info timer people gift
document more search tray shieldCheck chevronUpDown star pencil grid video pause mail moon idCard plus phone faceId target toolbox
camera runner compass book arrowRight person quote copy leaf hand medal key arrowUp eye settings restore.
Épaisseur par défaut 1,85 (coche, chevrons 2,4) ; `strokeWidth` pour 1,6 (grandes icônes) ou 2,2.

## Tokens (`useTheme()` → `colors`, `metrics`, `style`, `isDark`)
Fonds `bgGrouped bgGrouped2 bgGrouped3 elev` · textes `label label2 label3 label4` · `separator sepOpaque` · `fill fill2 fill3 fill4`
· `tint tintInk tintSoft tintText accent accentInk kid kidText ok okSoft warn bad` · verre `glass glassStrong glassEdge glassSpec glassTint`
· `bubIn segOn tabOn` · marque `navy600 navy900 cream sun sage sageInk` · système `sysRed sysOrange sysYellow sysGreen sysMint sysTeal
sysCyan sysBlue sysIndigo sysPurple sysPink`. `metrics` = `cardRadius rowRadius displayFamily displayWeight displayTrack cardShadow`
(Carnet : 24/22, Fraunces, ombre). Texte secondaire jamais en `label3` (décoratif). Constantes : `CANVAS`, `SPACING`, `RADIUS`.
`withAlpha(color, a)` = `color-mix(… a%, transparent)`.

## Thème, accessibilité, tests
- `<ThemeProvider fontsLoaded>` (app/_layout.tsx) ; `useStyleChoice()` (AsyncStorage `thrive.uiStyle`, synchro serveur 083).
- « Réduire la transparence » → verre opaque ; « Réduire les animations » → `useTheme().reduceMotion`. Dynamic Type respecté.
- Polices : Inter 400–800, Fraunces 400/500/600 (`FONT_ASSETS`). Repli système tant qu'elles chargent.
- `VignetteImage id` (52 webp, repli ACT-0603), `resolveVignetteId`. `Capsule`, `Pill` : capsule de verre sur image, pastille simple.
- Tests : `cd apps/web && npx vitest run --root ../mobile src/design` — `canvasFidelity.test.ts` compare tokens, échelle de texte et
  tracés d'icônes à la feuille de style et aux écrans du canevas.
