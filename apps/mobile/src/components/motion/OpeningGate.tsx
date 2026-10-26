import { useEffect, useMemo, type ReactNode } from 'react';
import { useLoadStages } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { useChildStore } from '../../stores/child.store';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { StairLoader } from './StairLoader';
import { ouvertureScenario } from './scenarios';

// Une seule ouverture par lancement de l'app : ensuite, les changements d'écran gardent leurs propres chargements.
let openedThisLaunch = false;
export const resetOpening = () => {
  openedThisLaunch = false;
};

export type OpeningProgress = { childName: string | null; childReady: boolean; weekReady: boolean; week?: number | null; theme?: string | null };

/**
 * Ouverture de l'app → Maison : l'escalier dit où on en est, sur 4 événements réels (session, profil de l'enfant,
 * semaine en cours, accès). Rien ne s'affiche si tout est prêt en moins de 400 ms. Session restaurée : pas de
 * bouton, on enchaîne tout seul.
 */
export function OpeningGate({ progress, onRetry, children }: { progress: OpeningProgress; onRetry: () => void; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const serverAccess = useSubscriptionStore((s) => s.serverAccess);
  const scenario = useMemo(
    () => ouvertureScenario({ childName: progress.childName, week: progress.week, theme: progress.theme }),
    [progress.childName, progress.week, progress.theme],
  );
  const stages = useLoadStages(scenario.stages, {
    onDone: () => {
      openedThisLaunch = true;
    },
    onRetry: () => {
      const uid = useAuthStore.getState().user?.id;
      if (uid) void useChildStore.getState().loadChildren(uid);
      void useSubscriptionStore.getState().loadServerAccess();
      onRetry();
    },
  });
  const { markDone } = stages;
  useEffect(() => { if (user) markDone('session'); }, [user, markDone]);
  useEffect(() => { if (progress.childReady) markDone('profil'); }, [progress.childReady, markDone]);
  useEffect(() => { if (progress.weekReady) markDone('semaine'); }, [progress.weekReady, markDone]);
  useEffect(() => { if (serverAccess !== null) markDone('acces'); }, [serverAccess, markDone]);

  if (openedThisLaunch || stages.done) return <>{children}</>;
  if (!stages.visible) return null;
  return (
    <StairLoader
      title={scenario.title}
      doneTitle={scenario.doneTitle}
      doneSubtitle={scenario.doneSubtitle}
      stages={scenario.stages}
      index={stages.index}
      total={stages.total}
      done={stages.done}
      slow={stages.slow}
      canRetry={stages.canRetry}
      failed={!!stages.failed}
      onRetry={stages.retry}
    />
  );
}

export const isOpened = () => openedThisLaunch;
