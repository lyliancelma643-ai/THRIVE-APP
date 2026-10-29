import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Pressable, View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTabDragNav } from '@thrive/shared';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './icons';
import { Felt } from './Materials';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { Texture } from './Texture';
import { SPACING } from './tokens';

export type FloatingTab = {
  key: string;
  label: string;
  /** Icône du canevas (`icons.tsx`) : à préférer. */
  glyph?: IconName;
  /** Ancien : nom Ionicons (compatibilité). */
  icon?: keyof typeof Ionicons.glyphMap;
};

export type FloatingTabBarProps = {
  tabs: readonly FloatingTab[];
  activeKey: string;
  onSelect: (key: string) => void;
  /**
   * Onglet Prominent (`.prom`) : rond de 62 pt détaché, icône seule (le libellé ne sert qu'à VoiceOver).
   * Toujours en feutre (marine #004E7A en Lin, #0B3C59 cerclé en Veillée) : jamais de jaune.
   */
  prominent?: FloatingTab & { onPress: () => void; badge?: number };
};

/** Hauteur à réserver sous le contenu : barre + marge basse (hors zone sûre). */
export const TAB_BAR_INSET = SPACING.tabbarH + SPACING.space6;

const PAD = 5;
const HOLD_MS = 170;
const MOVE_SLOP = 6;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * `.tabbar` : capsule de verre grainé de 62 pt (`.tabs`, padding 5) à 3 onglets + onglet Prominent rond détaché.
 * Rendue dans le flux (pas en absolu) : le contenu s'arrête au-dessus ; le fond reprend `bgGrouped`.
 *
 * Repère « verre liquide » (LiquidTabBar.tsx du web) :
 *   • Toucher : l'onglet s'ouvre, le repère glisse avec un léger rebond.
 *   • Maintenir (≈ 170 ms) : le repère se soulève sous le doigt — plus grand, plus clair, comme une goutte de verre.
 *   • Glisser : la goutte suit le doigt et s'étire selon la vitesse ; chaque onglet survolé s'allume (petit retour
 *     haptique) et la page ne change que si la goutte s'y attarde (~220 ms) ou au lâcher — jamais une rafale de
 *     changements d'onglet pendant le glissé (cf. createTabDragNav : c'était la cause des pages blanches).
 *   • Lâcher : la goutte se pose sur l'onglet le plus proche, avec un rebond.
 * « Réduire les animations » coupe l'étirement et le rebond.
 */
export function FloatingTabBar({ tabs, activeKey, onSelect, prominent }: FloatingTabBarProps) {
  const { colors, styleKey } = useTheme();
  const insets = useSafeAreaInsets();
  const n = tabs.length;
  // -1 : la route ouverte n'est pas dans la barre (Messages…) — la goutte reste sur le premier onglet.
  const openIdx = tabs.findIndex((t) => t.key === activeKey);
  const activeIdx = Math.max(0, openIdx);
  const [shown, setShown] = useState(activeIdx);
  const [held, setHeld] = useState(false);
  const [tabW, setTabW] = useState(0);
  const trackRef = useRef<View>(null);
  const x = useRef(new Animated.Value(0)).current;
  const sx = useRef(new Animated.Value(1)).current;
  const sy = useRef(new Animated.Value(1)).current;
  const glass = useRef(new Animated.Value(0)).current;
  const g = useRef({ left: 0, w: 0, offset: 0, x: 0, hover: 0, live: false, panning: false, reduce: false, timer: 0 as ReturnType<typeof setTimeout> | 0 });
  g.current.w = tabW;
  // Navigation du glissé : survol prolongé ou lâcher, dédoublonnée (une seule instance, lit `latest`).
  const nav = useRef(
    createTabDragNav({
      onNavigate: (i) => {
        const t = latest.current.tabs[i];
        if (t) latest.current.onSelect(t.key);
      },
    }),
  ).current;
  useEffect(() => () => nav.dispose(), [nav]);
  useEffect(() => nav.sync(openIdx), [nav, openIdx]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((r) => (g.current.reduce = r), () => undefined);
  }, []);

  const settle = (to: number, animated = true) => {
    const st = g.current;
    if (!st.w) return;
    const target = to * st.w;
    if (!animated || st.reduce) {
      x.setValue(target);
      sx.setValue(1);
      sy.setValue(1);
    } else {
      // Rebond « ressort » : la goutte dépasse à peine sa place puis s'y pose (cubic-bezier(0.34, 1.36, 0.64, 1) du web).
      Animated.parallel([
        Animated.spring(x, { toValue: target, useNativeDriver: true, friction: 7, tension: 70 }),
        Animated.spring(sx, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }),
        Animated.spring(sy, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }),
      ]).start();
    }
    Animated.timing(glass, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  };

  // L'onglet actif change (toucher, navigation) : le repère s'y pose, sauf pendant un geste.
  useEffect(() => {
    if (g.current.live) return;
    setShown(activeIdx);
    settle(activeIdx);
  }, [activeIdx, tabW]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = (e.nativeEvent.layout.width - PAD * 2) / n;
    if (Math.abs(w - tabW) > 0.5) {
      g.current.w = w;
      x.setValue(activeIdx * w);
      setTabW(w);
    }
    trackRef.current?.measureInWindow((left) => (g.current.left = left));
  };

  /** Pose la goutte à px ; l'étirement suit la vitesse horizontale (px/ms). */
  const place = (px: number, vx: number) => {
    x.setValue(px);
    if (g.current.reduce) return;
    const s = Math.min(Math.abs(vx) * 0.32, 0.26);
    sx.setValue(1.1 + s);
    sy.setValue(1.1 - s * 0.55);
  };

  const lift = (pageX: number) => {
    const st = g.current;
    if (st.live || !st.w || n === 0) return;
    st.live = true;
    nav.begin(openIdx);
    const inTrack = pageX - st.left - PAD;
    // On attrape la goutte là où on l'a prise ; ailleurs, elle vient se centrer sous le doigt.
    const inPill = inTrack - activeIdx * st.w;
    st.offset = inPill >= 0 && inPill <= st.w ? inPill : st.w / 2;
    st.hover = activeIdx;
    st.x = clamp(inTrack - st.offset, 0, (n - 1) * st.w);
    setHeld(true);
    Animated.timing(glass, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (st.reduce) x.setValue(st.x);
    else
      Animated.parallel([
        Animated.spring(x, { toValue: st.x, useNativeDriver: true, friction: 8, tension: 120 }),
        Animated.spring(sx, { toValue: 1.1, useNativeDriver: true, friction: 6, tension: 120 }),
        Animated.spring(sy, { toValue: 1.1, useNativeDriver: true, friction: 6, tension: 120 }),
      ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const drop = () => {
    const st = g.current;
    if (st.timer) clearTimeout(st.timer);
    st.timer = 0;
    st.panning = false;
    if (!st.live) return;
    st.live = false;
    setHeld(false);
    if (!st.w || n === 0) {
      nav.dispose();
      return;
    }
    const idx = clamp(Math.round(st.x / st.w), 0, n - 1);
    st.hover = idx;
    setShown(idx);
    settle(idx);
    nav.release(idx);
  };

  // Les rappels du PanResponder (créé une fois) lisent l'état courant via cette référence.
  const latest = useRef({ lift, drop, place, onSelect, tabs });
  const pan = useRef(
    PanResponder.create({
      // Un toucher simple reste aux onglets (Pressable) ; le geste ne prend la main que si le doigt glisse
      // à l'horizontale, ou s'il a déjà soulevé la goutte en restant appuyé.
      onMoveShouldSetPanResponderCapture: (_e, gs) =>
        g.current.live || (Math.abs(gs.dx) > MOVE_SLOP && Math.abs(gs.dx) > Math.abs(gs.dy)),
      onPanResponderGrant: (_e, gs) => {
        const st = g.current;
        st.panning = true;
        if (st.timer) clearTimeout(st.timer);
        st.timer = 0;
        if (!st.live) latest.current.lift(gs.x0);
      },
      onPanResponderMove: (_e, gs) => {
        const st = g.current;
        if (!st.live || !st.w || n === 0) return;
        const px = clamp(gs.moveX - st.left - PAD - st.offset, 0, (n - 1) * st.w);
        st.x = px;
        latest.current.place(px, gs.vx);
        // La goutte passe sur un autre onglet : il s'allume ; la page ne suit que si la goutte s'y attarde.
        const idx = clamp(Math.round(px / st.w), 0, n - 1);
        if (idx !== st.hover) {
          st.hover = idx;
          setShown(idx);
          nav.hover(idx);
          Haptics.selectionAsync().catch(() => undefined);
        }
      },
      onPanResponderTerminationRequest: () => !g.current.live,
      onPanResponderRelease: () => latest.current.drop(),
      onPanResponderTerminate: () => latest.current.drop(),
    }),
  ).current;

  latest.current = { lift, drop, place, onSelect, tabs };

  const draw = (t: FloatingTab, color: string, size: number) =>
    t.glyph ? <Icon name={t.glyph} size={size} color={color} /> : t.icon ? <Ionicons name={t.icon} size={size} color={color} /> : null;
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10,
        paddingHorizontal: 16,
        paddingTop: SPACING.space2,
        paddingBottom: insets.bottom > 0 ? Math.max(insets.bottom - 9, 8) : 25,
        backgroundColor: colors.bgGrouped,
      }}
    >
      <GlassSurface radius={31} style={{ flex: 1, overflow: 'visible', maxWidth: 560 }}>
        <View
          ref={trackRef}
          onLayout={onLayout}
          accessibilityRole="tabbar"
          style={{ flexDirection: 'row', height: SPACING.tabbarH - 2, padding: PAD }}
          {...pan.panHandlers}
        >
          {/* ::before grain à 22 % (Veillée) ; la version Lin (grain blanc inversé à 10 %) est invisible, omise. */}
          {styleKey === 'veillee' ? <Texture name="grain" opacity={0.22} /> : null}
          {tabW > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute', top: PAD, bottom: PAD, left: PAD, width: tabW, borderRadius: 27,
                transform: [{ translateX: x }, { scaleX: sx }, { scaleY: sy }],
                shadowColor: '#000', shadowOpacity: held ? 0.35 : 0, shadowRadius: 13, shadowOffset: { width: 0, height: 10 },
              }}
            >
              {/* Au repos : la pastille de feutre ; soulevée : la goutte de verre, plus claire, filet blanc. */}
              <Animated.View
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 27,
                  backgroundColor: colors.tabOn, borderWidth: 1, borderColor: `${colors.navActive}42`,
                  opacity: glass.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                }}
              />
              <Animated.View
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 27,
                  backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)',
                  opacity: glass,
                }}
              >
                <View style={{ position: 'absolute', top: 1, left: 14, right: 14, height: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.55)' }} />
              </Animated.View>
            </Animated.View>
          ) : null}
          {tabs.map((t, i) => {
            const on = i === shown;
            const color = on ? colors.navActive : colors.label;
            return (
              <Pressable
                key={t.key}
                testID={`tab-${t.key}`}
                onPress={() => onSelect(t.key)}
                onPressIn={(e) => {
                  const st = g.current;
                  const pageX = e.nativeEvent.pageX;
                  if (st.timer) clearTimeout(st.timer);
                  st.timer = setTimeout(() => latest.current.lift(pageX), HOLD_MS);
                }}
                onPressOut={() => {
                  const st = g.current;
                  if (st.timer) clearTimeout(st.timer);
                  st.timer = 0;
                  // Repris par le glissement : c'est lui qui posera la goutte au lâcher.
                  if (st.live && !st.panning) latest.current.drop();
                }}
                delayLongPress={HOLD_MS}
                onLongPress={() => undefined}
                accessibilityRole="tab"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: i === activeIdx }}
                style={{ flex: 1, borderRadius: 27, gap: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{ alignItems: 'center', gap: 1, transform: [{ scale: held && on ? 1.08 : 1 }] }}>
                  {draw(t, color, 24)}
                  <ThemedText variant="cap2" numberOfLines={1} style={{ color, fontSize: 10, lineHeight: 12, letterSpacing: 0.1 }}>
                    {t.label}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
      {prominent ? (
        <Pressable
          testID="tab-prominent"
          onPress={prominent.onPress}
          accessibilityRole="button"
          accessibilityLabel={prominent.badge ? `${prominent.label}, ${prominent.badge} non lu${prominent.badge > 1 ? 's' : ''}` : prominent.label}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Felt raised radius={SPACING.tabbarH / 2} style={{ width: SPACING.tabbarH, height: SPACING.tabbarH }}>
            <View style={{ width: SPACING.tabbarH, height: SPACING.tabbarH, alignItems: 'center', justifyContent: 'center' }}>
              {draw(prominent, colors.cream, 25)}
            </View>
          </Felt>
          {prominent.badge && prominent.badge > 0 ? (
            <View
              style={{
                position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10,
                backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.bgGrouped, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ThemedText variant="cap2" weight={700} style={{ color: colors.accentInk, fontSize: 10, lineHeight: 12 }}>
                {prominent.badge > 9 ? '9+' : String(prominent.badge)}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}
