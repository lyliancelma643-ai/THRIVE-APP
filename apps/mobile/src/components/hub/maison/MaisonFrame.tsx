import { useCallback, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AccentButton, Eyebrow, FadeUp, NcCard, Skeleton, WText } from '../../../design/web';
import { useAuthStore } from '../../../stores/auth.store';
import { useChildStore, useSelectedChild, type ChildProfile } from '../../../stores/child.store';
import { PARENT_ONLY_PREFIX, useP3Data, type P3Data } from '../../../hooks/useP3Data';
import type { AgeBand } from '../../../lib/p3web';

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
  return (
    <View style={{ gap: 20, marginTop: 8 }} accessibilityLabel="Chargement">
      <Skeleton height={20} radius={10} style={{ width: 160 }} />
      <Skeleton height={360} radius={28} />
      <Skeleton height={96} />
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
export function useMaison(): { status: 'loading' | 'under8' | 'ready'; ctx: MaisonCtx | null; onboarding: boolean } {
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

  if (!child || data.loading) return { status: 'loading', ctx: null, onboarding: false };
  if (!data.band) return { status: 'under8', ctx: null, onboarding: false };
  return {
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
  if (m.status === 'loading' || !m.ctx) return m.status === 'under8' ? <Under8 /> : <MaisonSkeleton />;
  return (
    <>
      {m.onboarding ? <OnboardingSteps /> : null}
      {children(m.ctx)}
    </>
  );
}
