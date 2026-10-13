import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { Icon } from './icons';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';

export type GlassMenuItem = {
  key?: string;
  label: string;
  onPress: () => void;
  /** `.mi.on` : option courante, 600 + coche à droite. */
  checked?: boolean;
  destructive?: boolean;
  /** `.mi.sep` : filet 0,5 pt au-dessus. */
  separator?: boolean;
};

export type GlassMenuProps = {
  items: readonly GlassMenuItem[];
  /** Appelé après le choix d'une entrée (pour refermer le menu). */
  onSelect?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * `.menu.glass` : menu d'actions en verre (rayon 26, padding 6 0, largeur mini 240), entrées `.mi`
 * 11/18, 17/22, séparées par un filet. Panneau seul : à positionner (cf. `MenuPopover`).
 */
export function GlassMenu({ items, onSelect, style }: GlassMenuProps) {
  const { colors } = useTheme();
  return (
    <GlassSurface strong radius={26} style={[{ minWidth: 240 }, style]}>
      <View accessibilityRole="menu" style={{ paddingVertical: 6 }}>
        {items.map((it, i) => (
          <Pressable
            key={it.key ?? it.label}
            accessibilityRole="menuitem"
            accessibilityLabel={it.label}
            accessibilityState={{ selected: !!it.checked }}
            onPress={() => {
              it.onPress();
              onSelect?.();
            }}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              paddingVertical: 11, paddingHorizontal: 18, backgroundColor: pressed ? colors.fill3 : 'transparent',
              borderTopWidth: it.separator && i > 0 ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.separator,
            })}
          >
            <ThemedText variant="body" weight={it.checked ? 600 : 400} style={{ color: it.destructive ? colors.sysRed : colors.label }}>
              {it.label}
            </ThemedText>
            {it.checked ? <Icon name="check" size={18} color={colors.label} strokeWidth={2.4} /> : null}
          </Pressable>
        ))}
      </View>
    </GlassSurface>
  );
}

export type MenuPopoverProps = GlassMenuProps & {
  visible: boolean;
  onClose: () => void;
  /** Position du menu dans la fenêtre (pt). */
  top: number;
  left?: number;
  right?: number;
};

/** `GlassMenu` dans un Modal transparent : un toucher dehors le referme. */
export function MenuPopover({ visible, onClose, top, left, right, items, onSelect, style }: MenuPopoverProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer le menu" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View pointerEvents="box-none" style={{ position: 'absolute', top, left, right }}>
        <GlassMenu
          items={items}
          onSelect={() => {
            onSelect?.();
            onClose();
          }}
          style={style}
        />
      </View>
    </Modal>
  );
}
