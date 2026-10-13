import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from './ThemeProvider';

export type LampProps = { style?: StyleProp<ViewStyle> };

/**
 * `--lamp` : halo de lampe (ellipse soleil en haut de l'écran), calque décoratif sans toucher ni animation.
 * Lin : 34 % ; Veillée : 17 %. À poser en premier enfant d'un écran (`absoluteFill`), sous le contenu.
 */
export function Lamp({ style }: LampProps) {
  const { colors, metrics } = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const l = metrics.lamp;
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={`lamp${uid}`} cx="50" cy={l.centerY * 100} rx={l.radiusX * 100} ry={l.radiusY * 100} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.sun} stopOpacity={l.alpha} />
            <Stop offset={l.fade} stopColor={colors.sun} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#lamp${uid})`} />
      </Svg>
    </View>
  );
}
