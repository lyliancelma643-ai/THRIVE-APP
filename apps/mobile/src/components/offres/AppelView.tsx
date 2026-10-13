import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  Button,
  Card,
  GlassButton,
  Icon,
  List,
  ListRow,
  MascotMedallion,
  Section,
  SectionFooter,
  SectionHeader,
  ThemedText,
  useTheme,
} from '../../design';
import { OffreScreen } from './parts';
import type { DayOption } from './slots';

export type CallMode = 'video' | 'telephone';

export type AppelViewProps = {
  mode: CallMode;
  onModeChange: (m: CallMode) => void;
  days: readonly DayOption[];
  selectedDayKey: string | null;
  onSelectDay: (key: string) => void;
  selectedSlot: string | null;
  onSelectSlot: (iso: string) => void;
  calendar: boolean;
  onCalendarChange: (v: boolean) => void;
  /** Libellé du bouton (« Réserver mardi 14 oct. · 18 h 30 » / « Choisis un créneau »). */
  bookLabel: string;
  canBook: boolean;
  busy?: boolean;
  notice?: string | null;
  onBook: () => void;
  onClose: () => void;
};

const MODES: readonly { key: CallMode; label: string; glyph?: 'video' }[] = [
  { key: 'video', label: 'Vidéo', glyph: 'video' },
  { key: 'telephone', label: 'Téléphone' },
];

/** `.seg` avec icône (Vidéo / Téléphone) : capsule 36 pt, segment actif `segOn` + ombre. */
function ModeSegmented({ value, onChange }: { value: CallMode; onChange: (m: CallMode) => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel="Type d’appel" style={{ flexDirection: 'row', height: 36, borderRadius: 18, padding: 2, backgroundColor: colors.fill3 }}>
      {MODES.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            style={[
              { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
              on ? { backgroundColor: colors.segOn, shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : null,
            ]}
          >
            {o.glyph ? <Icon name={o.glyph} size={16} color={colors.label} /> : null}
            <ThemedText variant="sub" weight={on ? 600 : 500} numberOfLines={1} style={{ fontSize: 14, lineHeight: 18, letterSpacing: -0.15 }}>{o.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function DayTile({ day, on, onPress }: { day: DayOption; on: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const ink = on ? colors.tintInk : colors.label;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={day.long}
      accessibilityState={{ selected: on }}
      style={{ width: 62, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: on ? colors.tint : colors.bgGrouped2 }}
    >
      <ThemedText variant="foot" style={{ color: ink, opacity: 0.75 }}>{day.weekday}</ThemedText>
      <ThemedText variant="title3" style={{ color: ink }}>{String(day.dayNum)}</ThemedText>
    </Pressable>
  );
}

function SlotGrid({ day, selected, onSelect }: { day: DayOption; selected: string | null; onSelect: (iso: string) => void }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? (width - 16) / 3 : undefined;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {day.slots.map((s) => {
        const on = selected === s.iso;
        return (
          <Pressable
            key={s.iso}
            onPress={() => onSelect(s.iso)}
            disabled={!s.available}
            accessibilityRole="radio"
            accessibilityLabel={`${day.long}, ${s.time}${s.available ? '' : ', indisponible'}`}
            accessibilityState={{ checked: on, disabled: !s.available }}
            style={{
              width: cell ?? '31%', height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? colors.tint : s.available ? colors.bgGrouped2 : colors.fill3, opacity: s.available ? 1 : 0.35,
            }}
          >
            <ThemedText
              variant="sub"
              weight={on ? 600 : 500}
              style={{ fontSize: 15, lineHeight: 20, color: on ? colors.tintInk : colors.label, textDecorationLine: s.available ? 'none' : 'line-through' }}
            >
              {s.time}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Y3 · Appel de 15 minutes. Aucun paiement ici. Jours et créneaux viennent du serveur (jamais écrits en dur) :
 * sans créneau ouvert, un message neutre remplace les jours et les heures.
 */
export function AppelView({
  mode, onModeChange, days, selectedDayKey, onSelectDay, selectedSlot, onSelectSlot, calendar, onCalendarChange,
  bookLabel, canBook, busy, notice, onBook, onClose,
}: AppelViewProps) {
  const day = days.find((d) => d.key === selectedDayKey) ?? null;
  const fewDays = days.length <= 5;
  return (
    <OffreScreen
      testID="offres-appel"
      left={<GlassButton glyph="close" accessibilityLabel="Fermer" onPress={onClose} />}
      footer={
        <View>
          <Button label={bookLabel} onPress={onBook} disabled={!canBook} loading={busy} />
          {notice ? (
            <ThemedText variant="cap" color="label2" accessibilityLiveRegion="polite" style={{ textAlign: 'center', paddingTop: 6, paddingBottom: 2, paddingHorizontal: 8 }}>
              {notice}
            </ThemedText>
          ) : null}
        </View>
      }
    >
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title1" accessibilityRole="header">Rencontrer un coach</ThemedText>
          <ThemedText variant="sub" color="label2" style={{ marginTop: 4 }}>
            15 minutes, sans engagement. On parle de ton enfant et du programme qui lui va.
          </ThemedText>
        </View>
        <MascotMedallion size={92} />
      </View>

      <Section style={{ marginTop: 16 }}>
        <ModeSegmented value={mode} onChange={onModeChange} />
      </Section>

      {days.length === 0 ? (
        <Section style={{ marginTop: 22 }}>
          <Card>
            <ThemedText variant="sub" color="label2">
              Les créneaux s’affichent ici dès qu’ils sont ouverts. En attendant, écris à ton coach par la messagerie.
            </ThemedText>
          </Card>
        </Section>
      ) : (
        <>
          <SectionHeader small title={(day ?? days[0]).month} />
          {fewDays ? (
            <Section style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {days.map((d) => <DayTile key={d.key} day={d} on={d.key === selectedDayKey} onPress={() => onSelectDay(d.key)} />)}
            </Section>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {days.map((d) => <DayTile key={d.key} day={d} on={d.key === selectedDayKey} onPress={() => onSelectDay(d.key)} />)}
            </ScrollView>
          )}
          {day ? (
            <>
              <SectionHeader small title={day.long} />
              <Section><SlotGrid day={day} selected={selectedSlot} onSelect={onSelectSlot} /></Section>
            </>
          ) : null}
        </>
      )}

      <Section style={{ marginTop: 16 }}>
        <List>
          <ListRow glyph="calendar" iconColor="sysRed" title="Ajouter au calendrier" toggle={{ value: calendar, onChange: onCalendarChange }} />
        </List>
        <SectionFooter>
          Rien n’est payé avant l’appel. Ensuite, tu règles le 1ᵉʳ versement par Stripe, dans l’app ou par le lien reçu par courriel, et le programme démarre 1 à 2 semaines plus tard.
        </SectionFooter>
      </Section>
    </OffreScreen>
  );
}
