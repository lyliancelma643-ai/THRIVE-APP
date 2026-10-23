import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useWeb } from '../../design/web';

/**
 * Panneau déroulant de l'en-tête (menu du compte, notifications) : `.animate-menu-in` du web — il naît du coin
 * haut droit (150 ms, sans rebond) ; un toucher dehors le referme sans rien activer dessous.
 */
export function Popover({
  visible, onClose, top, right = 12, left, width, children, style, accessibilityLabel,
}: {
  visible: boolean;
  onClose: () => void;
  top: number;
  right?: number;
  left?: number;
  width?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const w = useWeb();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) {
      v.setValue(0);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: w.reduceMotion ? 0 : 160, easing: Easing.bezier(0.22, 0.61, 0.36, 1), useNativeDriver: true }).start();
  }, [visible, v, w.reduceMotion]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel={accessibilityLabel}
        style={[
          {
            position: 'absolute', top, right: left === undefined ? right : undefined, left, width,
            opacity: v,
            borderRadius: 18,
            shadowColor: '#000A14', shadowOpacity: w.isNight ? 0.5 : 0.18, shadowRadius: 25, shadowOffset: { width: 0, height: 18 }, elevation: 12,
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
              { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          },
        ]}
      >
        <View style={[{ borderRadius: 18, backgroundColor: w.surface, borderWidth: 1, borderColor: w.line, overflow: 'hidden' }, style]}>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
