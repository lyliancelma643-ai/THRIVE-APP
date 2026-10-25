import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View, } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tap, WIcon, WText, useWeb } from '../../design/web';
import { useLayout } from '../../design/layout';

/**
 * Feuille du bas de l'espace parent (la `BilanSheet` / `TonightSettings` du web sur téléphone) avec le geste iOS :
 * le voile s'assombrit, la feuille monte d'un ressort, se ferme en la glissant vers le bas depuis la poignée,
 * en touchant le voile ou le bouton Fermer. Contenu défilant jusqu'à 86 % de l'écran.
 */
export function WebSheet({
  visible, onClose, title, children, accessibilityLabel,
}: { visible: boolean; onClose: () => void; title?: string; children: ReactNode; accessibilityLabel?: string }) {
  const w = useWeb();
  const insets = useSafeAreaInsets();
  const { height, sheetInset: inset } = useLayout();
  const y = useRef(new Animated.Value(height)).current;
  const dim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.setValue(height);
      Animated.parallel([
        Animated.timing(dim, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 230, mass: 0.9 }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(dim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(y, { toValue: height, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  // Glisser la poignée vers le bas : la feuille suit le doigt ; au-delà de 120 pt (ou d'un geste vif), elle se ferme.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 1.1) closeRef.current();
        else Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 260 }).start();
      },
    }),
  ).current;

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: dim }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel={accessibilityLabel ?? title}
        style={{
          position: 'absolute', left: inset, right: inset, bottom: 0, maxHeight: height * 0.9, transform: [{ translateY: y }],
          borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: w.surface, borderWidth: 1, borderColor: w.line2,
          shadowColor: '#000A14', shadowOpacity: 0.5, shadowRadius: 25, shadowOffset: { width: 0, height: -18 }, elevation: 16,
        }}
      >
        <View {...pan.panHandlers} style={{ paddingTop: 8, paddingBottom: 4, alignItems: 'center' }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: w.line2 }} />
        </View>
        <Tap
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          style={{ position: 'absolute', top: 14, right: 14, zIndex: 5, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: w.line2, alignItems: 'center', justifyContent: 'center', backgroundColor: w.surface }}
        >
          <WIcon name="close" size={18} color={w.text2} />
        </Tap>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: Math.max(24, insets.bottom + 8) }}
        >
          {title ? (
            <View {...pan.panHandlers} style={{ paddingRight: 56, marginTop: 4 }}>
              <WText display size={26} weight={500} lh={1.15} tone="ink" accessibilityRole="header">
                {title}
              </WText>
            </View>
          ) : null}
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
