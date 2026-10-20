import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from './ThemeProvider';

/** `.sec` : bloc à marges latérales de 16 pt (liste, bouton, pied de section). */
export function Section({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ marginHorizontal: 16 }, style]}>{children}</View>;
}

export type SectionHeaderProps = {
  title: string;
  /** Lien à droite (`.sec-h a` : « Tout voir »), 17/22 `tintText`. */
  action?: { label: string; onPress: () => void };
  /** `.sec-h.small` : étiquette 12/16 en capitales espacées, sauge (intitulé de liste groupée). */
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * `.sec-h` : titre de section 22/28 (Fraunces 600) + lien d'action ;
 * `.sec-h.small` : intitulé en capitales au-dessus d'une liste. Marges 16, padding 22/8 (22/7 en small).
 */
export function SectionHeader({ title, action, small, style }: SectionHeaderProps) {
  return (
    <View
      style={[
        small
          ? { paddingTop: 22, paddingBottom: 7, paddingHorizontal: 16 }
          : { paddingTop: 22, paddingBottom: 8, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
        { marginHorizontal: 16 },
        style,
      ]}
    >
      {small ? (
        <ThemedText variant="eyebrow" color="sageText" accessibilityRole="header">
          {title}
        </ThemedText>
      ) : (
        <ThemedText variant="sectionTitle" accessibilityRole="header">{title}</ThemedText>
      )}
      {action && !small ? (
        <Pressable onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={8}>
          <ThemedText variant="sub" weight={600} color="sageText">{action.label}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * `.sec-f` : pied de section 13/18 `label2`, padding 7 16 0. `children` = texte, ou fragments
 * `<ThemedText color="tintText">` pour un lien en ligne (`.ctint`).
 */
export function SectionFooter({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ paddingTop: 7, paddingHorizontal: 16 }, style]}>
      {typeof children === 'string' ? (
        <ThemedText variant="foot" color="label2">{children}</ThemedText>
      ) : (
        <ThemedText variant="foot" style={{ color: colors.label2 }}>{children}</ThemedText>
      )}
    </View>
  );
}
