import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import type { TourAnchorId } from './steps';

/**
 * Repères de la visite guidée : les éléments de Maison s'enregistrent ici (TourAnchor), la visite les mesure et fait défiler
 * la page jusqu'à eux. Sans fournisseur (galerie, autres écrans), TourAnchor est un simple View : rien ne change.
 */
type Registry = {
  register: (id: TourAnchorId, node: View | null) => void;
  get: (id: TourAnchorId) => View | null;
  scrollRef: RefObject<ScrollView | null>;
  offset: RefObject<number>;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

const TourContext = createContext<Registry | null>(null);

export function useTourRegistry(): Registry {
  const nodes = useRef(new Map<TourAnchorId, View>());
  const scrollRef = useRef<ScrollView | null>(null);
  const offset = useRef(0);
  const register = useCallback((id: TourAnchorId, node: View | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  }, []);
  const get = useCallback((id: TourAnchorId) => nodes.current.get(id) ?? null, []);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);
  return useMemo(() => ({ register, get, scrollRef, offset, onScroll }), [register, get, onScroll]);
}

export function TourProvider({ value, children }: { value: Registry; children: ReactNode }) {
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

/** Pour la ScrollView de Maison : sa référence et le suivi du défilement (null hors visite). */
export function useTourScroll() {
  return useContext(TourContext);
}

export function TourAnchor({ id, style, children }: { id: TourAnchorId; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reg = useContext(TourContext);
  return (
    <View ref={reg ? (n) => reg.register(id, n) : undefined} collapsable={false} style={style}>
      {children}
    </View>
  );
}
