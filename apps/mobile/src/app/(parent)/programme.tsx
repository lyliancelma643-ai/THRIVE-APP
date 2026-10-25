import React from 'react';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HubScreen } from '../../components/hub/HubScreen';
import { MaisonFrame } from '../../components/hub/maison/MaisonFrame';
import { Programme } from '../../components/hub/maison/screens';

// « Le programme » : les 13 semaines, la semaine conseillée, la bibliothèque (web : fitness/programme).

export default function ProgrammeScreen() {
  return (
    <PremiumGate>
      <HubScreen surface="maison" readingWidth={760}>
        <MaisonFrame>{(ctx) => <Programme ctx={ctx} />}</MaisonFrame>
      </HubScreen>
    </PremiumGate>
  );
}
