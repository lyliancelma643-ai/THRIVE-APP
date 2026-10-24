import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseClient as supabase } from '@thrive/shared';
import { Sheet } from '../../design';
import { AccentButton, GhostButton, WText } from '../../design/web';
import { useSelectedChild } from '../../stores/child.store';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { ProgramCards, openPricing } from './ProgramCards';

/**
 * « Passer au forfait supérieur » : le panneau unique ouvert par TOUS les contenus floutés (Bilan, Mes séances).
 * Il montre les trois programmes, puis renvoie vers la page Prix du site (prix, réservation, appel) — aucun paiement
 * dans l'app. Deux touchers : le bouton du contenu flouté → « Voir les prix et réserver ». Autres voies : un message
 * pré-rempli dans le fil Support (ouvert quel que soit le forfait), ou le courriel du support.
 * L'équipe THRIVE active ensuite le forfait depuis l'administration.
 */

export const SUPPORT_EMAIL = 'support@thrivesportpositive.com';

type Ctx = { openUpgrade: () => void };
const UpgradeCtx = createContext<Ctx>({ openUpgrade: () => {} });

export function useUpgrade(): Ctx {
  return useContext(UpgradeCtx);
}

/** Ouvre le fil Support avec un message pré-rempli (envoyé seulement si le parent touche Envoyer) ; sinon le courriel. */
export function useContactTeam() {
  const router = useRouter();
  const child = useSelectedChild();
  const level = useSubscriptionStore((s) => s.access?.detailLevel);
  const hasPack = useSubscriptionStore((s) => Boolean(s.access?.bilan || s.access?.seances));
  const target = hasPack && level === 'AVANCE' ? 'Complet' : hasPack && level === 'PERFORMANCE' ? null : 'Individuel ou Complet';
  const who = child?.first_name ? ` pour ${child.first_name}` : '';
  const request = target
    ? `Bonjour, j’aimerais passer au forfait ${target}${who}. Pouvez-vous me rappeler ?`
    : `Bonjour, j’ai une question sur mon forfait${who}.`;
  const subject = target ? `Forfait ${target}` : 'Mon forfait';

  const mail = useCallback(
    () =>
      Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(request)}`).then(
        () => undefined,
        () => undefined,
      ),
    [subject, request],
  );

  const message = useCallback(async () => {
    const { data } = await supabase.rpc('get_or_create_support_conversation').then(
      (r) => r,
      () => ({ data: null }),
    );
    const id = (data as string | null) ?? null;
    if (id) router.push({ pathname: '/(parent)/chat/[conversationId]', params: { conversationId: id, name: 'Support THRIVE', draft: request } });
    else await mail();
  }, [router, request, mail]);

  return { message, mail };
}

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { message, mail } = useContactTeam();

  const openUpgrade = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  const close = () => setOpen(false);
  // Laisser la feuille se refermer avant d'ouvrir l'écran suivant.
  const after = (fn: () => unknown) => {
    close();
    setTimeout(() => void fn(), 320);
  };

  return (
    <UpgradeCtx.Provider value={value}>
      {children}
      <Sheet visible={open} onClose={close} title="Nos programmes" detent="large">
        <View style={{ paddingHorizontal: 4, paddingBottom: 16 }}>
          <WText size={15} lh={1.55} tone="soft" style={{ marginBottom: 16 }}>
            Choisis le programme qui convient à ton enfant. Les prix et la réservation sont sur notre site ; l’équipe THRIVE active ensuite ton forfait.
          </WText>
          <ProgramCards />
          <View style={{ marginTop: 20, gap: 10 }}>
            <AccentButton label="Voir les prix et réserver" icon="arrow-right" height={52} onPress={() => after(openPricing)} />
            <GhostButton label="Écrire à l’équipe THRIVE" icon="message" height={48} fontSize={15} onPress={() => after(message)} />
            <GhostButton label="Écrire au support par courriel" icon="mail" height={48} fontSize={15} onPress={() => after(mail)} />
          </View>
        </View>
      </Sheet>
    </UpgradeCtx.Provider>
  );
}
