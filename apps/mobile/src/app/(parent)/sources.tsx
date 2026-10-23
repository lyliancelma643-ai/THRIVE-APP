import React from 'react';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HubScreen } from '../../components/hub/HubScreen';
import { MaisonFrame } from '../../components/hub/maison/MaisonFrame';
import { Sources } from '../../components/hub/maison/screens';

// « Les sources de la méthode » (web : fitness/sources).

export default function SourcesScreen() {
  return (
    <PremiumGate>
      <HubScreen surface="maison">
        <MaisonFrame>{(ctx) => <Sources ctx={ctx} />}</MaisonFrame>
      </HubScreen>
    </PremiumGate>
  );
}
