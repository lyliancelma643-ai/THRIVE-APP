import React from 'react';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HubScreen } from '../../components/hub/HubScreen';
import { MaisonFrame } from '../../components/hub/maison/MaisonFrame';
import { Carnet } from '../../components/hub/maison/screens';

// « Le carnet » (web : fitness/carnet) : moments gardés, objets débloqués à leur date, objets à venir.

export default function CarnetScreen() {
  return (
    <PremiumGate>
      <HubScreen surface="maison" readingWidth={760}>
        <MaisonFrame>{(ctx) => <Carnet ctx={ctx} />}</MaisonFrame>
      </HubScreen>
    </PremiumGate>
  );
}
