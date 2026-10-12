# design/ — THRIVE iOS 27 (fondations)

Import unique : `import { … } from '../../design'` (ou `@/design`). Source : `docs/design/ios27-design-system/project/tokens.json`.

## Styles et thème
- `StyleKey = 'natif' | 'nuit' | 'carnet'` (= light / dark / creme). Défaut `natif`. `STYLE_LABELS`, `STYLE_KEYS`.
- `<ThemeProvider fontsLoaded>` est monté dans `app/_layout.tsx`. `useTheme()` renvoie
  `{ style, isDark, colors, spacing, radius, type, setStyle, reduceTransparency, reduceMotion, fontsLoaded }`.
- `useStyleChoice()` -> `{ style, setStyle }` (AsyncStorage `thrive.uiStyle`, try/catch).
- Jamais de couleur en dur : `const { colors } = useTheme(); colors.tint`.

## Tokens couleur (camelCase de tokens.json)
bgGrouped, bgGrouped2, bgGrouped3, label, label2, label3 (jamais en texte), separator, fill, fill3, tint, tintInk,
accent, accentInk, kid, ok, warn, bad, glass, glassStrong, glassEdge, glassSpec, navy600, navy900, cream, sun, sage,
sageInk, sysGreen, sysRed, sysOrange, sysBlue, sysIndigo, sysTeal.
Mesures : `SPACING` (space1..8, touchMin 44, rowMin 52, tabbarH 62), `RADIUS` (chip, tile, card, cardCarnet, sheet,
sheetFloat, full), `SHADOW_CARD_CARNET` (seule ombre, Carnet), `SHADOW_THUMB`. Texte : `TYPE` (largeTitle ... caption2,
numeralHero, displayLarge/displayQuote = Fraunces).

## Composants
- `<ThemedText variant="body" color="label2">` : variant = clé de `TYPE`, color = token. Inter chargé via `useFonts(FONT_ASSETS)`.
- `<GlassSurface strong? radius? tintColor? interactive?>` : verre natif (expo-glass-effect, iOS 26+) -> expo-blur ->
  opaque si « Réduire la transparence ». `useGlassMode()` -> 'liquid'|'blur'|'opaque'. Pas de verre sur verre.
- `<GlassButton label? icon? tinted? onPress accessibilityLabel>` : 44 pt, `icon` = nom Ionicons, une seule teintée par barre.
- `<ListGroup><ListRow title subtitle? value? icon? iconColor="sysOrange" chevron? accessory? destructive? last? onPress?/></ListGroup>`.
- `<Sheet visible onClose title detent="medium"|"large">` : Modal natif (pas de piège `position: fixed`).
- `<Capsule label icon?>` : capsule de verre sur image. `<Pill label tone="neutral|tint|accent|ok">` : info non interactive.
- `<Slider value onChange min max step accessibilityLabel valueText?>` : curseur verre, rôle adjustable.
- `<VignetteImage id="ACT-0101" accessibilityLabel? style />` : 52 webp ; id inconnu / ACT-0704 -> ACT-0603.
  `resolveVignetteId(id)`, `VIGNETTE_IDS`, `BASE_VIGNETTE_ID`.
- `<MascotHero size withLogo?>`, `BRAND_LOGO` (require du logo).
- `<FloatingTabBar tabs activeKey onSelect prominent>` + `TAB_BAR_INSET` (62 + 25). Rendue dans le flux, pas en absolu.
- `TAB_LAYOUTS[style]`, `tabLayoutFor(style)`, `HIDDEN_FROM_BAR` : onglets par style (cf. `(parent)/_layout.tsx`).

## Contraste
`contrastRatio(fg, bg)` (WCAG, gère rgba), `AA_TEXT = 4.5`, `AA_LARGE = 3`.

## Exemple
```tsx
const { colors, style } = useTheme();
<View style={{ backgroundColor: colors.bgGrouped }}>
  <ThemedText variant={style === 'carnet' ? 'displayLarge' : 'largeTitle'}>Ce soir</ThemedText>
  <ListGroup><ListRow icon="settings" iconColor="sysIndigo" title="Compte" onPress={go} last /></ListGroup>
</View>
```

## Tests
`cd apps/web && npx vitest run --root ../mobile src/design` (logique pure : tokens, contraste, onglets, vignettes).
