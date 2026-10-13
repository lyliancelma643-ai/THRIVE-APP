import { Image, ScrollView, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BRAND_LOGO, Button, Icon, MascotMedallion, ThemedText, resolveTextStyle, useTheme, withAlpha, type IconName,
} from '../../design';
import { SloganDuo } from './SloganDuo';

type Props = {
  /** « Essayer 1 mois gratuitement » : mène à l'inscription. */
  onStart: () => void;
  /** « J’ai déjà un compte » : mène à la connexion. */
  onLogin: () => void;
};

const PROMISES: { glyph: IconName; title: string; sub: string }[] = [
  { glyph: 'home', title: 'Un moment par soir avec ton enfant', sub: '10 à 30 minutes, rien à préparer.' },
  { glyph: 'gift', title: 'Le carnet de vos moments', sub: 'Ce que vous gardez, et des objets à gagner.' },
  { glyph: 'chat', title: 'Un coach, si tu veux aller plus loin', sub: 'Groupe, 1:1 ou les deux, près de chez toi.' },
];

/** Hauteur de la barre d'état du canevas (402 × 874) : les repères verticaux du canevas la comptent. */
const CANVAS_TOP = 54;

function Actions({ onStart, onLogin }: Props) {
  return (
    <View style={{ gap: 8 }}>
      <Button label="Essayer 1 mois gratuitement" onPress={onStart} testID="welcome-start" />
      <Button label="J’ai déjà un compte" variant="plain" onPress={onLogin} testID="welcome-login" />
    </View>
  );
}

/**
 * Maquette A · Bienvenue. Trois mises en page : Natif (médaillon 220 + trois promesses), Nuit calme (mascotte au centre
 * d'anneaux soleil/sauge, slogan 34/40), Carnet de saison (bandeau marine arrondi, titre Fraunces).
 * Vue présentationnelle : aucune donnée, que des callbacks.
 */
export function WelcomeView(props: Props) {
  const { style, colors, fontsLoaded } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 34) + 10;
  const top = Math.max(insets.top, 0);
  const lift = top - CANVAS_TOP;

  if (style === 'nuit') {
    const ring = (size: number, r: number, color: string, pct: number) => {
      const c = 2 * Math.PI * r;
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={withAlpha(color, 0.14)} strokeWidth={26} />
          <Circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={26} strokeLinecap="round"
            strokeDasharray={`${(c * pct).toFixed(1)} ${(c * (1 - pct) + c * pct).toFixed(1)}`}
          />
        </Svg>
      );
    };
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
        <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ height: 410 + lift, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={{ position: 'absolute', top: 110 + lift }}>{ring(300, 137, colors.tint, 705.9 / 860.8)}</View>
            <View style={{ position: 'absolute', top: 154 + lift }}>{ring(212, 93, colors.sage, 338.9 / 584.3)}</View>
            <View style={{ position: 'absolute', top: 190 + lift }}>
              <MascotMedallion size={140} halo={false} accessibilityLabel="La mascotte THRIVE" />
            </View>
          </View>
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 18 }}>
            <Image
              source={BRAND_LOGO}
              accessibilityIgnoresInvertColors
              accessible={false}
              style={{ width: 52, height: 52, borderRadius: 12, marginBottom: 18 }}
            />
            <SloganDuo variant="largetitle" color="label" dotColor="tint" textStyle={{ lineHeight: 40, letterSpacing: -0.4, fontWeight: '700' }} />
            <ThemedText variant="body" color="label2" style={{ marginTop: 10 }}>
              Un moment par soir avec ton enfant. Un coach quand tu veux aller plus loin.
            </ThemedText>
            <View style={{ marginTop: 22, paddingBottom: bottom }}>
              <Actions {...props} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (style === 'carnet') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
        <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ height: 520 + lift, backgroundColor: colors.navy600, borderBottomLeftRadius: 44, borderBottomRightRadius: 44, overflow: 'hidden' }}>
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                resolveTextStyle('numeralHero', fontsLoaded, style),
                {
                  position: 'absolute', right: -40, top: 58 + lift, fontSize: 300, lineHeight: 300, fontWeight: '800',
                  letterSpacing: -12, color: withAlpha(colors.cream, 0.06), fontVariant: [],
                },
              ]}
            >
              17
            </Text>
            <View style={{ position: 'absolute', right: 22, top: 92 + lift }}>
              <MascotMedallion size={232} accessibilityLabel="La mascotte THRIVE" />
            </View>
            <Image
              source={BRAND_LOGO}
              accessibilityIgnoresInvertColors
              accessible={false}
              style={{
                position: 'absolute', left: 24, top: 96 + lift, width: 60, height: 60, borderRadius: 14,
                borderWidth: 1, borderColor: withAlpha(colors.cream, 0.2),
              }}
            />
            <View style={{ position: 'absolute', left: 24, right: 24, bottom: 40 }}>
              <ThemedText variant="foot" weight={600} style={{ color: colors.cream, opacity: 0.75, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                THRIVE Sport Positive
              </ThemedText>
              <View style={{ marginTop: 10 }}>
                <SloganDuo variant="displayLarge" color="cream" dotColor="sun" textStyle={{ fontSize: 42, lineHeight: 46, letterSpacing: -0.6 }} />
              </View>
            </View>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28 }}>
            <ThemedText variant="body" color="label2">
              Chaque soir, un moment de 10 minutes avec ton enfant, rien à préparer. Et quand tu veux aller plus loin, un coach.
            </ThemedText>
            <View style={{ flex: 1 }} />
            <View style={{ paddingTop: 22, paddingBottom: bottom }}>
              <Actions {...props} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Natif
  return (
    <View style={{ flex: 1, backgroundColor: colors.elev }}>
      <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1, paddingTop: 92 + lift }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center' }}>
          <MascotMedallion size={220} withLogo accessibilityLabel="La mascotte THRIVE" />
          <ThemedText variant="largetitle" accessibilityRole="header" style={{ marginTop: 22, textAlign: 'center' }}>
            {'Bienvenue dans\nTHRIVE'}
          </ThemedText>
          <View style={{ marginTop: 8 }}>
            <SloganDuo variant="headline" color="tint" dotColor="tint" align="center" textStyle={{ letterSpacing: -0.2 }} />
          </View>
        </View>
        <View style={{ marginTop: 20, marginHorizontal: 36, gap: 12 }}>
          {PROMISES.map((p) => (
            <View key={p.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Icon name={p.glyph} size={34} color={colors.tint} strokeWidth={1.6} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="headline">{p.title}</ThemedText>
                <ThemedText variant="sub" color="label2">{p.sub}</ThemedText>
              </View>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={{ paddingHorizontal: 24, paddingBottom: bottom }}>
          <Actions {...props} />
        </View>
      </ScrollView>
    </View>
  );
}
