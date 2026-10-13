import React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, ThemedText, useTheme } from '../../design';

type ScaffoldProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Rangée sous le titre (sélecteur d'enfant). */
  header?: React.ReactNode;
};

/** Page défilante aux tokens du thème : grand titre iOS, fond groupé, marges 16. */
export function ScreenScaffold({ title, subtitle, children, refreshing, onRefresh, header }: ScaffoldProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgGrouped }}
      contentContainerStyle={{ paddingTop: insets.top + SPACING.space4, paddingHorizontal: SPACING.space4, paddingBottom: SPACING.space8 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.label2} /> : undefined}
    >
      <ThemedText variant="largeTitle" accessibilityRole="header">{title}</ThemedText>
      {subtitle ? <ThemedText variant="subheadline" color="label2" style={{ marginTop: SPACING.space1 }}>{subtitle}</ThemedText> : null}
      {header}
      <View style={{ marginTop: SPACING.space4 }}>{children}</View>
    </ScrollView>
  );
}

type ChipsProps = { items: { id: string; label: string }[]; activeId?: string; onSelect: (id: string) => void };

/** Sélecteur d'enfant (affiché seulement s'il y en a plusieurs). */
export function ChildChips({ items, activeId, onSelect }: ChipsProps) {
  const { colors } = useTheme();
  if (items.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.space3, flexGrow: 0 }}>
      {items.map((c) => {
        const on = c.id === activeId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Voir ${c.label}`}
            style={{
              minHeight: SPACING.touchMin, paddingHorizontal: SPACING.space4, marginRight: SPACING.space2,
              borderRadius: 999, justifyContent: 'center',
              backgroundColor: on ? colors.tint : colors.fill3,
            }}
          >
            <ThemedText variant="subheadline" style={{ fontWeight: '600', color: on ? colors.tintInk : colors.label }}>
              {c.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Carte de fond secondaire (aplat, pas de verre : le verre est réservé aux barres et feuilles). */
export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { colors, radius } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.bgGrouped2, borderRadius: radius.card, padding: SPACING.space4, marginBottom: SPACING.space3 }, style]}>
      {children}
    </View>
  );
}
