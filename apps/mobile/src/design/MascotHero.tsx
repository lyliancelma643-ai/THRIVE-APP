import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { VignetteImage } from './VignetteImage';
import { BASE_VIGNETTE_ID } from './vignetteIds';
import { RADIUS } from './tokens';

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const BRAND_LOGO = require('../../assets/brand/logo.png');

export type MascotHeroProps = {
  size?: number;
  /** Logo de marque incrusté en bas à droite (accueil, connexion). */
  withLogo?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Mascotte de base (bouc bleu marine, ACT-0603) pour l'accueil et la connexion. */
export function MascotHero({ size = 200, withLogo = false, style }: MascotHeroProps) {
  const logo = Math.round(size * 0.22);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <VignetteImage
        id={BASE_VIGNETTE_ID}
        accessibilityLabel="Mascotte THRIVE"
        style={{ width: size, height: size, borderRadius: RADIUS.card }}
      />
      {withLogo ? (
        <Image
          source={BRAND_LOGO}
          accessibilityIgnoresInvertColors
          style={{ position: 'absolute', right: 8, bottom: 8, width: logo, height: logo, borderRadius: logo * 0.22 }}
        />
      ) : null}
    </View>
  );
}
