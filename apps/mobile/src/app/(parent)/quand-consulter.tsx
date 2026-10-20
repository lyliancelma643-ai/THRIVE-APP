import React, { useMemo } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { PageConsulterView } from '../../components/aide/PageConsulterView';
import { consultPage } from '../../components/aide/logic';

// K5 « Quand consulter » : PAGE_CONSULTER en page. Volontairement SANS verrou d'abonnement (information de sécurité,
// toujours joignable). Le statut de validation du texte et la note de vérification du web ne s'affichent pas.

export default function QuandConsulterScreen() {
  const router = useRouter();
  const page = useMemo(() => consultPage(), []);
  return (
    <PageConsulterView
      page={page}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(parent)/maison'))}
      onOpen={(url) => { void Linking.openURL(url); }}
    />
  );
}
