import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { AppelView, type CallMode } from '../../components/offres/AppelView';
import { bookLabel, groupSlotsByDay, type SlotInput } from '../../components/offres/slots';
import { OFFRES_PROGRAMMES_IN_APP } from '../../lib/offresFlags';
import { requestIntroCall } from '../../services/introCall';

// Y3 — Appel de 15 minutes, sans engagement. Aucun paiement ici.
// [À COMPLÉTER : créneaux réels du coach (agenda non fourni)] — la liste reste vide,
// avec un message neutre, tant que la fonction serveur `request-intro-call` (O4) ne les fournit pas.
const AVAILABLE_SLOTS: SlotInput[] = [];

export default function AppelScreen() {
  const [mode, setMode] = useState<CallMode>('video');
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [calendar, setCalendar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!OFFRES_PROGRAMMES_IN_APP) return <Redirect href="/(parent)/offres" />;

  const days = groupSlotsByDay(AVAILABLE_SLOTS);
  const day = days.find((d) => d.key === (dayKey ?? days[0]?.key)) ?? null;
  const slot = day?.slots.find((s) => s.iso === slotIso) ?? null;

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
    <AppelView
      mode={mode}
      onModeChange={setMode}
      days={days}
      selectedDayKey={day?.key ?? null}
      onSelectDay={(k) => {
        setDayKey(k);
        setSlotIso(null);
      }}
      selectedSlot={slot?.iso ?? null}
      onSelectSlot={setSlotIso}
      calendar={calendar}
      onCalendarChange={setCalendar}
      bookLabel={bookLabel(day, slot)}
      canBook={!!slot}
      busy={busy}
      notice={notice}
      onBook={book}
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/(parent)/offres'))}
    />
  );
}
