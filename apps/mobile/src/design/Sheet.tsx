import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton } from './GlassButton';
import { GlassSurface } from './GlassSurface';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { RADIUS } from './tokens';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /**
   * `medium` : `.sheet.float.glassy` (flottante en verre, 8 pt des bords, rayon 46, Fermer à droite) ;
   * `large` : `.sheet` (collée aux bords, haut arrondi 38, 62 pt sous le haut, Fermer à gauche).
   */
  detent?: 'medium' | 'large';
  children: ReactNode;
  closeLabel?: string;
  /** Bouton de droite de `.sbar` en grand détent (ex. `<GlassButton glyph="info" …/>`). */
  trailing?: ReactNode;
  /** Opacité du fond `.dim` (défaut 0,28 ; 0,18 sous une feuille flottante claire). */
  dim?: number;
  /** false : le contenu gère son propre défilement (liste virtualisée). */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Feuille modale (`.sheet`, `.grabber`, `.sbar`, `.dim`). Modal React Native : pas de piège `position: fixed`.
 * Poignée 36 × 5 `label3`, barre de 62 pt (bouton verre 44, titre 600 17 centré).
 */
export function Sheet({
  visible, onClose, title, detent = 'medium', children, closeLabel = 'Fermer', trailing, dim, scroll = true, contentStyle,
}: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const floating = detent === 'medium';
  const close = <GlassButton glyph="close" accessibilityLabel={closeLabel} onPress={onClose} />;
  const spacer = <View style={{ width: 44, height: 44 }} />;

  const header = (
    <>
      <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.label3, marginTop: 6 }} />
      <View style={{ height: 62, paddingTop: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {floating ? spacer : close}
        <ThemedText variant="headline" numberOfLines={1} accessibilityRole="header" style={{ flex: 1, textAlign: 'center' }}>{title}</ThemedText>
        {floating ? close : trailing ?? spacer}
      </View>
    </>
  );
  const body = scroll ? (
    <ScrollView
      style={floating ? { maxHeight: 420 } : { flex: 1 }}
      contentContainerStyle={[{ paddingHorizontal: 16, paddingBottom: 20 + (floating ? 0 : insets.bottom) }, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: floating ? undefined : 1, paddingHorizontal: 16 }, contentStyle]}>{children}</View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: `rgba(0,0,0,${dim ?? 0.28})` }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {floating ? (
          <View style={{ margin: 8, marginBottom: 8 + insets.bottom / 2 }}>
            <GlassSurface strong heavy radius={RADIUS.sheetFloat}>
              {header}
              {body}
            </GlassSurface>
          </View>
        ) : (
          <View
            style={{
              height: Math.max(240, winH - 62), backgroundColor: colors.bgGrouped,
              borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden',
            }}
          >
            {header}
            {body}
          </View>
        )}
      </View>
    </Modal>
  );
}
