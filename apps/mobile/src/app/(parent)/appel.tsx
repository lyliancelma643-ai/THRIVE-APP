import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Redirect } from 'expo-router';
import { RADIUS, SPACING, ThemedText, useTheme } from '../../design';
import { Card } from '../../components/offres/Card';
import { Frame } from '../../components/offres/Frame';
import { Primary } from '../../components/offres/Primary';
import { Segmented } from '../../components/offres/Segmented';
import { OFFRES_PROGRAMMES_IN_APP } from '../../lib/offresFlags';
import { requestIntroCall } from '../../services/introCall';

// Y3 — Appel de 15 minutes, sans engagement. Aucun paiement ici.
// [À COMPLÉTER : créneaux réels du coach (agenda non fourni)] — la liste reste vide,
// avec un message neutre, tant que la fonction serveur `request-intro-call` (O4) ne les fournit pas.
type Slot = { iso: string; dayLabel: string; timeLabel: string };
const AVAILABLE_SLOTS: Slot[] = [];

const MODES = [
  { key: 'video', label: 'Vidéo' },
  { key: 'telephone', label: 'Téléphone' },
] as const;

export default function AppelScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<'video' | 'telephone'>('video');
  const [slot, setSlot] = useState<Slot | null>(null);
  const [calendar, setCalendar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!OFFRES_PROGRAMMES_IN_APP) return <Redirect href="/(parent)/offres" />;

  const book = async () => {
    if (!slot) return;
    setBusy(true);
    try {
      const r = await requestIntroCall({ mode, slot: slot.iso, addToCalendar: calendar });
      setNotice(
        r.status === 'requested'
          ? 'Demande envoyée. Tu recevras une confirmation.'
          : r.status === 'not_implemented'
            ? 'La réservation dans l’app arrive bientôt : écris à ton coach par la messagerie.'
            : r.message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame
      title="Rencontrer un coach"
      subtitle="15 minutes, sans engagement. On parle de ton enfant et du programme qui lui convient."
      footer={
        <View style={{ gap: SPACING.space1 }}>
          <Primary
            label={slot ? `Réserver ${slot.dayLabel} · ${slot.timeLabel}` : 'Choisis un créneau'}
            onPress={book}
            disabled={!slot}
            busy={busy}
          />
          {notice ? (
            <ThemedText variant="footnote" color="label2" accessibilityLiveRegion="polite" style={{ textAlign: 'center', padding: SPACING.space2 }}>
              {notice}
            </ThemedText>
          ) : null}
        </View>
      }
    >
      <Segmented label="Type d’appel" options={MODES} value={mode} onChange={setMode} />

      <ThemedText variant="title3" accessibilityRole="header">Créneaux</ThemedText>
      {AVAILABLE_SLOTS.length === 0 ? (
        <Card>
          <ThemedText variant="subheadline" color="label2">
            Les créneaux s’affichent ici dès qu’ils sont ouverts. En attendant, écris à ton coach par la messagerie.
          </ThemedText>
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.space2 }}>
          {AVAILABLE_SLOTS.map((s) => {
            const on = slot?.iso === s.iso;
            return (
              <Pressable
                key={s.iso}
                onPress={() => setSlot(s)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${s.dayLabel}, ${s.timeLabel}`}
                style={{
                  minWidth: '30%',
                  minHeight: SPACING.touchMin,
                  borderRadius: RADIUS.chip + 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? colors.tint : colors.bgGrouped2,
                }}
              >
                <ThemedText variant="body" style={{ color: on ? colors.tintInk : colors.label }}>{s.timeLabel}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.space3 }}>
        <ThemedText variant="body" style={{ flex: 1 }}>Ajouter au calendrier</ThemedText>
        <Switch value={calendar} onValueChange={setCalendar} accessibilityLabel="Ajouter au calendrier" />
      </Card>

      <ThemedText variant="footnote" color="label2">
        {'Rien n’est payé avant l’appel. Ensuite, le 1er versement se règle par Stripe, dans l’app ou par le lien reçu par courriel.'}
      </ThemedText>
    </Frame>
  );
}
