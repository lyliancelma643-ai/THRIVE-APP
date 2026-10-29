import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PageConsulterView } from '../components/aide/PageConsulterView';
import { PageNonView, type SoftVM } from '../components/aide/PageNonView';
import { ageBlocks, consultPage, softActivity } from '../components/aide/logic';
import { CarnetView } from '../components/maison/CarnetView';
import { FicheView } from '../components/maison/FicheView';
import { HomeView } from '../components/maison/HomeView';
import { ParcoursView } from '../components/maison/ParcoursView';
import { MaisonTour } from '../components/maison/tour/MaisonTour';
import { TourProvider, useTourRegistry } from '../components/maison/tour/anchors';
import { tourSteps } from '../components/maison/tour/steps';
import { durationsText, PARCOURS_FILTERS } from '../components/maison/models';
import { materialsLabel } from '../components/maison/helpers';
import { p3Pool } from '../lib/p3';
import { vignetteIdFor } from '../lib/vignettes';
import { HOME_ACTIONS, carnetFixture, ficheFixture, homeFixture, parcoursFixture } from './fixtures/maison';
import { screens as activite } from './lot-activite';
import type { GalleryScreen } from './types';

/**
 * Écrans du lot « maison » rendus avec des fixtures (DEV uniquement) : K Maison, K2 Tout le parcours, L Fiche moment,
 * M Moment en cours, N Le carnet, K3 Maison seul (essai + invitation Offres), K4 Quand il dit non, K5 Quand consulter. Insets de maquette (barre d'état 54, indicateur d'accueil 34), comme les autres lots.
 */
function Phone({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaInsetsContext.Provider value={{ top: 54, bottom: 34, left: 0, right: 0 }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaInsetsContext.Provider>
  );
}

const noop = () => {};

// K4 / K5 : pages d'aide. Textes = module partagé ; fiche anti-refus = vraie fiche du pool (aucune donnée inventée).
function softFixture(): SoftVM | null {
  const a = softActivity({ firstName: '', band: '8-11', moments: [], pool: p3Pool() });
  return a ? { id: a.id, vignetteId: vignetteIdFor(a), title: a.title, detail: `${durationsText(a)} · ${materialsLabel(a)}` } : null;
}

const K = () => <Phone><HomeView vm={homeFixture('included')} actions={HOME_ACTIONS} /></Phone>;
// KT : Maison + visite guidée de première arrivée (ouverte d'office ; « Revoir » la relance).
function KT() {
  const reg = useTourRegistry();
  const [open, setOpen] = useState(true);
  const vm = homeFixture('included');
  return (
    <Phone>
      <TourProvider value={reg}>
        <HomeView vm={vm} actions={HOME_ACTIONS} />
        {!open ? (
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Revoir la visite"
            style={{ position: 'absolute', top: 63, left: 138, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9EB50' }}
          >
            <Text style={{ fontWeight: '700', fontSize: 17, color: '#022539' }}>?</Text>
          </Pressable>
        ) : null}
        <MaisonTour visible={open} steps={tourSteps({ childName: vm.childName, weekTarget: vm.counter.target })} onClose={() => setOpen(false)} onLaunch={noop} />
      </TourProvider>
    </Phone>
  );
}

const K3 = () => <Phone><HomeView vm={homeFixture('trial')} actions={HOME_ACTIONS} /></Phone>;
const K2 = () => <Phone><ParcoursView vm={parcoursFixture()} onBack={noop} onOpen={noop} /></Phone>;
const L = () => <Phone><FicheView vm={ficheFixture()} onBack={noop} onDuration={noop} onStart={noop} /></Phone>;
const N = () => <Phone><CarnetView vm={carnetFixture()} onBack={noop} onShare={noop} onOpenActivity={noop} /></Phone>;

const K4 = () => (
  <Phone>
    <PageNonView blocks={ageBlocks('8-11')} soft={softFixture()} listLabel={PARCOURS_FILTERS.refus.subtitle} onBack={noop} onOpenSoft={noop} onOpenList={noop} />
  </Phone>
);
const K5 = () => <Phone><PageConsulterView page={consultPage()} onBack={noop} onOpen={noop} /></Phone>;

export const screens: GalleryScreen[] = [
  { id: 'K', title: 'Maison', tab: 'maison', render: () => <K /> },
  { id: 'KT', title: 'Maison · visite guidée', tab: 'maison', render: () => <KT /> },
  { id: 'K2', title: 'Tout le parcours', tab: null, render: () => <K2 /> },
  { id: 'L', title: 'Fiche moment', tab: null, render: () => <L /> },
  { id: 'N', title: 'Le carnet', tab: null, render: () => <N /> },
  { id: 'K3', title: 'Maison seul', tab: 'maison', render: () => <K3 /> },
  { id: 'K4', title: 'Quand il dit non', tab: null, render: () => <K4 /> },
  { id: 'K5', title: 'Quand consulter', tab: null, render: () => <K5 /> },
  // M, M1–M17, MV, VI1–VI8 : le mode activité (toujours Veillée), voir lot-activite.tsx.
  ...activite,
];
