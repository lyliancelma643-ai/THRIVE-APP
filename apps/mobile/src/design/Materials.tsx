import { LinearGradient } from 'expo-linear-gradient';
import { useId, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { enamelSpec, feltSpec, paperSpec, velvetSpec } from './materialSpecs';
import { ThemeContext, useTheme, type ThemeContextValue } from './ThemeProvider';
import { Texture } from './Texture';
import { MATERIALS, type ColorTokens } from './tokens';

/**
 * Matières du canevas (blocs « Matières » de final.css). Règle : plus un élément se touche ou se garde, plus il a
 * de matière ; ce qu'on lit reste lisse. Chaque matière redéfinit l'encre de son sous-arbre (comme `.paper` qui
 * surcharge `--label…`) : un `ThemedText` posé dedans est lisible quel que soit le style de l'app.
 */

/** `colors` doit être une constante de module (référence stable). */
function useInkScope(colors: Partial<ColorTokens>, isDark: boolean): ThemeContextValue {
  const parent = useTheme();
  return useMemo(() => ({ ...parent, isDark, colors: { ...parent.colors, ...colors } }), [parent, isDark, colors]);
}

const PAPER_INK: Partial<ColorTokens> = {
  label: MATERIALS.paper.ink, label2: MATERIALS.paper.ink2, label3: MATERIALS.paper.ink3, separator: MATERIALS.paper.sep,
  sageText: MATERIALS.paper.sage, tintText: MATERIALS.paper.tintText, fill3: MATERIALS.paper.fill3,
};
const FELT_INK: Partial<ColorTokens> = { label: MATERIALS.felt.ink, label2: 'rgba(247,245,242,0.84)', tintText: MATERIALS.felt.ink };
const VELVET_INK: Partial<ColorTokens> = {
  label: MATERIALS.velvet.ink, label2: MATERIALS.velvet.ink2, label3: MATERIALS.velvet.ink3, separator: MATERIALS.velvet.sep,
  fill: MATERIALS.velvet.fill, fill3: MATERIALS.velvet.fill3, tint: MATERIALS.velvet.tint, tintText: MATERIALS.velvet.tint, tintInk: MATERIALS.velvet.tintInk,
};
const ENAMEL_INK: Partial<ColorTokens> = { label: MATERIALS.enamel.ink, label2: MATERIALS.enamel.ink, tintText: MATERIALS.enamel.ink };

type SurfaceProps = ViewProps & {
  children?: ReactNode;
  /** Rayon (défaut : rayon des cartes, 26). */
  radius?: number;
  /** Padding du contenu (appliqué à l'intérieur de la matière). */
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

/* ───────────────────────────── Papier vélin / vergé ───────────────────────────── */

export type PaperProps = SurfaceProps & {
  /** `.paper.laid` : papier vergé (lignes de vergeure en plus du grain). */
  laid?: boolean;
  /** `.frame` : double filet sauge de certificat. */
  framed?: boolean;
};

/**
 * `.paper` : ce qu'on garde (fiches, lettre, certificat). Fond `--paper` (crème en Lin, #F7F5F2 en Veillée),
 * grain de papier, ombre longue. Encre TOUJOURS marine (#022539), dans les deux styles.
 */
export function Paper({ laid, framed, radius, padding = 0, style, children, ...rest }: PaperProps) {
  const { styleKey, metrics } = useTheme();
  const spec = paperSpec(styleKey, { laid, framed });
  const m = MATERIALS.paper;
  const r = radius ?? metrics.cardRadius;
  const scope = useInkScope(PAPER_INK, false);
  return (
    <ThemeContext.Provider value={scope}>
      <View
        {...rest}
        style={[
          {
            borderRadius: r, backgroundColor: spec.background,
            shadowColor: m.shadow.color, shadowOpacity: m.shadow.opacity, shadowRadius: m.shadow.radius,
            shadowOffset: { width: 0, height: m.shadow.offsetY }, elevation: 4,
          },
          style,
        ]}
      >
        <View style={{ borderRadius: r, overflow: 'hidden', padding }}>
          {spec.textures.map((t) => (
            <Texture key={t} name={t} />
          ))}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' }]} />
          {spec.frame ? (
            <>
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, borderWidth: 1, borderColor: m.frame }]} />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute', top: m.frameInset, left: m.frameInset, right: m.frameInset, bottom: m.frameInset,
                  borderRadius: Math.max(r - m.frameInset, 0), borderWidth: 1, borderColor: m.frameInner,
                }}
              />
            </>
          ) : null}
          {children}
        </View>
      </View>
    </ThemeContext.Provider>
  );
}

/* ───────────────────────────── Feutre ───────────────────────────── */

export type FeltProps = SurfaceProps & {
  /** `.felt-strong` : feutre plus marqué (portes de Maison, bouton principal du jour). */
  strong?: boolean;
  /** Fond libre (défaut marine #004E7A). */
  color?: string;
  /** Veillée : feutre « surélevé » plus clair et cerclé (onglet Prominent). Sans effet en Lin. */
  raised?: boolean;
};

/** `.felt` : ce qu'on touche. Aplat marine + grain de feutre en mélange doux, filet de lumière haut, ombre basse. */
export function Felt({ strong, raised, color, radius = 26, padding = 0, style, children, ...rest }: FeltProps) {
  const { styleKey } = useTheme();
  const spec = feltSpec(styleKey, { strong, raised });
  const scope = useInkScope(FELT_INK, true);
  return (
    <ThemeContext.Provider value={scope}>
      <View
        {...rest}
        style={[
          {
            borderRadius: radius, backgroundColor: color ?? spec.background,
            shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 11, shadowOffset: { width: 0, height: 8 }, elevation: 4,
          },
          style,
        ]}
      >
        <View style={{ borderRadius: radius, overflow: 'hidden', padding }}>
          <Texture name={spec.texture} />
          {/* inset 0 -3px 8px rgba(0,0,0,.22) du web : une ombre de 11 pt au pied, quelle que soit la hauteur. */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.22)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 11 }}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: radius, borderTopWidth: 1, borderColor: 'transparent', borderTopColor: 'rgba(255,255,255,0.14)' }]}
          />
          {spec.edge ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderColor: spec.edge }]} />
          ) : null}
          {children}
        </View>
      </View>
    </ThemeContext.Provider>
  );
}

/* ───────────────────────────── Velours côtelé ───────────────────────────── */

export type VelvetProps = SurfaceProps;

/** `.velvet` : la semaine, le parcours. Marine #00314C, côtes + grain doux, reflet diagonal, ombre intérieure basse. */
export function Velvet({ radius = 26, padding = 0, style, children, ...rest }: VelvetProps) {
  const spec = velvetSpec();
  const scope = useInkScope(VELVET_INK, true);
  return (
    <ThemeContext.Provider value={scope}>
      <View
        {...rest}
        style={[
          {
            borderRadius: radius, backgroundColor: spec.background,
            shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 14 }, elevation: 5,
          },
          style,
        ]}
      >
        <View style={{ borderRadius: radius, overflow: 'hidden', padding }}>
          {spec.textures.map((t) => (
            <Texture key={t} name={t} />
          ))}
          {/* linear-gradient(115deg, blanc .07 → 0 (38 %) → 0 (62 %) → blanc .05) */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.05)']}
            locations={[0, 0.38, 0.62, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* inset 0 -10px 24px rgba(0,0,0,.25) */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 34 }}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: radius, borderTopWidth: 1, borderColor: 'transparent', borderTopColor: 'rgba(255,255,255,0.1)' }]}
          />
          {children}
        </View>
      </View>
    </ThemeContext.Provider>
  );
}

/* ───────────────────────────── Émail ───────────────────────────── */

export type EnamelProps = SurfaceProps;

/**
 * `.enamel` : LE seul geste jaune (#F9EB50) de l'écran — Lancer, étoile, bouton principal de Veillée.
 * Un second émail sur le même écran passe en sauge (`colors.sage`) ou en verre.
 */
export function Enamel({ radius = 26, padding = 0, style, children, ...rest }: EnamelProps) {
  const spec = enamelSpec();
  const m = MATERIALS.enamel;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const scope = useInkScope(ENAMEL_INK, false);
  return (
    <ThemeContext.Provider value={scope}>
      <View
        {...rest}
        style={[
          {
            borderRadius: radius, backgroundColor: spec.background,
            shadowColor: m.shadow.color, shadowOpacity: m.shadow.opacity, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 5,
          },
          style,
        ]}
      >
        <View style={{ borderRadius: radius, overflow: 'hidden', padding }}>
          {/* radial-gradient(120% 90% at 30% 10%, #FDF7A0, #F9EB50 45 %, #E9D93C) */}
          <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id={`enamelBg${uid}`} cx="30" cy="10" rx="120" ry="90" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={spec.stops[0]} />
                <Stop offset="0.45" stopColor={spec.stops[1]} />
                <Stop offset="1" stopColor={spec.stops[2]} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill={`url(#enamelBg${uid})`} />
          </Svg>
          <Texture name={spec.texture} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(140,120,0,0)', 'rgba(140,120,0,0.28)']}
            start={{ x: 0, y: 0.85 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: radius, borderTopWidth: 1.5, borderColor: 'transparent', borderTopColor: 'rgba(255,255,255,0.8)' }]}
          />
          {children}
        </View>
      </View>
    </ThemeContext.Provider>
  );
}
