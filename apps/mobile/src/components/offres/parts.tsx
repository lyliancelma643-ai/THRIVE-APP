import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  GlassSurface,
  Icon,
  NavBar,
  ThemedText,
  VignetteImage,
  CANVAS,
  useLargeTitle,
  useNavBarHeight,
  useTheme,
  type IconName,
} from '../../design';
import { BRAND } from './brand';
import type { ProgramPack } from '../../services/programPayments';

/** Chiffres proportionnels (le canevas n'applique `tabular-nums` qu'aux montants `.num`) : évite des retours à la ligne en plus. */
export const PROPORTIONAL = { fontVariant: [] as never[] };

/** Vignette de chaque programme : identifiants existants (resolveVignetteId gère le repli). */
export const PACK_IMAGE: Record<ProgramPack, string> = {
  groupe: 'BON-01',
  individuel: 'ACT-0101',
  complet: 'ACT-0801',
};

/** Vignette carrée arrondie (64 pt / rayon 18 dans Y ; 56 pt / rayon 16 dans X2). */
export function Packshot({ id, size = 64, radius = 18 }: { id: string; size?: number; radius?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: BRAND.packshot }}>
      <VignetteImage id={id} style={{ width: size, height: size }} accessibilityLabel="" />
    </View>
  );
}

/** `.ibadge` à fond libre (Apple Pay noir, Stripe violet, gris `fill`…) : pastille 30 pt, rayon 8. */
export function IconBadge({ glyph, bg, ink, size = 30 }: { glyph: IconName; bg: string; ink: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={glyph} size={18} color={ink} strokeWidth={2} />
    </View>
  );
}

/** Carré « S » de Stripe (`36 pt / rayon 10` dans Y, `18 pt / rayon 5` dans le pied de Y2). */
export function StripeMark({ size = 36 }: { size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: BRAND.stripe, alignItems: 'center', justifyContent: 'center' }}
    >
      <ThemedText weight={800} style={{ color: CANVAS.white, fontSize: size * 0.5, lineHeight: size * 0.5 }}>S</ThemedText>
    </View>
  );
}

/** `.tag` / `.tag.gray` à chiffres proportionnels (la `Tag` du design applique tabular-nums, qui élargit « + » et les espaces). */
export function SoftTag({ label, tone = 'gray', style }: { label: string; tone?: 'tint' | 'gray'; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const p = tone === 'tint' ? { bg: colors.tintSoft, ink: colors.tintText } : { bg: colors.fill3, ink: colors.label2 };
  return (
    <View accessible accessibilityLabel={label} style={[{ alignSelf: 'flex-start', height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: p.bg, justifyContent: 'center' }, style]}>
      <ThemedText variant="cap" weight={600} style={[PROPORTIONAL, { color: p.ink }]}>{label}</ThemedText>
    </View>
  );
}

/** Étiquette ambre « Phare » / « Programme phare » (`#FFE7B8` / `#5A3A00`). */
export function AmberTag({ label }: { label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ alignSelf: 'flex-start', height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: BRAND.phareBg, justifyContent: 'center' }}
    >
      <ThemedText variant="cap" weight={600} style={[PROPORTIONAL, { color: BRAND.phareInk }]}>{label}</ThemedText>
    </View>
  );
}

/**
 * `.card` avec anneau de sélection `box-shadow: 0 0 0 2.5px var(--tint)` : l'anneau déborde de la carte (sans la
 * déplacer), comme l'ombre portée du canevas.
 */
export function RingCard({
  on,
  padding = 16,
  children,
  style,
}: {
  on?: boolean;
  padding?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, metrics } = useTheme();
  return (
    <View style={style}>
      <Card padding={padding}>{children}</Card>
      {on ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: -2.5, left: -2.5, right: -2.5, bottom: -2.5,
            borderRadius: metrics.cardRadius + 2.5, borderWidth: 2.5, borderColor: colors.tint,
          }}
        />
      ) : null}
    </View>
  );
}

/** Pied d'action flottant : `.glass` posé à 16 pt des bords, rayon 30, padding 6. */
export function GlassFooter({ children, lift = 0 }: { children: ReactNode; lift?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 16) + lift, zIndex: 45 }}>
      <GlassSurface radius={30} style={{ padding: 6 }}>{children}</GlassSurface>
    </View>
  );
}

/**
 * Cadre commun des écrans Offres / Paiement / Appel / Abonnement / Paywall : fond du style, contenu qui défile sous une
 * `NavBar` en verre (bord dur dès que ça défile), pied d'action facultatif. `hero` : le contenu démarre en haut de
 * l'écran (image sous la barre, Y2).
 */
export function OffreScreen({
  left,
  right,
  title,
  collapseTitle,
  hero,
  topExtra = 0,
  bottomSpace = 120,
  footer,
  footerLift,
  testID,
  children,
}: {
  left?: ReactNode;
  right?: ReactNode;
  /** Titre centré de la barre (affiché quand le grand titre a défilé si `collapseTitle`). */
  title?: string;
  collapseTitle?: boolean;
  hero?: boolean;
  topExtra?: number;
  bottomSpace?: number;
  footer?: ReactNode;
  footerLift?: number;
  testID?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const scroll = useLargeTitle();
  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView
        onScroll={scroll.onScroll}
        scrollEventThrottle={scroll.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: hero ? 0 : navH + topExtra, paddingBottom: bottomSpace }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      <NavBar
        left={left}
        right={right}
        title={collapseTitle ? title : undefined}
        titleVisible={scroll.titleVisible}
        edge={scroll.edge}
      />
      {footer ? <GlassFooter lift={footerLift}>{footer}</GlassFooter> : null}
    </View>
  );
}
