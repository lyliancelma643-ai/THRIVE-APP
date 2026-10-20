import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  FadeBottom, GlassButton, GlassSurface, NavBar, ThemedText, useNavBarHeight, useTheme, withAlpha,
} from '../../design';
import { mmss, ringRatio, splitBold } from './flow';

// Pièces communes du mode activité (toujours dans un <ThemeScope style="veillee" fill> : fond marine, texte crème).
// Aucune couleur en dur : tout vient de useTheme().colors. Un seul geste soleil par écran : le bouton principal
// (<Button variant="accent">) OU l'anneau / l'étoile, jamais les deux jaunes en même temps.

/** Pas de cadre de focus du navigateur autour d'un champ (le web seulement ; RN ne type pas `outlineStyle: 'none'`). */
export const NO_FOCUS_RING = { outlineStyle: 'none' } as unknown as TextStyle;

export type TimerPillData = {
  elapsedS: number;
  totalS: number;
  /** « +10 min » juste après « Approfondir ». */
  boostLabel?: string | null;
  /** `sage` quand un bouton principal jaune est à l'écran (un seul geste soleil). */
  tone?: 'sun' | 'sage';
};

export type Chrome = {
  title: string;
  onClose: () => void;
  timer?: TimerPillData | null;
};

/** Anneau de progression (jamais un compte à rebours rouge). */
export function Ring({ size, stroke, ratio, color, track }: { size: number; stroke: number; ratio: number; color: string; track: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * Math.max(0.0001, ratio)} ${c}`}
        />
      </Svg>
    </View>
  );
}

/**
 * Titre de l'activité dans la barre du haut : Fraunces 500 15/20 en `label2`, une ligne, tronqué (128 pt quand le minuteur occupe le
 * côté droit, 220 pt sinon), comme le canevas. Posé par-dessus la barre (NavBar ne sait écrire qu'un titre en Inter 600).
 */
function BarTitle({ title, narrow, top }: { title: string; narrow: boolean; top: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top, height: 54, alignItems: 'center', justifyContent: 'center', zIndex: 41 }}>
      <ThemedText
        variant="navTitle"
        color="label2"
        weight={500}
        numberOfLines={1}
        accessibilityRole="header"
        style={{ maxWidth: narrow ? 128 : 220, fontSize: 15, lineHeight: 20, letterSpacing: 0 }}
      >
        {title}
      </ThemedText>
    </View>
  );
}

/** Pastille de verre « 13:20 sur 20 min » en haut à droite : le minuteur du MOMENT, part du temps choisi. */
export function TimerPill({ elapsedS, totalS, boostLabel, tone = 'sage' }: TimerPillData) {
  const { colors } = useTheme();
  const remaining = Math.max(0, totalS - elapsedS);
  const near = elapsedS >= totalS - 120;
  const color = tone === 'sun' && !near ? colors.sun : colors.sage;
  return (
    <View>
      <GlassSurface interactive={false} radius={22} style={{ minHeight: 44 }}>
        <View
          accessible
          accessibilityRole="timer"
          accessibilityLabel={`Il reste ${Math.ceil(remaining / 60)} minutes sur ${Math.round(totalS / 60)}`}
          style={{ height: 44, paddingLeft: 5, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 9 }}
        >
          <Ring size={34} stroke={4} ratio={ringRatio(elapsedS, totalS)} color={color} track={withAlpha(colors.cream, 0.16)} />
          <View>
            <ThemedText variant="callout" weight={600} style={{ fontVariant: ['tabular-nums'], lineHeight: 16 }}>{mmss(remaining)}</ThemedText>
            <ThemedText variant="cap2" color="label2" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>{`sur ${Math.round(totalS / 60)} min`}</ThemedText>
          </View>
        </View>
      </GlassSurface>
      {boostLabel ? (
        <View style={{ position: 'absolute', top: 50, left: 0, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12, backgroundColor: colors.sage }}>
          <ThemedText variant="cap" weight={700} style={{ color: colors.navy900 }}>{boostLabel}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

/** Fait remonter ce qui vient d'apparaître : défilement INSTANT (pas d'animation) ou doux selon « Réduire les animations ». */
export function useRevealScroll(revealKey: unknown) {
  const ref = useRef<ScrollView>(null);
  const last = useRef(revealKey);
  const { reduceMotion } = useTheme();
  const onContentSizeChange = useCallback(() => {
    if (last.current === revealKey) return;
    last.current = revealKey;
    ref.current?.scrollToEnd({ animated: !reduceMotion });
  }, [revealKey, reduceMotion]);
  return { ref, onContentSizeChange };
}

/**
 * Cadre commun : barre de navigation en verre (fermer, titre, minuteur), contenu défilant, barre d'action collée en bas.
 * `revealKey` : quand elle change, le contenu défile vers ce qui vient d'être ajouté.
 */
export function Frame({
  chrome, children, cta, ctaGlass, revealKey, padTop = 20, padBottom, scroll = true, contentStyle,
}: {
  chrome: Chrome;
  children?: ReactNode;
  cta?: ReactNode;
  /** Barre d'action en capsule de verre (déroulé) au lieu de boutons posés sur le fond. */
  ctaGlass?: boolean;
  revealKey?: unknown;
  padTop?: number;
  padBottom?: number;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const navH = useNavBarHeight();
  const insets = useSafeAreaInsets();
  const [edge, setEdge] = useState(false);
  const reveal = useRevealScroll(revealKey);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setEdge(e.nativeEvent.contentOffset.y > 8);
  const bar = cta ? 96 + Math.max(insets.bottom, 16) : 40;
  return (
    <View style={{ flex: 1 }}>
      {scroll ? (
        <ScrollView
          ref={reveal.ref}
          onContentSizeChange={reveal.onContentSizeChange}
          onScroll={onScroll}
          scrollEventThrottle={32}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[{ paddingTop: navH + padTop, paddingHorizontal: 20, paddingBottom: padBottom ?? bar + 24 }, contentStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingTop: navH }, contentStyle]}>{children}</View>
      )}
      <NavBar
        edge={edge}
        left={<GlassButton glyph="close" accessibilityLabel="Quitter le mode activité" onPress={chrome.onClose} />}
        right={chrome.timer ? <TimerPill {...chrome.timer} /> : <View style={{ width: 44 }} />}
      />
      <BarTitle title={chrome.title} narrow={!!chrome.timer} top={insets.top} />
      {cta ? (
        <>
          <FadeBottom height={170} />
          <View
            style={{ position: 'absolute', left: ctaGlass ? 14 : 20, right: ctaGlass ? 14 : 20, bottom: Math.max(insets.bottom, 16), zIndex: 46 }}
          >
            {ctaGlass ? (
              <GlassSurface strong radius={36}>
                <View style={{ padding: 7, flexDirection: 'row', alignItems: 'center', gap: 8 }}>{cta}</View>
              </GlassSurface>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{cta}</View>
            )}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Étiquette de section en capitales discrètes (`nc`). */
export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <ThemedText variant="eyebrow" color="label2" accessibilityRole="header" style={style}>{children}</ThemedText>
  );
}

/** Phrase éditoriale en Fraunces (instance 400/500/600, l'axe SOFT n'existe pas en RN : écart connu). */
export function Display({
  children, size = 31, lineHeight, weight = 400, italic, color = 'label', style, align,
}: {
  children: ReactNode;
  size?: number;
  lineHeight?: number;
  weight?: 400 | 500 | 600;
  italic?: boolean;
  color?: 'label' | 'label2';
  align?: 'left' | 'center';
  style?: StyleProp<TextStyle>;
}) {
  return (
    <ThemedText
      variant="title1"
      color={color}
      weight={weight}
      style={[{ fontSize: size, lineHeight: lineHeight ?? Math.round(size * 1.22), letterSpacing: -0.2, textAlign: align }, italic ? { fontStyle: 'italic' } : null, style]}
    >
      {children}
    </ThemedText>
  );
}

/** Texte courant avec **gras** des fiches et typographie française. */
export function InlineMd({
  text, style, variant = 'body', color = 'label',
}: { text: string; style?: StyleProp<TextStyle>; variant?: 'body' | 'callout' | 'sub' | 'title1'; color?: 'label' | 'label2' }) {
  const { colors } = useTheme();
  return (
    <ThemedText variant={variant} color={color} style={style}>
      {splitBold(text).map((r, i) =>
        r.bold ? <Text key={i} style={{ fontWeight: '600', color: colors.label }}>{r.text}</Text> : <Text key={i}>{r.text}</Text>,
      )}
    </ThemedText>
  );
}

/** Bouton texte discret (« Passer », « Plus tard », « Revenir »), cible ≥ 48 pt. */
export function Ghost({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={6}
      style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
    >
      <ThemedText variant="headline" weight={600} color="label2">{label}</ThemedText>
    </Pressable>
  );
}

/** Rangée repliable (« Si ça bloque », « À savoir avant de commencer »). */
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginTop: 16, padding: 16, borderRadius: 22, backgroundColor: colors.fill4, borderWidth: 1, borderColor: colors.separator }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        style={{ minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <ThemedText variant="callout" weight={600}>{title}</ThemedText>
        <ThemedText variant="sub" color="label2">{open ? '–' : '+'}</ThemedText>
      </Pressable>
      {open ? <View style={{ marginTop: 8 }}>{children}</View> : null}
    </View>
  );
}

/** Tic d'une seconde, seulement quand `active` (jamais de minuteur qui tourne pour rien). */
export function useNow(active: boolean, everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [active, everyMs]);
  return now;
}
