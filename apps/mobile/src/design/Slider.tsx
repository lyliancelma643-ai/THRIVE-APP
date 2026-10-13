import { useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from './ThemeProvider';
import { CANVAS, SHADOW_THUMB, SPACING } from './tokens';

export type SliderProps = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  accessibilityLabel: string;
  /** Texte lu par VoiceOver pour la valeur (défaut : le nombre). */
  valueText?: (v: number) => string;
};

const THUMB_W = 44;
const THUMB_H = 30;

/**
 * `.slider` : piste 8 pt `fill`, remplissage `tint`, pouce Liquid Glass 44 × 30 (blanc 55 %, reflet haut).
 * Hauteur tactile 44 pt ; le pouce reste dans la piste (pas de débord aux extrêmes).
 */
export function Slider({ value, onChange, min = 0, max = 10, step = 1, accessibilityLabel, valueText }: SliderProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const cb = useRef({ onChange, min, max, step });
  cb.current = { onChange, min, max, step };

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const ratio = max === min ? 0 : (clamp(value) - min) / (max - min);
  const travel = Math.max(0, width - THUMB_W);

  const fromX = (x: number) => {
    const { min: lo, max: hi, step: st } = cb.current;
    const usable = Math.max(1, widthRef.current - THUMB_W);
    const r = Math.min(1, Math.max(0, (x - THUMB_W / 2) / usable));
    const raw = lo + r * (hi - lo);
    const snapped = Math.round((raw - lo) / st) * st + lo;
    cb.current.onChange(Math.min(hi, Math.max(lo, snapped)));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => fromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => fromX(e.nativeEvent.locationX),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      {...pan.panHandlers}
      onLayout={onLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: clamp(value), text: valueText ? valueText(clamp(value)) : undefined }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const d = e.nativeEvent.actionName === 'increment' ? step : e.nativeEvent.actionName === 'decrement' ? -step : 0;
        if (d) onChange(clamp(value + d));
      }}
      style={{ height: SPACING.touchMin, justifyContent: 'center' }}
    >
      <View style={{ height: 34 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 13, height: 8, borderRadius: 4, backgroundColor: colors.fill, overflow: 'hidden' }}>
          <View style={{ width: THUMB_W / 2 + ratio * travel, height: 8, backgroundColor: colors.tint }} />
        </View>
        <View
          pointerEvents="none"
          style={[
            {
              position: 'absolute', top: 2, left: ratio * travel, width: THUMB_W, height: THUMB_H, borderRadius: THUMB_H / 2,
              backgroundColor: CANVAS.thumbFill, borderWidth: 1, borderColor: CANVAS.thumbEdge, borderTopColor: CANVAS.thumbSpec,
            },
            SHADOW_THUMB,
          ]}
        />
      </View>
    </View>
  );
}
