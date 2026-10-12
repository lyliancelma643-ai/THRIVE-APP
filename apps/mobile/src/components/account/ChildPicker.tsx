import { Pressable, ScrollView, View } from 'react-native';
import { RADIUS, SPACING, ThemedText, useTheme } from '../../design';

export type PickableChild = { id: string; first_name: string };

type Props = {
  childrenList: PickableChild[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

/**
 * Maquette F « Choisir le profil » : trois variantes selon le style actif.
 * natif = liste groupée, nuit = pastilles rondes, carnet = cartes-maillots.
 * Aucune sélection d'enfant n'existe encore côté mobile : composant prêt, non branché.
 */
export function ChildPicker({ childrenList, selectedId, onSelect }: Props) {
  const { colors, style } = useTheme();

  if (style === 'natif') {
    return (
      <View style={{ backgroundColor: colors.bgGrouped2, borderRadius: RADIUS.card, overflow: 'hidden' }} accessibilityRole="radiogroup">
        {childrenList.map((c, i) => (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            accessibilityRole="radio"
            accessibilityLabel={c.first_name}
            accessibilityState={{ selected: c.id === selectedId }}
            style={{
              minHeight: SPACING.rowMin, paddingHorizontal: SPACING.space4, justifyContent: 'center',
              borderBottomWidth: i < childrenList.length - 1 ? 0.5 : 0, borderBottomColor: colors.separator,
            }}
          >
            <ThemedText variant="body" style={{ fontWeight: c.id === selectedId ? '600' : '400' }}>{c.first_name}</ThemedText>
          </Pressable>
        ))}
      </View>
    );
  }

  const carnet = style === 'carnet';
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" contentContainerStyle={{ gap: SPACING.space3 }}>
      {childrenList.map((c) => {
        const selected = c.id === selectedId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            accessibilityRole="radio"
            accessibilityLabel={c.first_name}
            accessibilityState={{ selected }}
            style={{
              minWidth: carnet ? 96 : 72, minHeight: 44, alignItems: 'center', justifyContent: 'center',
              paddingVertical: SPACING.space3, paddingHorizontal: SPACING.space3,
              borderRadius: carnet ? RADIUS.cardCarnet : RADIUS.full,
              backgroundColor: selected ? colors.tint : colors.bgGrouped2,
            }}
          >
            <ThemedText variant="headline" style={{ color: selected ? colors.tintInk : colors.label }}>{c.first_name}</ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
