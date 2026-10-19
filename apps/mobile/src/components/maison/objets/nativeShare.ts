// Liaison native de share.ts : expo-print, expo-sharing, react-native-view-shot. Chaque module est chargé à
// l'appel (et protégé) : s'il manque sur la plateforme, l'action retombe sur le repli de share.ts.
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { ObjectShareDeps } from './share';

export function nativeShareDeps(cardRef: RefObject<View | null>): ObjectShareDeps {
  return {
    print: async (html) => {
      const Print = await import('expo-print');
      await Print.printAsync({ html });
    },
    capture: async () => {
      const { captureRef } = await import('react-native-view-shot');
      if (!cardRef.current) throw new Error('card-not-mounted');
      return captureRef(cardRef.current, { format: 'png', quality: 1, result: 'tmpfile' });
    },
    isSharingAvailable: async () => {
      const Sharing = await import('expo-sharing');
      return typeof Sharing.isAvailableAsync === 'function' ? Sharing.isAvailableAsync() : false;
    },
    share: async (uri, dialogTitle) => {
      const Sharing = await import('expo-sharing');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
    },
  };
}
