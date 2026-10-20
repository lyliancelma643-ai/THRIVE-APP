import React, { useEffect, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChildren, useFamily } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { SPACING, TAB_BAR_INSET } from '../../design';
import { ComingSoonView } from '../../components/video/ComingSoonView';
import { VIDEO_SESSIONS_ENABLED } from '../../lib/featureFlags';

// O · Séances vidéo « Bientôt disponible » (tant que VIDEO_SESSIONS_ENABLED est faux).
// Préférence « Me prévenir » : stockée sur l'appareil seulement.
// [À COMPLÉTER] synchro serveur de la préférence (aucune table/notification existante pour l'ouverture des vidéos).
// [À COMPLÉTER] liste « Ce qui viendra » : masquée, car les séances vidéo ne sont pas lisibles côté parent tant que
// le drapeau fitness_enabled est éteint (policy gate_parent_video_sessions) ; passer `upcoming` à la vue le jour venu.
export const VIDEO_NOTIFY_KEY = 'thrive.videoNotify';

export default function VideosScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children } = useChildren(family?.id);
  const [notify, setNotify] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(VIDEO_NOTIFY_KEY)
      .then((v) => setNotify(v === '1'))
      .catch(() => {});
  }, []);

  const toggle = (next: boolean) => {
    setNotify(next);
    AsyncStorage.setItem(VIDEO_NOTIFY_KEY, next ? '1' : '0').catch(() => {});
  };

  // [À COMPLÉTER] lecteur des séances vidéo : les écrans P, Q, R sont dans app/(parent)/video/[step].tsx.
  if (VIDEO_SESSIONS_ENABLED) return <Redirect href="/(parent)/video/pret" />;

  return (
    <ComingSoonView
      childName={children[0]?.first_name}
      notify={notify}
      onNotifyChange={toggle}
      onBackToHome={() => router.replace('/(parent)/maison')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(parent)/maison'))}
      onSegmentChange={(k) => {
        if (k === 'coach') router.replace('/(parent)/seances');
      }}
      bottomInset={TAB_BAR_INSET + SPACING.space8}
    />
  );
}
