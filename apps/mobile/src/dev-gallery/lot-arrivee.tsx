import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { WelcomeView } from '../components/account/WelcomeView';
import type { GalleryScreen } from './types';

/**
 * Écrans du lot « arrivée et compte » rendus avec des fixtures (DEV uniquement).
 * Le canevas est un iPhone 402 × 874 avec barre d'état (54) et indicateur d'accueil (34) : on simule ces marges
 * pour que la zone sûre du banc web (nulle) reproduise celle d'un vrai iPhone.
 */
function Phone({ children }: { children: ReactNode }) {
  return (
    <SafeAreaInsetsContext.Provider value={{ top: 54, bottom: 34, left: 0, right: 0 }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaInsetsContext.Provider>
  );
}

const noop = () => {};

export const screens: GalleryScreen[] = [
  { id: 'A', title: 'Bienvenue', tab: null, render: () => <Phone><WelcomeView onStart={noop} onLogin={noop} /></Phone> },
];
