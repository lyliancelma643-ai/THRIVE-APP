import React from 'react';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HubScreen } from '../../components/hub/HubScreen';
import { MaisonFrame } from '../../components/hub/maison/MaisonFrame';
import { MaisonWelcome } from '../../components/hub/maison/MaisonHome';

// Onglet Maison : copie fidèle de l'accueil Maison du web (app/parent/(hub)/fitness/page.tsx), direction
// « Soir de famille » (surface Maison + lampe), en-tête commun aux trois onglets. L'accès Maison reste celui
// de l'app (abonnement App Store ou programme, PremiumGate).

export default function MaisonScreen() {
  return (
    <PremiumGate>
      <HubScreen surface="maison">
        <MaisonFrame>{(ctx) => <MaisonWelcome ctx={ctx} />}</MaisonFrame>
      </HubScreen>
    </PremiumGate>
  );
}
