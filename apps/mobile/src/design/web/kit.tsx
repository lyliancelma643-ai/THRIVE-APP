import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  Animated, Easing, Pressable, StyleSheet, Text, View,
  type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Enamel } from '../Materials';
import { useTheme } from '../ThemeProvider';
import { FONT_FAMILIES } from '../tokens';
import { webPalette, type WebPalette, type WebSurface } from './palette';
import { WIcon, type WIconName } from './WIcon';

/* ───────────────────────────── Thème ───────────────────────────── */

const SurfaceCtx = createContext<WebSurface>('base');

/** `data-surface="maison"` du web : sous ce fournisseur, les jetons passent à la direction « Soir de famille ». */
export function WebSurfaceProvider({ surface, children }: { surface: WebSurface; children: ReactNode }) {
  return <SurfaceCtx.Provider value={surface}>{children}</SurfaceCtx.Provider>;
}

export type WebTheme = WebPalette & { fontsLoaded: boolean; reduceMotion: boolean; isNight: boolean };

/** Jetons du web pour le style courant (Veillée ↔ Nuit calme, Lin ↔ Jour clair) et la surface courante. */
export function useWeb(surfaceOverride?: WebSurface): WebTheme {
  const { styleKey, fontsLoaded, reduceMotion } = useTheme();
  const surface = useContext(SurfaceCtx);
  const s = surfaceOverride ?? surface;
  return useMemo(() => {
    const p = webPalette(styleKey, s);
    return { ...p, fontsLoaded, reduceMotion, isNight: p.ambiance === 'night' };
  }, [styleKey, s, fontsLoaded, reduceMotion]);
}

/* ───────────────────────────── Texte ───────────────────────────── */

export type Tone = 'ink' | 'body' | 'soft' | 'faint' | 'accent' | 'sage';

function toneColor(w: WebPalette, tone: Tone): string {
  switch (tone) {
    case 'body':
      return w.text2;
    case 'soft':
      return w.text3;
    case 'faint':
      return w.text4;
    case 'accent':
      return w.accentInk;
    case 'sage':
      return w.sageInk;
    default:
      return w.text;
  }
}

type Weight = 400 | 500 | 600 | 700 | 800;

export function fontFor(display: boolean, weight: Weight, italic: boolean, loaded: boolean): TextStyle {
  if (!loaded) {
    return {
      fontWeight: String(weight) as TextStyle['fontWeight'],
      ...(display ? { fontFamily: 'serif' } : null),
      ...(italic ? { fontStyle: 'italic' as const } : null),
    };
  }
  if (display && italic) return { fontFamily: weight >= 500 ? 'Fraunces_500Medium_Italic' : 'Fraunces_400Regular_Italic' };
  return { fontFamily: (display ? FONT_FAMILIES.display : FONT_FAMILIES.sans)[weight] };
}

export type WTextProps = TextProps & {
  /** Taille en px du web. */
  size?: number;
  /** Interligne : multiplicateur (≤ 3) ou valeur absolue. Défaut 1,5 (Inter) / 1,2 (Fraunces). */
  lh?: number;
  weight?: Weight;
  /** `font-display` (Fraunces). */
  display?: boolean;
  italic?: boolean;
  tone?: Tone;
  /** Couleur libre (prioritaire sur `tone`). */
  color?: string;
  /** letter-spacing en em (ex. 0.12 pour `.nc-eyebrow`). */
  tracking?: number;
  upper?: boolean;
  center?: boolean;
};

export function WText({
  size = 15, lh, weight = 400, display = false, italic = false, tone = 'body', color, tracking, upper, center, style, ...rest
}: WTextProps) {
  const w = useWeb();
  const ratio = lh ?? (display ? 1.2 : 1.5);
  const lineHeight = ratio <= 3 ? Math.round(size * ratio) : ratio;
  return (
    <Text
      {...rest}
      style={[
        fontFor(display, weight, italic, w.fontsLoaded),
        {
          fontSize: size,
          lineHeight,
          color: color ?? toneColor(w, tone),
          ...(tracking ? { letterSpacing: tracking * size } : null),
          ...(upper ? { textTransform: 'uppercase' as const } : null),
          ...(center ? { textAlign: 'center' as const } : null),
        },
        style,
      ]}
    />
  );
}

/** `.nc-eyebrow` : 12 px, 700, 0,12 em, capitales, `--text4`. */
export function Eyebrow({ children, color, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <WText size={12} weight={700} tracking={0.12} upper tone="faint" color={color} lh={1.35} style={style} accessibilityRole="header">
      {children}
    </WText>
  );
}

/* ───────────────────────────── Mouvement ───────────────────────────── */

/**
 * `.animate-om-up` : entrée en cascade (opacité 0 → 1, 16 px → 0, 0,6 s, courbe 0.22/0.61/0.36/1).
 * `delay` en secondes, comme la variable `--om-d` du web.
 */
export function FadeUp({ delay = 0, distance = 16, style, children }: { delay?: number; distance?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { reduceMotion } = useWeb();
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(v, {
      toValue: 1, duration: 600, delay: delay * 1000, easing: Easing.bezier(0.22, 0.61, 0.36, 1), useNativeDriver: true,
    }).start();
  }, [v, delay, reduceMotion]);
  return (
    <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Pression façon iOS : l'élément s'enfonce légèrement (ressort), retour haptique léger.
 * Équivaut au `button:active { transform: scale(.98) }` du web, en plus doux.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Tap({
  children, style, scaleTo = 0.97, haptic = true, onPress, disabled, ...rest
}: Omit<PressableProps, 'style'> & { children: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: v === 1 ? 6 : 0 }).start();
  // La mise en page (flex, largeur, position, rotation) reste sur l'élément touché ; l'échelle s'ajoute à sa transformation.
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const own = Array.isArray(flat.transform) ? flat.transform : [];
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        to(scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={[flat, { transform: [...own, { scale: s }] as never }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/* ───────────────────────────── Surfaces ───────────────────────────── */

/** `.nc-card` : aplat `--surface`, rayon 22 (26 sur Maison, filet + ombre longue), padding 20. */
export function NcCard({ children, style, padding = 20, ring }: { children: ReactNode; style?: StyleProp<ViewStyle>; padding?: number; ring?: string }) {
  const w = useWeb();
  const maison = w.surfaceKind === 'maison';
  return (
    <View
      style={[
        {
          backgroundColor: w.surface,
          borderRadius: maison ? 26 : 22,
          padding,
          ...(maison ? { borderWidth: 1, borderColor: w.line } : null),
          ...(ring ? { borderWidth: 1, borderColor: ring } : null),
        },
        shadowFor(w),
        style,
      ]}
    >
      {maison ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 26, borderTopWidth: 1, borderColor: 'transparent', borderTopColor: 'rgba(255,255,255,0.07)' }]} /> : null}
      {children}
    </View>
  );
}

/** `.nc-row` : même surface, rayon 18. `idle` = `.nc-row-idle` (contour seul). */
export function NcRow({ children, style, idle, ring }: { children: ReactNode; style?: StyleProp<ViewStyle>; idle?: boolean; ring?: string }) {
  const w = useWeb();
  const maison = w.surfaceKind === 'maison';
  if (idle) {
    return <View style={[{ borderRadius: 18, borderWidth: 1, borderColor: ring ?? w.line }, style]}>{children}</View>;
  }
  return (
    <View
      style={[
        { backgroundColor: w.surface, borderRadius: 18 },
        maison ? { borderWidth: 1, borderColor: w.line } : null,
        ring ? { borderWidth: 1, borderColor: ring } : null,
        shadowFor(w),
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function shadowFor(w: WebPalette): ViewStyle {
  if (w.shadowOpacity <= 0) return {};
  if (w.surfaceKind === 'maison') {
    return {
      shadowColor: w.ambiance === 'night' ? '#000000' : '#00314C',
      shadowOpacity: w.shadowOpacity * 0.6,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 14 },
      elevation: 3,
    };
  }
  return { shadowColor: '#00314C', shadowOpacity: w.shadowOpacity, shadowRadius: 11, shadowOffset: { width: 0, height: 4 }, elevation: 2 };
}

/* ───────────────────────────── Pastilles ───────────────────────────── */

/**
 * `.nc-pill` : 44 px, contour `--line2`. Active : accent plein (base) ou crème/marine (Maison : `--text` sur `--bg`).
 */
export function NcPill({ label, on, onPress, accessibilityLabel, children }: { label?: string; on: boolean; onPress: () => void; accessibilityLabel?: string; children?: ReactNode }) {
  const w = useWeb();
  const maison = w.surfaceKind === 'maison';
  const bg = on ? (maison ? w.text : w.accent) : 'transparent';
  const ink = on ? (maison ? w.bg : w.onAccent) : w.text2;
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: on ? bg : w.line2, backgroundColor: bg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children ?? (
        <WText size={14} weight={on ? 600 : 500} color={ink} numberOfLines={1}>
          {label}
        </WText>
      )}
    </Tap>
  );
}

export function PillGroup<T extends string | number>({
  value, options, onChange, wrap = true, style,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View accessibilityRole="radiogroup" style={[{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: 8 }, style]}>
      {options.map((o) => (
        <NcPill key={String(o.value)} label={o.label} on={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

/* ───────────────────────────── Boutons ───────────────────────────── */

/** `.nc-iconbtn` : rond de 44 px, contour `--line2`, icône `--text2`. */
export function IconBtn({
  icon, label, onPress, badge, background, children,
}: { icon?: WIconName; label: string; onPress: () => void; badge?: number; background?: string; children?: ReactNode }) {
  const w = useWeb();
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={2}
      style={{
        width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: w.line2, backgroundColor: background ?? 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children ?? (icon ? <WIcon name={icon} size={20} color={w.text2} /> : null)}
      {badge && badge > 0 ? (
        <View
          style={{
            position: 'absolute', top: 6, right: 6, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9,
            backgroundColor: w.accent, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <WText size={10} weight={700} color={w.onAccent} lh={12}>
            {badge > 9 ? '9+' : String(badge)}
          </WText>
        </View>
      ) : null}
    </Tap>
  );
}

/**
 * `.maison-launch` : l'émail jaune (le seul geste soleil). Le bouton seul, sans halo autour : il ne grossit pas,
 * seule la pression iOS l'enfonce légèrement.
 */
export function LaunchButton({
  label, onPress, icon = 'play', height = 56, style, accessibilityLabel, fontSize = 17,
}: { label: string; onPress: () => void; icon?: WIconName | null; height?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; fontSize?: number }) {
  const w = useWeb();
  const r = height / 2;
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} style={style}>
      <Enamel radius={r}>
        <View style={{ height, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 }}>
          {icon ? <WIcon name={icon} size={18} color={w.onAccent} /> : null}
          <WText size={fontSize} weight={700} color={w.onAccent} lh={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flexShrink: 1 }}>
            {label}
          </WText>
        </View>
      </Enamel>
    </Tap>
  );
}

/** Bouton jaune plat du web (`bg-accent text-accent-on`), pour les appels simples hors Maison. */
export function AccentButton({
  label, onPress, icon, height = 48, style, tone = 'accent',
}: { label: string; onPress: () => void; icon?: WIconName; height?: number; style?: StyleProp<ViewStyle>; tone?: 'accent' | 'sage' }) {
  const w = useWeb();
  const bg = tone === 'sage' ? w.sage : w.accent;
  const ink = tone === 'sage' ? '#022539' : w.onAccent;
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{ height, paddingHorizontal: 20, borderRadius: height / 2, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, style]}
    >
      {icon ? <WIcon name={icon} size={16} color={ink} /> : null}
      <WText size={15} weight={700} color={ink} lh={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flexShrink: 1 }}>
        {label}
      </WText>
    </Tap>
  );
}

/** Bouton secondaire du web : contour `--line2`, fond `--chip`, texte `--text`. */
export function GhostButton({
  label, onPress, icon, height = 56, style, fontSize = 16, chip = true,
}: { label: string; onPress: () => void; icon?: WIconName; height?: number; style?: StyleProp<ViewStyle>; fontSize?: number; chip?: boolean }) {
  const w = useWeb();
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        {
          height, paddingHorizontal: 18, borderRadius: height / 2, borderWidth: 1, borderColor: w.line2, backgroundColor: chip ? w.chip : 'transparent',
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        },
        style,
      ]}
    >
      {icon ? <WIcon name={icon} size={18} color={w.text} /> : null}
      <WText size={fontSize} weight={600} tone="ink" lh={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flexShrink: 1 }}>
        {label}
      </WText>
    </Tap>
  );
}

/** `BackLink` : « ‹ Maison » (15 px, 600, `--text3`). */
export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  const w = useWeb();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`Retour : ${label}`} hitSlop={8} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
      <WIcon name="chevron-left" size={16} color={w.text3} />
      <WText size={15} weight={600} tone="soft">
        {label}
      </WText>
    </Pressable>
  );
}

/** Lien texte avec chevron (« Tout voir › », « Le programme › »). */
export function MoreLink({ label, onPress, tone = 'accent', arrow = 'chevron-right' }: { label: string; onPress: () => void; tone?: Tone; arrow?: WIconName }) {
  const w = useWeb();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={label} hitSlop={8} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <WText size={14} weight={600} tone={tone}>
        {label}
      </WText>
      <WIcon name={arrow} size={16} color={tone === 'sage' ? w.sageInk : w.accentInk} />
    </Pressable>
  );
}

/** `Section` des écrans P3 : titre en `.nc-eyebrow`, marge haute 32. */
export function WSection({ title, children, style }: { title: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: 32 }, style]}>
      <Eyebrow style={{ marginBottom: 12 }}>{title}</Eyebrow>
      {children}
    </View>
  );
}

/* ───────────────────────────── Progression ───────────────────────────── */

/** `.nc-track` + `.nc-fill` : barre de 6 px qui se remplit (1,1 s après 0,35 s). */
export function Track({ pct, color }: { pct: number; color?: string }) {
  const w = useWeb();
  const v = useRef(new Animated.Value(w.reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (w.reduceMotion) return;
    Animated.timing(v, { toValue: 1, duration: 1100, delay: 350, easing: Easing.bezier(0.22, 0.61, 0.36, 1), useNativeDriver: false }).start();
  }, [v, w.reduceMotion]);
  const width = v.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.max(0, Math.min(100, pct))}%`] });
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: w.track, overflow: 'hidden' }}>
      <Animated.View style={{ height: 6, borderRadius: 3, width, backgroundColor: color ?? w.accent }} />
    </View>
  );
}

/** Squelette (`animate-pulse`). */
export function Skeleton({ height, radius = 22, style }: { height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const w = useWeb();
  const v = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.55, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View accessibilityElementsHidden style={[{ height, borderRadius: radius, backgroundColor: w.surface, opacity: v }, style]} />;
}
