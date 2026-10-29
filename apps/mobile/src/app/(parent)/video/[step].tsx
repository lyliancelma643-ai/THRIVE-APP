import React, { useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useChildren, useFamily } from '@thrive/shared';
import { useAuthStore } from '../../../stores/auth.store';
import { VideoDoneView } from '../../../components/video/VideoDoneView';
import { VideoReadyView } from '../../../components/video/VideoReadyView';
import { goBack } from '../../../lib/goBack';
import { VIDEO_SESSIONS_ENABLED } from '../../../lib/featureFlags';

/**
 * Séances vidéo, étapes P (« pret »), Q (« question »), R (« fin »). Tant que VIDEO_SESSIONS_ENABLED est faux, la route
 * redirige vers « Bientôt disponible » : les vues ne sont visibles que dans la galerie DEV.
 * [À COMPLÉTER] branchement : séance courante (video_sessions), lecteur Wistia, questions posées pendant la vidéo
 * (étape « question », volontairement sans rendu ici), enregistrement de l'effort ressenti.
 * NB : la route doit être masquée de la barre (`href: null`) dans app/(parent)/_layout.tsx.
 */
export default function VideoStepScreen() {
  if (!VIDEO_SESSIONS_ENABLED) return <Redirect href="/(parent)/videos" />;
  return <Step />;
}

function Step() {
  const { step } = useLocalSearchParams<{ step?: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children } = useChildren(family?.id);
  const [effort, setEffort] = useState(5);
  const child = children[0];
  const name = child?.first_name ?? '';
  const done = () => router.replace('/(parent)/maison');
  const leave = () => goBack(router, '/(parent)/maison');

  if (step === 'pret') {
    return (
      <VideoReadyView
        childName={name}
        partnerInitial=""
        vignetteId="ACT-0603"
        questionCount={0}
        rows={[]}
        onStart={() => router.replace('/(parent)/video/question')}
        onLater={leave}
        onClose={leave}
      />
    );
  }
  if (step === 'fin') {
    return <VideoDoneView sessionNumber={0} childName={name} durationMinutes={20} effort={effort} onEffortChange={setEffort} onFinish={done} />;
  }
  return <Redirect href="/(parent)/videos" />;
}
