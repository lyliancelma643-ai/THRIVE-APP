import { Pressable, View } from 'react-native';
import { Icon, ThemedText, useTheme, withAlpha } from '../../../design';
import type { VisualId } from '../../../lib/p3';
import { VISUAL_BUTTON_SUB, VISUAL_LABELS } from './content';
import { VisualIcon } from './glyphs';

/**
 * MV · Bouton « Montrer : {visuel} » : dans une étape du déroulé qui a un visuel, et sous les questions du débrief pour chaque
 * visuel de la fiche. Filet sauge (jamais jaune : le jaune est réservé au bouton principal de l'écran).
 */
export function VisualButton({ id, onOpen }: { id: VisualId; onOpen: (id: VisualId) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onOpen(id)}
      accessibilityRole="button"
      accessibilityLabel={`Montrer : ${VISUAL_LABELS[id]}. ${VISUAL_BUTTON_SUB}`}
      style={({ pressed }) => ({
        marginTop: 16, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14,
        borderRadius: 22, borderWidth: 1.5, borderColor: withAlpha(colors.sage, 0.55), backgroundColor: colors.fill4, opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill3 }}>
        <VisualIcon id={id} color={colors.sage} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ThemedText variant="callout" weight={600}>{`Montrer : ${VISUAL_LABELS[id]}`}</ThemedText>
        <ThemedText variant="foot" color="label2">{VISUAL_BUTTON_SUB}</ThemedText>
      </View>
      <Icon name="chevronRight" size={18} color={colors.label2} strokeWidth={2.3} />
    </Pressable>
  );
}
