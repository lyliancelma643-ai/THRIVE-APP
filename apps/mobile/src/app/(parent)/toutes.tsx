import React from 'react';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HubScreen } from '../../components/hub/HubScreen';
import { MaisonFrame } from '../../components/hub/maison/MaisonFrame';
import { Catalogue } from '../../components/hub/maison/screens';

// « Toutes les activités » : le catalogue du web (fitness/toutes), version par âge, filtres, ordre.

export default function ToutesScreen() {
  return (
    <PremiumGate>
      <HubScreen surface="maison">
        <MaisonFrame>{(ctx) => <Catalogue ctx={ctx} />}</MaisonFrame>
      </HubScreen>
    </PremiumGate>
  );
}
