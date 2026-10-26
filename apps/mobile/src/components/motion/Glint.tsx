import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { useWeb } from '../../design/web';
import { ease } from './anim';

/**
 * Carte de déblocage : monte du bas (140 % → 0, 500 ms) et reçoit un reflet unique, une bande blanche
 * translucide en aplat inclinée à −20° qui la traverse (900 ms après 450 ms). Sans animation si `skip`.
 */
export function UnlockRise({ skip, style, children }: { skip?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { reduceMotion } = useWeb();
  const instant = skip || reduceMotion;
  const up = useRef(new Animated.Value(instant ? 1 : 0)).current;
  const glint = useRef(new Animated.Value(0)).current;
  const width = useRef(0);
  useEffect(() => {
    if (instant) return;
    Animated.timing(up, { toValue: 1, duration: 500, easing: ease.out, useNativeDriver: true }).start();
    Animated.timing(glint, { toValue: 1, duration: 900, delay: 450, easing: ease.inOut, useNativeDriver: true }).start();
  }, [up, glint, instant]);
  return (
    <Animated.View
      onLayout={(e) => { width.current = e.nativeEvent.layout.width; }}
      style={[{ opacity: up.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ translateY: up.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) }] }, style]}
    >
      {children}
      {instant ? null : (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: 22 }}>
          <Animated.View
            style={{
              position: 'absolute', top: -20, bottom: -20, width: 36, backgroundColor: 'rgba(255,255,255,0.22)',
              transform: [{ translateX: glint.interpolate({ inputRange: [0, 1], outputRange: [-60, 420] }) }, { rotate: '-20deg' }],
            }}
          />
        </View>
      )}
    </Animated.View>
  );
}
