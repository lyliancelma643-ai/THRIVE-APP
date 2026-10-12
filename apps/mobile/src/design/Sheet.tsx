import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton } from './GlassButton';
import { GlassSurface } from './GlassSurface';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { RADIUS, SPACING } from './tokens';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** `medium` : flottante en verre ; `large` : collée aux bords, coins hauts 38 pt. */
  detent?: 'medium' | 'large';
  children: ReactNode;
  closeLabel?: string;
};

/**
 * Feuille modale iOS 27 (Modal natif : pas de piège `position: fixed` du layout parent).
 * Fond assombri, poignée 36×5, bouton Fermer en GlassButton.
 */
export function Sheet({ visible, onClose, title, detent = 'medium', children, closeLabel = 'Fermer' }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const floating = detent === 'medium';
  const body = (
    <View style={{ padding: SPACING.space4, paddingBottom: SPACING.space4 + (floating ? 0 : insets.bottom) }}>
      <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.label3, marginBottom: SPACING.space3 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.space3 }}>
        <ThemedText variant="headline" accessibilityRole="header" style={{ flex: 1 }}>{title}</ThemedText>
        <GlassButton icon="close" accessibilityLabel={closeLabel} onPress={onClose} />
      </View>
      <ScrollView style={{ maxHeight: floating ? 420 : 640 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'flex-end' }}
      >
        {/* Pressable interne : un toucher dans la feuille ne la ferme pas. */}
        <Pressable accessible={false} onPress={() => {}} style={floating ? { margin: SPACING.space2 + insets.bottom / 2 } : undefined}>
          {floating ? (
            <GlassSurface strong radius={RADIUS.sheetFloat}>{body}</GlassSurface>
          ) : (
            <View style={{ backgroundColor: colors.bgGrouped, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet }}>
              {body}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
