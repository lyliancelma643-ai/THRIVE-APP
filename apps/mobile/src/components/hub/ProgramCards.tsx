import { View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { NcCard, WIcon, WText, useWeb } from '../../design/web';
import { useSubscriptionStore } from '../../stores/subscription.store';

/**
 * Les trois programmes THRIVE (matrice packs.ts du web), sans prix ni paiement dans l'app : les prix, la réservation et
 * l'appel sont sur la page Prix du site. Parcours coachés = services entre personnes (Apple 3.1.3(d)).
 */

export const PRICING_URL = process.env.EXPO_PUBLIC_PRICING_URL || 'https://thrivesportpositive.com/prix';

/** Page Prix du site dans une feuille Safari intégrée (on revient à l'app d'un geste). */
export function openPricing(): Promise<void> {
  return WebBrowser.openBrowserAsync(PRICING_URL, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    dismissButtonStyle: 'done',
    controlsColor: '#004E7A',
  }).then(
    () => undefined,
    () => undefined,
  );
}

type Level = 'ESSENTIEL' | 'AVANCE' | 'PERFORMANCE';

const PROGRAMS: { level: Level; name: string; tagline: string; points: string[] }[] = [
  {
    level: 'ESSENTIEL',
    name: 'Groupe',
    tagline: '13 ateliers sportifs en petit groupe, de 4 à 6 jeunes.',
    points: ['Le message du coach après chaque séance', 'La jauge globale des compétences de vie', 'Le certificat de fin de parcours'],
  },
  {
    level: 'AVANCE',
    name: 'Individuel',
    tagline: '13 séances en individuel avec ton coach.',
    points: ['Le détail par compétence et la courbe de bien-être', 'La roue des émotions et le journal de progression', 'Le bilan détaillé du coach aux séances 3, 7 et 13'],
  },
  {
    level: 'PERFORMANCE',
    name: 'Complet',
    tagline: 'Le parcours complet : en individuel d’abord, puis avec le groupe.',
    points: ['Tout le forfait Individuel', 'Le bilan détaillé du coach à chaque séance', 'La lettre personnalisée et la messagerie directe avec le coach'],
  },
];

const RANK: Record<Level, number> = { ESSENTIEL: 1, AVANCE: 2, PERFORMANCE: 3 };

/** Les trois cartes ; le forfait en cours est marqué, les forfaits inférieurs sont atténués. */
export function ProgramCards({ markCurrent = true }: { markCurrent?: boolean }) {
  const w = useWeb();
  const access = useSubscriptionStore((s) => s.access);
  const current: Level | null = markCurrent && (access?.bilan || access?.seances) ? (access?.detailLevel ?? null) : null;
  return (
    <View style={{ gap: 12 }}>
      {PROGRAMS.map((p) => {
        const mine = current === p.level;
        const below = current !== null && RANK[p.level] < RANK[current];
        const best = p.level === 'PERFORMANCE' && !mine;
        return (
          <NcCard
            key={p.level}
            ring={mine ? w.sage : best ? 'rgba(249,235,80,0.45)' : undefined}
            style={{ opacity: below ? 0.6 : 1, paddingVertical: 18 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <WText display size={21} weight={600} tone="ink" lh={26}>
                {p.name}
              </WText>
              {mine || best ? (
                <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: mine ? w.sage : 'rgba(249,235,80,0.16)' }}>
                  <WText size={11} weight={700} upper tracking={0.08} color={mine ? '#06222A' : w.accentInk}>
                    {mine ? 'Ton forfait' : 'Le plus complet'}
                  </WText>
                </View>
              ) : null}
            </View>
            <WText size={14} lh={1.5} tone="soft" style={{ marginTop: 4 }}>
              {p.tagline}
            </WText>
            <View style={{ marginTop: 12, gap: 8 }}>
              {p.points.map((pt) => (
                <View key={pt} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ marginTop: 2 }}>
                    <WIcon name="check" size={15} color={w.sageInk} strokeWidth={2.4} />
                  </View>
                  <WText size={14} lh={1.45} tone="body" style={{ flex: 1 }}>
                    {pt}
                  </WText>
                </View>
              ))}
            </View>
          </NcCard>
        );
      })}
    </View>
  );
}
