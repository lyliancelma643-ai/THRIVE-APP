import React from 'react';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HubScreen } from '../../components/hub/HubScreen';
import { MaisonFrame } from '../../components/hub/maison/MaisonFrame';
import { PageNon } from '../../components/hub/maison/screens';

// « Quand il dit non » (web : fitness/quand-il-dit-non) : la tranche de l'enfant d'abord, puis une fiche anti-refus.

export default function QuandIlDitNonScreen() {
  return (
    <PremiumGate>
      <HubScreen surface="maison" readingWidth={760}>
        <MaisonFrame>{(ctx) => <PageNon ctx={ctx} />}</MaisonFrame>
      </HubScreen>
    </PremiumGate>
  );
}
