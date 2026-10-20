import React, { useRef } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import {
  Chip, Chips, GlassButton, Icon, LargeTitle, List, ListRow, NavBar, Section, SectionHeader, Segmented, ThemedText,
  VignetteImage, Velvet, useLargeTitle, useNavBarHeight, useTheme, CANVAS,
} from '../../design';
import { ReadOnlyNotice } from '../access/LockedSection';
import { Ring } from './Ring';
import { PHASE_TITLE, TOTAL_SESSIONS, phaseOfSession, type SessionState } from './bilanData';

// S — Mes séances : carte velours (anneau soleil x/13), séances par phase avec leur vignette (validée / prochaine / à venir).
// Vue PRÉSENTATIONNELLE. Aucun état d'échec : une séance manquée se « replanifie ».

export type SeanceItem = {
  id: string;
  number: number;
  title: string;
  state: SessionState;
  /** « Validée par le coach · 3 sept. », « Jeudi 15 oct. · 17 h 30 », « À venir »… */
  subtitle: string;
  /** Un bilan du coach est disponible (ouvre T). */
  hasReport: boolean;
};

export type SeancesModel = {
  done: number;
  /** « Prochaine : jeudi avec Coach Lylian » (absent s'il n'y a rien à dire). */
  nextLine: string | null;
  items: SeanceItem[];
  readonly: boolean;
  childName: string;
  childOptions: { id: string; label: string }[];
  activeChildId: string | null;
};

export type SeancesActions = {
  onOpenReport: (item: SeanceItem) => void;
  onSelectChild: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Segment « Vidéo · bientôt » : mène à l'écran O. Absent : le segment reste sans effet. */
  onOpenVideo?: () => void;
};

function Thumb({ item }: { item: SeanceItem }) {
  const { colors } = useTheme();
  const upcoming = item.state === 'upcoming';
  return (
    <View style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.fill3 }}>
      <VignetteImage
        id={`ACT-${String(item.number).padStart(2, '0')}01`}
        style={{ width: 48, height: 48, ...(upcoming ? { opacity: 0.55 } : null) }}
      />
      {upcoming ? <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bgGrouped2, opacity: 0.35 }} /> : null}
      {item.state === 'done' ? (
        <View
          style={{
            position: 'absolute', right: 4, bottom: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sysGreen,
            alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bgGrouped2, boxSizing: 'content-box',
          } as never}
        >
          <Icon name="check" size={13} color={CANVAS.white} strokeWidth={2.6} />
        </View>
      ) : null}
    </View>
  );
}

export function SeancesView({ m, a }: { m: SeancesModel; a: SeancesActions }) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const lt = useLargeTitle(34);
  const scrollRef = useRef<ScrollView>(null);
  const nextRef = useRef<View>(null);
  const goNext = () => {
    const node = scrollRef.current as unknown as Parameters<View['measureLayout']>[0] | null;
    if (!nextRef.current || !node) return;
    nextRef.current.measureLayout(node, (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - navH - 12), animated: true }), () => {});
  };
  const multiple = m.childOptions.length > 1;
  const phases = (['ANCRER', 'DEVELOPPER', 'INTEGRER'] as const)
    .map((p) => ({ phase: p, items: m.items.filter((i) => phaseOfSession(i.number) === p) }))
    .filter((g) => g.items.length > 0);
  const title = 'Séances';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID="seances-ouvert">
      <ScrollView
        ref={scrollRef}
        onScroll={lt.onScroll}
        scrollEventThrottle={lt.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: 32 }}
        refreshControl={a.onRefresh ? <RefreshControl refreshing={!!a.refreshing} onRefresh={a.onRefresh} tintColor={colors.label2} /> : undefined}
      >
        <LargeTitle>{title}</LargeTitle>
        <View style={{ height: 12 }} />
        {m.readonly ? <Section><ReadOnlyNotice /></Section> : null}
        <Section style={{ marginBottom: 6 }}>
          <Segmented
            options={[{ key: 'coach', label: 'Avec le coach' }, { key: 'video', label: 'Vidéo · bientôt' }]}
            value="coach"
            onChange={(k) => { if (k === 'video') a.onOpenVideo?.(); }}
            accessibilityLabel="Type de séances"
          />
        </Section>
        {multiple ? (
          <Chips scroll style={{ marginTop: 8 }}>
            {m.childOptions.map((c) => (
              <Chip key={c.id} label={c.label} on={c.id === m.activeChildId} onPress={() => a.onSelectChild(c.id)} />
            ))}
          </Chips>
        ) : null}

        <Section style={{ marginTop: 8 }}>
          <Velvet padding={16} testID="seances-velours">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {/* Anneau soleil : le seul geste jaune de l'écran (piste et arc viennent de la matière velours). */}
              <Ring size={64} stroke={8} value={m.done / TOTAL_SESSIONS} accessibilityLabel={`${m.done} séances sur ${TOTAL_SESSIONS}`}>
                <ThemedText variant="title2" weight={500}>{m.done}</ThemedText>
              </Ring>
              <View style={{ flex: 1 }}>
                <ThemedText variant="title3" weight={500}>{m.done} séance{m.done > 1 ? 's' : ''} sur {TOTAL_SESSIONS}</ThemedText>
                {m.nextLine ? <ThemedText variant="sub" color="label2">{m.nextLine}</ThemedText> : null}
              </View>
            </View>
          </Velvet>
        </Section>

        {m.items.length === 0 ? (
          <ThemedText variant="sub" color="label2" style={{ paddingHorizontal: 32, paddingTop: 22 }}>
            Les séances de {m.childName} apparaîtront ici dès qu’elles seront planifiées par le coach.
          </ThemedText>
        ) : null}

        {phases.map((g) => (
          <View key={g.phase}>
            <SectionHeader small title={PHASE_TITLE[g.phase]} />
            <Section>
              <List>
                {g.items.map((it, idx) => (
                  <View
                    key={it.id}
                    ref={it.state === 'next' ? nextRef : undefined}
                    style={{ opacity: it.state === 'upcoming' ? 0.7 : 1 }}
                  >
                    <ListRow
                      last={idx === g.items.length - 1}
                      leading={<Thumb item={it} />}
                      leadingInset={76}
                      title={`${it.number}. ${it.title}`}
                      subtitle={it.subtitle}
                      chevron={it.hasReport || it.state === 'next'}
                      accessory={it.state === 'upcoming' ? <Icon name="lock" size={16} color={colors.label3} /> : undefined}
                      onPress={it.hasReport ? () => a.onOpenReport(it) : undefined}
                      accessibilityLabel={`Séance ${it.number}, ${it.title}. ${it.subtitle}${it.hasReport ? '. Voir le bilan du coach' : ''}`}
                    />
                  </View>
                ))}
              </List>
            </Section>
          </View>
        ))}
      </ScrollView>
      <NavBar
        title={title}
        titleVisible={lt.titleVisible}
        edge={lt.edge}
        right={<GlassButton glyph="calendar" accessibilityLabel="Aller à la prochaine séance" onPress={goNext} />}
      />
    </View>
  );
}
