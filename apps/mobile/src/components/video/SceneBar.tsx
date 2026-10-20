import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAV_BAR_ROW } from '../../design';

/** `.navbar` d'une scène vidéo : posée en haut par-dessus l'image, sans filet ni fond, boutons à gauche et à droite. */
export function SceneBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40, paddingTop: insets.top }}>
      <View style={{ height: NAV_BAR_ROW, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{left}</View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{right}</View>
      </View>
    </View>
  );
}
