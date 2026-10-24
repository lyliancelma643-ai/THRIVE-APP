import { Linking, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { AccentButton, FadeUp, GhostButton, NcCard, WIcon, WText, useWeb } from '../../design/web';
import { COACH_CALL_URL, PROGRAM_VIDEO_URL } from '../../services/access';
import { useUpgrade } from './UpgradeSheet';

// Onglet Bilan / Mes séances verrouillé — portage de components/parent/LockedSection.tsx du web : un SQUELETTE FACTICE
// flouté (aucune donnée réelle n'est chargée), puis la carte « … s'ouvre avec un pack ». Parcours coachés = services entre personnes (Apple 3.1.3(d)) :
// « Choisir un forfait » = panneau UpgradeSheet (équipe THRIVE, site, courriel) ; « Rencontrer un coach » = page de rendez-vous configurée,
// sinon la messagerie de l'app. La vidéo n'apparaît que si une page vidéo est configurée.

const COPY = {
  bilan: {
    title: 'Le Bilan de ton enfant',
    body: 'Le suivi avant / après du programme, avec ton coach. Il s’ouvre avec un pack THRIVE.',
  },
  seances: {
    title: 'Mes séances',
    body: 'Les séances avec un coach, en groupe ou en individuel. Elles s’ouvrent avec un pack THRIVE.',
  },
} as const;

function Fake({ section }: { section: 'bilan' | 'seances' }) {
  const w = useWeb();
  const card = (h: number, extra?: object) => <View style={[{ height: h, borderRadius: 22, backgroundColor: w.surface }, extra]} />;
  return section === 'bilan' ? (
    <View style={{ gap: 16 }}>
      {card(160)}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {card(112, { flex: 1 })}
        {card(112, { flex: 1 })}
      </View>
      {card(96)}
      {card(96)}
    </View>
  ) : (
    <View style={{ gap: 12 }}>
      {card(128)}
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ height: 64, borderRadius: 22, backgroundColor: w.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: w.surfaceSub }} />
          <View style={{ height: 12, width: '50%', borderRadius: 6, backgroundColor: w.surfaceSub }} />
        </View>
      ))}
    </View>
  );
}

export function HubLocked({ section }: { section: 'bilan' | 'seances' }) {
  const w = useWeb();
  const router = useRouter();
  const { openUpgrade } = useUpgrade();
  const copy = COPY[section];
  return (
    <View style={{ minHeight: 520 }} accessibilityLabel={copy.title}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ opacity: 0.6 }}>
        <Fake section={section} />
        <BlurView intensity={18} tint={w.isNight ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </View>
      <View style={{ position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center' }}>
        <FadeUp style={{ width: '100%', maxWidth: 448 }}>
          <NcCard style={{ alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(249,235,80,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <WIcon name="lock" size={20} color={w.accentInk} />
            </View>
            <WText display size={24} weight={600} tone="ink" center style={{ marginTop: 16 }} accessibilityRole="header">
              {copy.title}
            </WText>
            <WText size={15} lh={1.55} tone="soft" center style={{ marginTop: 8 }}>
              {copy.body}
            </WText>
            <View style={{ marginTop: 24, gap: 10, width: '100%' }}>
              <AccentButton label="Choisir un forfait" icon="sparkle" height={52} onPress={openUpgrade} />
              {PROGRAM_VIDEO_URL ? (
                <GhostButton label="Découvrir le programme" icon="video" height={48} fontSize={15} onPress={() => Linking.openURL(PROGRAM_VIDEO_URL!)} />
              ) : null}
              <GhostButton
                label="Rencontrer un coach"
                icon="mail"
                height={48}
                fontSize={15}
                onPress={() => (COACH_CALL_URL ? Linking.openURL(COACH_CALL_URL) : router.push('/(parent)/messages'))}
              />
            </View>
            <WText size={13} tone="faint" center style={{ marginTop: 12 }}>
              {PROGRAM_VIDEO_URL ? 'Vidéo de 5 minutes · appel de 15 minutes, sans engagement.' : 'Un premier échange de 15 minutes, sans engagement.'}
            </WText>
          </NcCard>
        </FadeUp>
      </View>
    </View>
  );
}

/** Pack terminé : l'historique reste consultable, rien de nouveau ne s'y ajoute. */
export function ReadOnlyBanner({ endedOn }: { endedOn: string | null }) {
  const w = useWeb();
  const router = useRouter();
  const date = endedOn ? new Date(`${endedOn}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  return (
    <NcCard ring="rgba(249,235,80,0.22)" style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(249,235,80,0.1)', alignItems: 'center', justifyContent: 'center' }}>
        <WIcon name="lock" size={20} color={w.accentInk} />
      </View>
      <WText size={15} lh={1.55} tone="body" style={{ flex: 1 }} accessibilityRole="text">
        {`Ton programme ${date ? `s’est terminé le ${date}` : 'est terminé'}. Tu peux toujours consulter tout l’historique ; rien de nouveau ne s’y ajoute. `}
        <WText
          size={15}
          weight={600}
          tone="accent"
          style={{ textDecorationLine: 'underline' }}
          onPress={() => (COACH_CALL_URL ? Linking.openURL(COACH_CALL_URL) : router.push('/(parent)/messages'))}
        >
          Repartir avec un coach
        </WText>
      </WText>
    </NcCard>
  );
}
