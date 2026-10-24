import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabaseClient as supabase } from '@thrive/shared';
import { Sheet } from '../../design';
import { AccentButton, GhostButton, WIcon, WText, useWeb } from '../../design/web';
import { OFFRES_PROGRAMMES_IN_APP } from '../../lib/offresFlags';
import { useSelectedChild } from '../../stores/child.store';
import { useSubscriptionStore } from '../../stores/subscription.store';

/**
 * « Passer au forfait supérieur » : le panneau unique ouvert par TOUS les contenus floutés (Bilan, Mes séances, onglets
 * verrouillés). Comme sur le web (/parent/upgrade), le changement de forfait d'un parcours coaché se fait avec l'équipe
 * THRIVE, paiement compris — trois touchers au plus : le bouton du contenu flouté → « Demander … » → Envoyer (message
 * pré-rempli dans le fil Support, ouvert quel que soit le forfait). Autres voies : les forfaits sur le site, le courriel.
 * Apple : parcours coachés = services en temps réel entre personnes (3.1.3(d)), payables hors achat intégré.
 */

export const SUPPORT_EMAIL = 'support@thrivesportpositive.com';
const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_URL || 'https://app.thrivesportpositive.com';

type Ctx = { openUpgrade: () => void };
const UpgradeCtx = createContext<Ctx>({ openUpgrade: () => {} });

export function useUpgrade(): Ctx {
  return useContext(UpgradeCtx);
}

/** Forfait visé : Individuel ouvre l'essentiel du suivi, Complet tout ; un parent Individuel vise donc Complet. */
function targetFor(level: string | undefined): { label: string; opens: string } {
  if (level === 'AVANCE') {
    return { label: 'Complet', opens: 'Le forfait Complet ouvre le bilan détaillé et les observations du coach à chaque séance, et la lettre personnalisée du coach.' };
  }
  return {
    label: 'Individuel ou Complet',
    opens: 'Les forfaits Individuel et Complet ouvrent le détail par compétence, la courbe de bien-être, la roue des émotions et les bilans détaillés du coach.',
  };
}

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const w = useWeb();
  const child = useSelectedChild();
  const level = useSubscriptionStore((s) => s.access?.detailLevel);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const target = targetFor(level);
  const who = child?.first_name ? ` pour ${child.first_name}` : '';
  const request = `Bonjour, j’aimerais passer au forfait ${target.label}${who}. Pouvez-vous m’envoyer la marche à suivre et le paiement ?`;

  const openUpgrade = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  const close = () => setOpen(false);
  // Laisser la feuille se refermer avant d'ouvrir l'écran suivant.
  const after = (fn: () => void) => {
    close();
    setTimeout(fn, 320);
  };

  const askTeam = async () => {
    if (busy) return;
    setBusy(true);
    const { data } = await supabase.rpc('get_or_create_support_conversation').then(
      (r) => r,
      () => ({ data: null }),
    );
    setBusy(false);
    const id = (data as string | null) ?? null;
    if (id) {
      after(() => router.push({ pathname: '/(parent)/chat/[conversationId]', params: { conversationId: id, name: 'Support THRIVE', draft: request } }));
    } else {
      after(() => void mail());
    }
  };

  const mail = () =>
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Passer au forfait ${target.label}`)}&body=${encodeURIComponent(request)}`,
    ).catch(() => undefined);

  const site = () =>
    OFFRES_PROGRAMMES_IN_APP
      ? after(() => router.push('/(parent)/offres'))
      : after(() =>
          void WebBrowser.openBrowserAsync(`${WEB_ORIGIN}/parent/upgrade`, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            dismissButtonStyle: 'done',
            controlsColor: '#004E7A',
          }).catch(() => undefined),
        );

  return (
    <UpgradeCtx.Provider value={value}>
      {children}
      <Sheet visible={open} onClose={close} title="Tout débloquer">
        <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(249,235,80,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <WIcon name="sparkle" size={20} color={w.accentInk} />
            </View>
            <WText display size={21} weight={600} tone="ink" lh={26} style={{ flex: 1 }} accessibilityRole="header">
              {`Passer au forfait ${target.label}`}
            </WText>
          </View>
          <WText size={15} lh={1.55} tone="soft">
            {target.opens}
          </WText>
          <WText size={15} lh={1.55} tone="soft" style={{ marginTop: 8 }}>
            L’équipe THRIVE active ton nouveau forfait et t’envoie le paiement sécurisé.
          </WText>
          <View style={{ marginTop: 20, gap: 10 }}>
            <AccentButton label={busy ? 'Ouverture…' : level === 'AVANCE' ? 'Demander le forfait Complet' : 'Demander un forfait'} icon="message" height={52} onPress={askTeam} />
            <GhostButton label="Voir les forfaits" icon="eye" height={48} fontSize={15} onPress={site} />
            <GhostButton label="Écrire au support par courriel" icon="mail" height={48} fontSize={15} onPress={() => after(() => void mail())} />
          </View>
          <WText size={12} tone="faint" center style={{ marginTop: 12 }}>
            {SUPPORT_EMAIL}
          </WText>
        </View>
      </Sheet>
    </UpgradeCtx.Provider>
  );
}
