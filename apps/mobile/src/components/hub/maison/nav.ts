import { useRouter } from 'expo-router';
import type { AgeBand, Duration } from '../../../lib/p3web';
import type { MaisonCtx } from './MaisonFrame';

type Place = 'maison' | 'exterieur' | 'voiture';

/** Les chemins de Maison (P3_BASE du web) traduits en routes de l'app. */
export function useMaisonNav(ctx: Pick<MaisonCtx, 'child' | 'band' | 'hasChild'>) {
  const router = useRouter();
  return {
    fiche: (id: string, opts: { duree?: Duration; lieu?: Place; bande?: AgeBand } = {}) =>
      router.push({
        pathname: '/(parent)/activite/[activityId]',
        params: {
          activityId: id,
          ...(opts.duree ? { duree: String(opts.duree) } : {}),
          ...(opts.lieu ? { lieu: opts.lieu } : {}),
          ...(opts.bande ? { bande: opts.bande } : {}),
        },
      }),
    /** Le mode activité (plein écran, toujours à la lampe) ; sans profil enfant, on propose d'abord de l'ajouter. */
    launch: (id: string, duree: Duration, lieu: Place, bande?: AgeBand) => {
      if (!ctx.hasChild) {
        router.push('/(parent)/children');
        return;
      }
      router.push({
        pathname: '/(parent)/moment/[activityId]',
        params: { activityId: id, childId: ctx.child.id, band: bande ?? ctx.band, duration: String(duree), lieu },
      });
    },
    home: () => router.navigate('/(parent)/maison'),
    back: () => (router.canGoBack() ? router.back() : router.navigate('/(parent)/maison')),
    toutes: () => router.push('/(parent)/toutes'),
    programme: () => router.push('/(parent)/programme'),
    carnet: () => router.push('/(parent)/carnet'),
    non: () => router.push('/(parent)/quand-il-dit-non'),
    sources: () => router.push('/(parent)/sources'),
    consulter: () => router.push('/(parent)/quand-consulter'),
    videos: () => router.push('/(parent)/videos'),
    objet: (rewardId: string) => router.push({ pathname: '/(parent)/objet/[rewardId]', params: { rewardId, childId: ctx.child.id } }),
  };
}
