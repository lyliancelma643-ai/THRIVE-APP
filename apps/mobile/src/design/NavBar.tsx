import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlassMode } from './GlassSurface';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { withAlpha } from './tokens';

/** Hauteur de la ligne de boutons (`.navbar .bar`). */
export const NAV_BAR_ROW = 54;

/** Hauteur totale de la barre (zone sûre haute + 54) : à utiliser en `paddingTop` du contenu défilant. */
export function useNavBarHeight(): number {
  const insets = useSafeAreaInsets();
  return insets.top + NAV_BAR_ROW;
}

const useNative = Platform.OS !== 'web';

export type NavBarProps = {
  /** Titre centré (`.ttl`, 600 17/22). */
  title?: string;
  /** Titre invisible tant que le grand titre est affiché (cf. `useLargeTitle`). Défaut : visible. */
  titleVisible?: boolean;
  /** Groupe gauche : `<GlassButton glyph="chevronLeft" …/>` ou `<GlassGroup>`. */
  left?: ReactNode;
  /** Groupe droit : `<GlassButton/>`, `<GlassPair/>`, `<GlassGroup>`. */
  right?: ReactNode;
  /** `.navbar.edge.hard` : fond du style à 78 %, flou 22 et filet bas 0,5 pt (contenu qui défile dessous). */
  edge?: boolean;
  /**
   * true (défaut) : posée en haut par-dessus le contenu (`position: absolute`, comme le canevas) ; le contenu
   * défilant réserve `useNavBarHeight()`. false : dans le flux.
   */
  overlay?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Barre de navigation en verre (`.navbar > .bar`) : groupes gauche/droite de boutons 44 pt, titre centré,
 * bord de défilement dur (`.edge`) activé par `edge`.
 */
export function NavBar({ title, titleVisible = true, left, right, edge = false, overlay = true, style }: NavBarProps) {
  const { colors, isDark } = useTheme();
  const mode = useGlassMode();
  const insets = useSafeAreaInsets();
  const edgeAnim = useRef(new Animated.Value(edge ? 1 : 0)).current;
  const titleAnim = useRef(new Animated.Value(titleVisible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(edgeAnim, { toValue: edge ? 1 : 0, duration: 160, useNativeDriver: useNative }).start();
  }, [edge, edgeAnim]);
  useEffect(() => {
    Animated.timing(titleAnim, { toValue: titleVisible ? 1 : 0, duration: 160, useNativeDriver: useNative }).start();
  }, [titleVisible, titleAnim]);

  return (
    <View
      style={[
        overlay ? { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40 } : null,
        { paddingTop: insets.top },
        style,
      ]}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: edgeAnim }]}>
        {mode !== 'opaque' ? <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: mode === 'opaque' ? colors.bgGrouped : withAlpha(colors.bgGrouped, 0.78),
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.separator,
            },
          ]}
        />
      </Animated.View>
      <View style={{ height: NAV_BAR_ROW, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 8 }}>
        <View style={{ zIndex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>{left}</View>
        {title ? (
          <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: titleAnim }}
          >
            <ThemedText variant="headline" numberOfLines={1} accessibilityRole="header" style={{ maxWidth: '55%' }}>
              {title}
            </ThemedText>
          </Animated.View>
        ) : null}
        <View style={{ zIndex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>{right}</View>
      </View>
    </View>
  );
}

export type LargeTitleProps = {
  children: string;
  /** `.subtitle-nav` : 15/20 `label2`. */
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
};

/** `.largetitle` : 34/41 (Inter 700) ou 36/42 (Fraunces 600 en Carnet), padding 4 16 0. */
export function LargeTitle({ children, subtitle, style }: LargeTitleProps) {
  return (
    <View style={style}>
      <ThemedText variant="largetitle" accessibilityRole="header" style={{ paddingTop: 4, paddingHorizontal: 16 }}>
        {children}
      </ThemedText>
      {subtitle ? (
        <ThemedText variant="sub" color="label2" style={{ paddingTop: 2, paddingHorizontal: 16 }}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

type ScrollHandler = (e: NativeSyntheticEvent<NativeScrollEvent>) => void;

/**
 * Bord de défilement : `edge` devient vrai dès que le contenu passe sous la barre.
 * Usage : `const s = useScrollEdge(); <ScrollView onScroll={s.onScroll} scrollEventThrottle={16}> … <NavBar edge={s.edge} />`.
 */
export function useScrollEdge(threshold = 2): { edge: boolean; onScroll: ScrollHandler; scrollEventThrottle: number } {
  const [edge, setEdge] = useState(false);
  const onScroll = useCallback<ScrollHandler>(
    (e) => {
      const y = e.nativeEvent.contentOffset.y;
      setEdge((prev) => (prev === y > threshold ? prev : y > threshold));
    },
    [threshold],
  );
  return { edge, onScroll, scrollEventThrottle: 16 };
}

/**
 * Grand titre qui se replie : le titre centré de la `NavBar` apparaît quand le grand titre a quitté l'écran.
 * `collapseAt` = décalage (pt) où le grand titre disparaît (défaut 34).
 */
export function useLargeTitle(collapseAt = 34): { edge: boolean; titleVisible: boolean; onScroll: ScrollHandler; scrollEventThrottle: number } {
  const [state, setState] = useState({ edge: false, titleVisible: false });
  const onScroll = useCallback<ScrollHandler>(
    (e) => {
      const y = e.nativeEvent.contentOffset.y;
      const edge = y > 2;
      const titleVisible = y >= collapseAt;
      setState((prev) => (prev.edge === edge && prev.titleVisible === titleVisible ? prev : { edge, titleVisible }));
    },
    [collapseAt],
  );
  return { ...state, onScroll, scrollEventThrottle: 16 };
}
