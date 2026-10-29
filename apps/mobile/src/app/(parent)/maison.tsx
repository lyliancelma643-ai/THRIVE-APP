import React from 'react';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HubScreen } from '../../components/hub/HubScreen';
import { MaisonFrame } from '../../components/hub/maison/MaisonFrame';
import { MaisonWelcome } from '../../components/hub/maison/MaisonHome';
import { Paywall } from '../../components/subscription/Paywall';
import { TabGate } from '../../components/motion/TabGate';
import { usePageStage } from '../../stores/pageReady.store';
import { TourProvider, useTourRegistry } from '../../components/maison/tour/anchors';

/** Sans accès Maison, la page affichée est l'offre : la page de chargement peut s'effacer. */
function MaisonPaywall() {
  usePageStage('maison', 'semaine', true);
  return <Paywall />;
}

// Onglet Maison : copie fidèle de l'accueil Maison du web (app/parent/(hub)/fitness/page.tsx), direction
// « Soir de famille » (surface Maison + lampe), en-tête commun aux trois onglets. L'accès Maison reste celui
// de l'app (abonnement App Store ou programme, PremiumGate).

export default function MaisonScreen() {
  // Visite guidée : les repères de Maison s'enregistrent ici, la visite fait défiler la page jusqu'à eux.
  const tourRegistry = useTourRegistry();
  return (
    <TabGate tab="maison">
      <PremiumGate fallback={<MaisonPaywall />}>
        <TourProvider value={tourRegistry}>
          <HubScreen surface="maison" ref={tourRegistry.scrollRef} onScroll={tourRegistry.onScroll}>
            <MaisonFrame>{(ctx) => <MaisonWelcome ctx={ctx} />}</MaisonFrame>
          </HubScreen>
        </TourProvider>
      </PremiumGate>
    </TabGate>
  );
}

export { ErrorBoundary } from '../../components/ErrorBoundary';
