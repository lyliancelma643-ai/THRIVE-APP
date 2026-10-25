import { forwardRef, useState, type ReactNode } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps } from 'react-native';
import { Lamp } from '../../design';
import { WebSurfaceProvider, useWeb, type WebSurface } from '../../design/web';
import { HubHeader } from './HubHeader';
import { MAX_COLUMN, useLayout } from '../../design/layout';

type Props = {
  surface?: WebSurface;
  children: ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
  /** Sans en-tête (écrans secondaires : fiche, carnet…) : l'en-tête reste celui des onglets du web. */
  header?: boolean;
  /** Contenu posé sous la barre défilante (barre d'actions collante d'une fiche…). */
  overlay?: ReactNode;
  contentPaddingBottom?: number;
  /** Écrans de lecture (programme, sources…) : largeur de colonne de texte sur iPad (défaut : toute la largeur utile). */
  readingWidth?: number;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

function Body({ children, refreshControl, header = true, overlay, contentPaddingBottom = 56, onScroll, readingWidth }: Omit<Props, 'surface'>, ref: React.Ref<ScrollView>) {
  const w = useWeb();
  const { isTablet } = useLayout();
  const gutter = isTablet ? 32 : 20;
  const [scrolled, setScrolled] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: w.bg }}>
      {/* La lampe (Maison) : une lueur en haut de l'écran, sur un fond lisse ; calque qui ne capte aucun geste. */}
      {w.surfaceKind === 'maison' ? <Lamp /> : null}
      {header ? (
        <View style={{ borderBottomWidth: 1, borderBottomColor: scrolled ? w.line : 'transparent', zIndex: 2 }}>
          <HubHeader />
        </View>
      ) : null}
      <ScrollView
        ref={ref}
        refreshControl={refreshControl}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y > 4 !== scrolled) setScrolled(y > 4);
          onScroll?.(e);
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 4, paddingBottom: contentPaddingBottom, width: '100%', maxWidth: (readingWidth ?? MAX_COLUMN) + gutter * 2, alignSelf: 'center' }}
      >
        {children}
      </ScrollView>
      {overlay}
    </View>
  );
}

const BodyRef = forwardRef(Body);

/**
 * Coque d'un écran de l'espace parent porté du web : en-tête (logo, enfant, quatre boutons) collé en haut,
 * contenu défilant avec la gouttière de 20 px du web ; `surface="maison"` = direction « Soir de famille » + lampe.
 */
export const HubScreen = forwardRef<ScrollView, Props>(function HubScreen({ surface = 'base', ...rest }, ref) {
  return (
    <WebSurfaceProvider surface={surface}>
      <BodyRef ref={ref} {...rest} />
    </WebSurfaceProvider>
  );
});
