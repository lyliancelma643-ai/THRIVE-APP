import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface, Icon, ThemedText, useTheme, type IconName } from '../../design';

export type PlusAction = { key: string; glyph: IconName; label: string; on?: boolean; onPress: () => void };

/**
 * Le « + » du mode activité, en bas à droite de la barre : un rond de 60 pt qui déplie un petit menu juste au-dessus
 * (Noter / La lettre, Favori, Mettre de côté). Le menu naît du bouton (échelle + fondu) ; un toucher dehors le referme.
 */
export function PlusMenu({ actions }: { actions: PlusAction[] }) {
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: open ? 1 : 0, duration: reduceMotion ? 0 : 200, easing: Easing.bezier(0.22, 0.61, 0.36, 1), useNativeDriver: true }).start();
  }, [open, v, reduceMotion]);
  if (!actions.length) return null;

  const pick = (a: PlusAction) => {
    Haptics.selectionAsync().catch(() => undefined);
    setOpen(false);
    // Laisser le menu se refermer avant d'ouvrir une feuille (Noter, La lettre).
    setTimeout(a.onPress, 160);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel="Plus d’options : noter, favori, mettre de côté"
        accessibilityState={{ expanded: open }}
        hitSlop={4}
        style={({ pressed }) => ({
          width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.fill2, opacity: pressed ? 0.75 : 1,
        })}
      >
        <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
          <Icon name="plus" size={28} color={colors.label} />
        </Animated.View>
      </Pressable>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le menu" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
        <Animated.View
          style={{
            position: 'absolute', right: 14, bottom: Math.max(insets.bottom, 16) + 82, minWidth: 236,
            opacity: v,
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
            shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 14 },
          }}
        >
          <GlassSurface strong heavy radius={26}>
            <View style={{ paddingVertical: 6 }} accessibilityRole="menu">
              {actions.map((a, i) => (
                <Pressable
                  key={a.key}
                  onPress={() => pick(a)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: !!a.on }}
                  style={({ pressed }) => ({
                    minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
                    backgroundColor: pressed ? colors.fill3 : 'transparent',
                    borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.separator,
                  })}
                >
                  <Icon name={a.glyph} size={21} color={a.on ? colors.accent : colors.label} />
                  <ThemedText variant="body" weight={600} style={{ flex: 1 }}>
                    {a.label}
                  </ThemedText>
                  {a.on ? <Icon name="check" size={18} color={colors.accent} /> : null}
                </Pressable>
              ))}
            </View>
          </GlassSurface>
        </Animated.View>
      </Modal>
    </>
  );
}
