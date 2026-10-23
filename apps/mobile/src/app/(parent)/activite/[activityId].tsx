import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PremiumGate } from '../../../components/subscription/PremiumGate';
import { FicheScreen } from '../../../components/hub/maison/Fiche';

// La fiche d'une activité : copie fidèle de la fiche du web (app/parent/(hub)/fitness/[activityId]).
// Paramètres : duree (10|20|30), lieu (maison|exterieur|voiture), bande (version d'une autre tranche d'âge).

export default function ActivityScreen() {
  const params = useLocalSearchParams<{ activityId: string; duree?: string; lieu?: string; bande?: string }>();
  return (
    <PremiumGate>
      <FicheScreen params={{ activityId: String(params.activityId ?? ''), duree: params.duree, lieu: params.lieu, bande: params.bande }} />
    </PremiumGate>
  );
}
