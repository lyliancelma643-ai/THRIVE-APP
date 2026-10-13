import { Image, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Arch, BRAND_LOGO, Button, Lamp, MATERIALS, ThemedText, useTheme } from '../../design';
import { SloganDuo } from './SloganDuo';

type Props = {
  /** « Essayer 1 mois gratuitement » : mène à l'inscription. */
  onStart: () => void;
  /** « J’ai déjà un compte » : mène à la connexion. */
  onLogin: () => void;
};

/** Petit soleil à quatre branches (`spark4` du canevas) : étoiles de décor. */
const SPARK = 'M12 1.5c.7 4.6 2.4 7.1 4.4 8.4 1.5 1 3.4 1.7 6.1 2.1-2.7.4-4.6 1.1-6.1 2.1-2 1.3-3.7 3.8-4.4 8.4-.7-4.6-2.4-7.1-4.4-8.4-1.5-1-3.4-1.7-6.1-2.1 2.7-.4 4.6-1.1 6.1-2.1 2-1.3 3.7-3.8 4.4-8.4z';

/** Étoiles de décor [gauche, haut, taille] (repères du canevas 402 × 874, en pourcentage de la largeur / de la hauteur). */
const STARS: readonly (readonly [number, number, number])[] = [
  [0.104, 0.192, 15], [0.841, 0.172, 11], [0.886, 0.378, 13], [0.07, 0.407, 9], [0.736, 0.119, 8], [0.214, 0.11, 8],
];

function Actions({ onStart, onLogin }: Props) {
  return (
    <View style={{ gap: 8 }}>
      {/* Le seul geste soleil de l'écran : l'essai d'un mois. */}
      <Button label="Essayer 1 mois gratuitement" variant="accent" onPress={onStart} testID="welcome-start" />
      <Button label="J’ai déjà un compte" variant="plain" onPress={onLogin} testID="welcome-login" />
    </View>
  );
}

/**
 * Maquette A · Bienvenue : la lampe, quelques étoiles, le logo, l'arche de lin avec la mascotte, deux slogans qui se
 * relaient (Fraunces), une phrase d'accroche, l'essai en émail et le lien de connexion. Même mise en page en Lin et
 * en Veillée (les tokens changent). Vue présentationnelle : aucune donnée, que des callbacks.
 */
export function WelcomeView(props: Props) {
  const { colors, styleKey } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 34) + 10;
  const top = Math.max(insets.top, 20);
  const starColor = styleKey === 'veillee' ? colors.sun : MATERIALS.star.onLow;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <Lamp />
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        {STARS.map(([x, y, s]) => (
          <View key={`${x}-${y}`} style={{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, opacity: 0.85 }}>
            <Svg width={s} height={s} viewBox="0 0 24 24"><Path d={SPARK} fill={starColor} /></Svg>
          </View>
        ))}
      </View>
      <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1, paddingTop: top + 22 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center' }}>
          <Image
            source={BRAND_LOGO}
            accessibilityIgnoresInvertColors
            accessible={false}
            style={{ width: 44, height: 44, borderRadius: 11 }}
          />
          <View style={{ marginTop: 24 }}>
            <Arch width={226} height={252} />
          </View>
        </View>
        <View style={{ marginTop: 26, paddingHorizontal: 24, alignItems: 'center' }}>
          <SloganDuo variant="largetitle" color="label" dotColor="sageText" align="center" textStyle={{ lineHeight: 40, letterSpacing: -0.4 }} />
          <ThemedText variant="body" color="label2" style={{ marginTop: 16, textAlign: 'center' }}>
            Un moment par soir avec ton enfant. Un coach quand tu veux aller plus loin.
          </ThemedText>
        </View>
        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={{ paddingHorizontal: 24, paddingBottom: bottom }}>
          <Actions {...props} />
        </View>
      </ScrollView>
    </View>
  );
}
