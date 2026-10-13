import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { CarnetView } from '../components/maison/CarnetView';
import { FicheView } from '../components/maison/FicheView';
import { HomeView } from '../components/maison/HomeView';
import { MomentView } from '../components/maison/MomentView';
import { ParcoursView } from '../components/maison/ParcoursView';
import { HOME_ACTIONS, carnetFixture, ficheFixture, homeFixture, momentFixture, parcoursFixture } from './fixtures/maison';
import type { GalleryScreen } from './types';

/**
 * Écrans du lot « maison » rendus avec des fixtures (DEV uniquement) : K Maison, K2 Tout le parcours, L Fiche moment,
 * M Moment en cours, N Le carnet, K3 Maison seul (essai + invitation Offres). Insets de maquette (barre d'état 54, indicateur d'accueil 34), comme les autres lots.
 */
function Phone({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaInsetsContext.Provider value={{ top: 54, bottom: 34, left: 0, right: 0 }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaInsetsContext.Provider>
  );
}

const noop = () => {};

const K = () => <Phone><HomeView vm={homeFixture('included')} actions={HOME_ACTIONS} /></Phone>;
const K3 = () => <Phone><HomeView vm={homeFixture('trial')} actions={HOME_ACTIONS} /></Phone>;
const K2 = () => <Phone><ParcoursView vm={parcoursFixture()} onBack={noop} onOpen={noop} /></Phone>;
const L = () => <Phone><FicheView vm={ficheFixture()} onBack={noop} onDuration={noop} onStart={noop} /></Phone>;
const M = () => <Phone><MomentView vm={momentFixture()} onClose={noop} onPrev={noop} onNext={noop} onToggle={noop} onStop={noop} /></Phone>;
const N = () => <Phone><CarnetView vm={carnetFixture()} onBack={noop} onShare={noop} onOpenActivity={noop} /></Phone>;

export const screens: GalleryScreen[] = [
  { id: 'K', title: 'Maison', tab: 'maison', render: () => <K /> },
  { id: 'K2', title: 'Tout le parcours', tab: null, render: () => <K2 /> },
  { id: 'L', title: 'Fiche moment', tab: null, render: () => <L /> },
  { id: 'M', title: 'Moment en cours', tab: null, render: () => <M /> },
  { id: 'N', title: 'Le carnet', tab: null, render: () => <N /> },
  { id: 'K3', title: 'Maison seul', tab: 'maison', render: () => <K3 /> },
];
