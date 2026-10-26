import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useLoadStages } from '@thrive/shared';
import { WebSurfaceProvider, useWeb } from '../design/web';
import { BreathingBall } from '../components/motion/BreathingBall';
import { MicroTip } from '../components/motion/MicroTip';
import { OdometerNumber } from '../components/motion/OdometerNumber';
import { ProgressRing } from '../components/motion/ProgressRing';
import { SealCaption, SealLetter } from '../components/motion/SealLetter';
import { StairLoader } from '../components/motion/StairLoader';
import { UploadProgress } from '../components/motion/UploadProgress';
import { WaveSkeleton } from '../components/motion/WaveSkeleton';
import { ouvertureScenario } from '../components/motion/scenarios';
import type { GalleryScreen } from './types';

/** Banc de mouvement (DEV) : chaque composant avec des événements simulés, jamais livré. */
function Stage({ children }: { children: ReactNode }) {
  const Inner = () => {
    const w = useWeb();
    return (
      <ScrollView style={{ flex: 1, backgroundColor: w.bg }} contentContainerStyle={{ padding: 20, paddingTop: 48, gap: 20 }}>
        {children}
      </ScrollView>
    );
  };
  return (
    <WebSurfaceProvider surface="maison">
      <Inner />
    </WebSurfaceProvider>
  );
}

function StairDemo({ delays }: { delays: number[] }) {
  const sc = ouvertureScenario({ childName: 'Léa', week: 3, theme: 'Le courage' });
  const s = useLoadStages(sc.stages, {});
  useEffect(() => {
    const ids = sc.stages.map((st, i) => setTimeout(() => s.markDone(st.key), delays[i]));
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line
  }, []);
  if (!s.visible && !s.done) return null;
  return (
    <StairLoader
      title={sc.title} doneTitle={sc.doneTitle} doneSubtitle={sc.doneSubtitle} stages={sc.stages}
      index={s.index} total={s.total} done={s.done} slow={s.slow} canRetry={s.canRetry} onRetry={s.retry}
      cta={{ label: sc.cta, onPress: () => undefined }} tip={<MicroTip context="ouverture" week={3} childName="Léa" />}
    />
  );
}

function SealDemo() {
  const [phase, setPhase] = useState<'ready' | 'sealing' | 'sealed'>('ready');
  useEffect(() => {
    const a = setTimeout(() => setPhase('sealing'), 600);
    const b = setTimeout(() => setPhase('sealed'), 3300);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return (
    <View>
      <SealLetter phase={phase} />
      <SealCaption phase={phase === 'ready' ? 'ready' : phase} date="25 janvier 2027" />
    </View>
  );
}

function UploadDemo() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setP((x) => Math.min(1, x + 0.12)), 500);
    return () => clearInterval(id);
  }, []);
  return <UploadProgress uri={null} progress={p} done={p >= 1} childName="Léa" onCancel={() => undefined} />;
}

export const screens: GalleryScreen[] = [
  { id: 'MOT-escalier', title: 'Escalier (ouverture)', tab: null, render: () => <Stage><StairDemo delays={[900, 1700, 2600, 3600]} /></Stage> },
  { id: 'MOT-escalier-rafale', title: 'Escalier (rafale)', tab: null, render: () => <Stage><StairDemo delays={[1000, 1000, 1000, 1000]} /></Stage> },
  { id: 'MOT-squelette', title: 'Squelette en vague', tab: null, render: () => <Stage><ProgressRing value={0} animate={false} /><WaveSkeleton shapes={[{ height: 72, radius: 26 }, { height: 72, radius: 26 }, { height: 120, radius: 26 }, { height: 20, radius: 6, width: '60%' }]} /></Stage> },
  { id: 'MOT-anneau', title: 'Anneau + compteur', tab: null, render: () => <Stage><ProgressRing value={0.62} size={200}><OdometerNumber value={7} from={6} size={48} /></ProgressRing></Stage> },
  { id: 'MOT-lettre', title: 'Lettre scellée', tab: null, render: () => <Stage><SealDemo /></Stage> },
  { id: 'MOT-photo', title: 'Envoi de photo', tab: null, render: () => <Stage><UploadDemo /></Stage> },
  { id: 'MOT-souffle', title: 'Souffle', tab: null, render: () => <Stage><BreathingBall onDone={() => undefined} onSkip={() => undefined} /></Stage> },
  { id: 'MOT-mot', title: 'Petit mot', tab: null, render: () => <Stage><MicroTip context="post-activite" childName="Léa" /><MicroTip context="post-activite" childName="Léa" family="question" /></Stage> },
];
