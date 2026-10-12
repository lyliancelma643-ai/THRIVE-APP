import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton, GlassSurface, SPACING, ThemedText, useTheme } from '../../design';

/** Cadre commun des écrans d'offres : retour, grand titre, contenu, pied d'action en verre. */
export function Frame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(parent)/maison'));
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACING.space2,
          paddingHorizontal: SPACING.space4,
          paddingBottom: footer ? SPACING.space8 * 3 : SPACING.space6,
          gap: SPACING.space4,
        }}
      >
        <View style={{ alignItems: 'flex-start' }}>
          <GlassButton icon="chevron-back" accessibilityLabel="Retour" onPress={back} />
        </View>
        <View style={{ gap: SPACING.space1 }}>
          <ThemedText variant="largeTitle" accessibilityRole="header">{title}</ThemedText>
          {subtitle ? <ThemedText variant="subheadline" color="label2">{subtitle}</ThemedText> : null}
        </View>
        {children}
      </ScrollView>
      {footer ? (
        <View style={{ position: 'absolute', left: SPACING.space4, right: SPACING.space4, bottom: SPACING.space4 }}>
          <GlassSurface strong radius={30} style={{ padding: 6 }}>
            {footer}
          </GlassSurface>
        </View>
      ) : null}
    </View>
  );
}
