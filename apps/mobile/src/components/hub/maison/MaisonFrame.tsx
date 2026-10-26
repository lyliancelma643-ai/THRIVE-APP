import { useCallback, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useDelayedFlag } from '@thrive/shared';
import { OpeningGate } from '../../motion/OpeningGate';
import { AccentButton, Eyebrow, FadeUp, NcCard, Skeleton, WText } from '../../../design/web';
import { useAuthStore } from '../../../stores/auth.store';
import { useChildStore, useSelectedChild, type ChildProfile } from '../../../stores/child.store';
import { PARENT_ONLY_PREFIX, useP3Data, type P3Data } from '../../../hooks/useP3Data';
import type { AgeBand } from '../../../lib/p3web';
import { useStall } from '../../../hooks/useStall';
import { LoadRetry } from '../LoadRetry';

export type MaisonCtx = {
  child: ChildProfile;
  /** Vrai : un vrai profil enfant (faux : profil « parent seul », données sur l'appareil). */
  hasChild: boolean;
  firstName: string;
  age: number | null;
  band: AgeBand;
  data: P3Data;
};

export const UNDER_8_MESSAGE =
  'Le programme Maison est conçu pour les 8–17 ans. Une version pour les plus jeunes est en préparation.';

/** « Pour Léa, 9 ans ». */
export function forChild(ctx: Pick<MaisonCtx, 'firstName' | 'age'>): string {
  return ctx.age === null ? `Pour ${ctx.firstName}` : `Pour ${ctx.firstName}, ${ctx.age} ans`;
}

export function MaisonSkeleton() {
  const shown = useDelayedFlag(true);
  // Jamais de squelette sans fin : au bout de 10 s, « Réessayer » relit les enfants (puis redonne 10 s).
  const [round, setRound] = useState(0);
  const stalled = useStall(true, 10_000, round);
  if (stalled) {
    return (
      <LoadRetry
        onRetry={() => {
          const uid = useAuthStore.getState().user?.id;
          if (uid) void useChildStore.getState().loadChildren(uid);
          setRound((r) => r + 1);
        }}
      />
    );
  }
  if (!shown) return null;
  return (
    <View style={{ gap: 20, marginTop: 8 }} accessibilityLabel="Chargement">
      <Skeleton index={0} height={20} radius={10} style={{ width: 160 }} />
      <Skeleton index={1} height={360} radius={28} />
      <Skeleton index={2} height={96} />
    </View>
  );
}

/** Tant qu'aucun enfant n'est enregistré : les trois étapes (au lieu d'un écran sans issue). */
function OnboardingSteps() {
  const router = useRouter();
  return (
    <FadeUp>
      <NcCard style={{ marginTop: 24, marginBottom: 8 }}>
        <Eyebrow>Pour commencer</Eyebrow>
        <WText display size={20} weight={600} tone="ink" style={{ marginTop: 4 }}>
          Trois étapes pour démarrer
        </WText>
        <View style={{ marginTop: 12, gap: 8 }}>
          {['Ajoute ton enfant.', 'Ton coach active son accès.', 'Lance une première séance.'].map((t, i) => (
            <WText key={t} size={15} tone="soft">{`${i + 1}. ${t}`}</WText>
          ))}
        </View>
        <AccentButton label="Ajouter mon enfant" height={44} onPress={() => router.push('/(parent)/children')} style={{ marginTop: 16, alignSelf: 'flex-start' }} />
      </NcCard>
    </FadeUp>
  );
}

/** État Maison de l'écran courant (enfant de l'en-tête, données relues au retour sur l'écran). */
export function useMaison(): { status: 'loading' | 'under8' | 'ready'; ctx: MaisonCtx | null; onboarding: boolean; childReady: boolean; dataReady: boolean; childName: string | null; week: number | null } {
  const selected = useSelectedChild();
  const { loaded, isLoading } = useChildStore();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const child: ChildProfile | null =
    selected ??
    (loaded && !isLoading && userId
      ? {
          id: `${PARENT_ONLY_PREFIX}${userId}`, family_id: '', first_name: 'ton enfant', last_name: null, date_of_birth: null,
          avatar_url: null, nickname: null, jersey_number: null, accent_color: null,
        }
      : null);
  const firstName = selected?.first_name ?? 'ton enfant';
  const data = useP3Data(child?.id ?? null, child?.date_of_birth ?? null, firstName);

  // Retour sur l'écran (après un moment vécu, une fiche mise de côté…) : relecture. Le premier affichage charge déjà.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) data.reload();
      focused.current = true;
    }, [data.reload]),
  );

  const childReady = !!child;
  const dataReady = !!child && !data.loading;
  const childName = selected?.first_name ?? null;
  const week = null;
  if (!child || data.loading) return { status: 'loading', ctx: null, onboarding: false, childReady, dataReady, childName, week };
  if (!data.band) return { status: 'under8', ctx: null, onboarding: false, childReady, dataReady, childName, week };
  return {
    childReady, dataReady, childName, week,
    status: 'ready',
    ctx: { child, hasChild: !!selected, firstName, age: data.age, band: data.band, data },
    onboarding: !selected,
  };
}

export function Under8() {
  return (
    <View style={{ paddingVertical: 64 }}>
      <WText size={17} lh={1.6} tone="body" center>
        {UNDER_8_MESSAGE}
      </WText>
    </View>
  );
}

/**
 * Cadre commun des écrans Maison (P3Frame du web) : enfant choisi dans l'en-tête, âge (moins de 8 ans → message
 * neutre), données (useP3Data) et squelette au premier chargement. Sans enfant, le parent accède quand même à
 * Maison (profil « parent seul ») avec les trois étapes en tête.
 */
export function MaisonFrame({ children }: { children: (ctx: MaisonCtx) => ReactNode }) {
  const m = useMaison();
  const [, setRound] = useState(0);
  const body =
    m.status === 'loading' || !m.ctx ? (
      m.status === 'under8' ? <Under8 /> : <MaisonSkeleton />
    ) : (
      <>
        {m.onboarding ? <OnboardingSteps /> : null}
        {children(m.ctx)}
      </>
    );
  // Premier affichage depuis le lancement : l'escalier d'ouverture (rien du tout si tout est prêt en 400 ms).
  return (
    <OpeningGate progress={{ childName: m.childName, childReady: m.childReady, weekReady: m.dataReady, week: m.week }} onRetry={() => setRound((r) => r + 1)}>
      {body}
    </OpeningGate>
  );
}
