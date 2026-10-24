import React from 'react';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HubScreen } from '../../components/hub/HubScreen';
import { MaisonFrame } from '../../components/hub/maison/MaisonFrame';
import { Favoris } from '../../components/hub/maison/screens';

// « Mes favoris » : activités en Favori et Mises de côté (depuis la fiche ou le + du mode activité).

export default function FavorisScreen() {
  return (
    <PremiumGate>
      <HubScreen surface="maison">
        <MaisonFrame>{(ctx) => <Favoris ctx={ctx} />}</MaisonFrame>
      </HubScreen>
    </PremiumGate>
  );
}
