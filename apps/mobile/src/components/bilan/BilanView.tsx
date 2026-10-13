import React, { useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import {
  BRAND_LOGO, Card, GlassGroup, GlassPair, Grid2, Icon, Kicker, List, ListRow, MenuPopover, NavBar, Section, SectionHeader,
  Tag, ThemedText, useLargeTitle, useNavBarHeight, useTheme, withAlpha,
} from '../../design';
import { ReadOnlyNotice } from '../access/LockedSection';
import { Sparkline } from './Charts';
import { ChildPill, JerseyDisc, ParentAvatar, useKidColor } from './Chrome';
import { Ring } from './Ring';
import { TOTAL_SESSIONS, fmtDecimal, stepsSummary, type AccentKey, type StepStatus } from './bilanData';

// G — Bilan : le passeport. Natif : grand titre au prénom + carte d'identité ; Nuit calme : même contenu sous un grand
// titre « Bilan » et le sélecteur d'enfant en verre ; Carnet : le passeport devient un objet (carte couleur, numéro géant).
// Vue PRÉSENTATIONNELLE : tout vient des props (la route les lit dans access_state(), les RPC et les tables RLS).

export type BilanModel = {
  firstName: string;
  displayName: string;
  fullName: string;
  initial: string;
  jersey: number | null;
  photoUri: string | null;
  accent: AccentKey | null;
  sportLine: string;
  club: string | null;
  coachFirst: string | null;
  strength: string | null;
  done: number;
  gaugeGlobal: number | null;
  delta: number | null;
  /** Bien-être par séance, sur 5. */
  wellbeing: number[];
  smart: string | null;
  toolbox: string[];
  steps: { status: StepStatus }[];
  docs: string[];
  quote: { text: string; tag: string } | null;
  focusWord: string | null;
  pendingQuestionnaire: boolean;
  readonly: boolean;
  childOptions: { id: string; label: string }[];
  activeChildId: string | null;
  parentInitial: string;
};

export type BilanActions = {
  onSkills: () => void;
  onPersonalize: () => void;
  onBell: () => void;
  onSelectChild: (id: string) => void;
  onQuestionnaire: () => void;
  onRow: (kind: 'smart' | 'toolbox' | 'steps' | 'docs') => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

const joinList = (xs: string[]) => xs.slice(0, 3).join(', ');

function Segments({ done }: { done: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }} accessible accessibilityRole="progressbar" accessibilityLabel={`${done} séances sur ${TOTAL_SESSIONS}`}>
      {Array.from({ length: TOTAL_SESSIONS }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < done ? colors.tint : i === done ? colors.accent : colors.fill }} />
      ))}
    </View>
  );
}

function IdentityCard({ m }: { m: BilanModel }) {
  const { colors } = useTheme();
  const kid = useKidColor(m.accent);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <JerseyDisc size={60} bg={kid.bg} ink={kid.ink} label={m.jersey != null ? String(m.jersey) : m.initial} photoUri={m.photoUri} accessibilityLabel={`Passeport de ${m.firstName}`} />
        <View style={{ flex: 1 }}>
          <ThemedText variant="headline">{m.fullName}</ThemedText>
          {m.sportLine ? <ThemedText variant="sub" color="label2">{m.sportLine}</ThemedText> : null}
          {m.club ? <ThemedText variant="sub" color="label2">{m.club}</ThemedText> : null}
        </View>
      </View>
      <View style={{ height: 0.5, backgroundColor: colors.separator, marginVertical: 14 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <ThemedText variant="sub">Parcours</ThemedText>
        <ThemedText variant="sub" color="label2">{m.done} sur {TOTAL_SESSIONS} séances</ThemedText>
      </View>
      <Segments done={m.done} />
    </Card>
  );
}

function PassportObject({ m }: { m: BilanModel }) {
  const kid = useKidColor(m.accent);
  const ink = (a: number) => withAlpha(kid.ink, a);
  const nick = m.fullName.includes('«') ? m.fullName.match(/«[^»]*»/)?.[0] ?? null : null;
  const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const [sport, pos] = m.sportLine.split(' · ');
  const sub = [nick, [sport, pos ? lower(pos) : null].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  return (
    <View style={{ borderRadius: 30, backgroundColor: kid.bg, padding: 20, minHeight: 250, overflow: 'hidden' }}>
      {m.jersey != null ? (
        <ThemedText
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ position: 'absolute', right: -8, bottom: -40, fontSize: 210, lineHeight: 210, fontWeight: '800', letterSpacing: -10, color: ink(0.16) }}
        >
          {String(m.jersey)}
        </ThemedText>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <ThemedText variant="cap" weight={600} style={{ color: kid.ink, opacity: 0.9, letterSpacing: 1.2, textTransform: 'uppercase' }}>Passeport d’athlète</ThemedText>
        <Image source={BRAND_LOGO} style={{ width: 28, height: 28, borderRadius: 7 }} accessibilityIgnoresInvertColors />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }}>
        <JerseyDisc size={64} bg={ink(0.25)} ink={kid.ink} label={m.initial} photoUri={m.photoUri} accessibilityLabel={`Passeport de ${m.firstName}`} />
        <View style={{ flex: 1 }}>
          <ThemedText variant="displayLarge" style={{ color: kid.ink, fontSize: 32, lineHeight: 34 }}>{m.displayName}</ThemedText>
          {sub ? <ThemedText variant="callout" weight={500} style={{ color: kid.ink, opacity: 0.92, fontSize: 15, lineHeight: 20 }}>{sub}</ThemedText> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 22 }}>
        {([['Club', m.club], ['Coach', m.coachFirst], ['Force n° 1', m.strength]] as const).filter(([, v]) => !!v).map(([k, v]) => (
          <View key={k} style={k === 'Club' ? { flexShrink: 1 } : { flexShrink: 0 }}>
            <ThemedText variant="foot" weight={500} style={{ color: kid.ink, opacity: 0.8 }}>{k}</ThemedText>
            <ThemedText variant="body" weight={700} style={{ color: kid.ink, fontSize: 15, lineHeight: 20 }}>{v}</ThemedText>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: ink(0.3) }}>
          <View style={{ width: `${(Math.min(m.done, TOTAL_SESSIONS) / TOTAL_SESSIONS) * 100}%`, height: '100%', borderRadius: 3, backgroundColor: kid.ink }} />
        </View>
        <ThemedText variant="sub" weight={700} style={{ color: kid.ink }}>{m.done}/{TOTAL_SESSIONS}</ThemedText>
      </View>
    </View>
  );
}

function GaugeCards({ m }: { m: BilanModel }) {
  const { colors } = useTheme();
  const last = m.wellbeing.length ? m.wellbeing[m.wellbeing.length - 1] : null;
  return (
    <Grid2>
      <Card>
        <Kicker glyph="sparkles">Compétences de vie</Kicker>
        {m.gaugeGlobal != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <Ring size={78} stroke={9} value={m.gaugeGlobal / 100} accessibilityLabel={`Compétences de vie : ${m.gaugeGlobal} sur 100`}>
              <ThemedText variant="title3">{m.gaugeGlobal}</ThemedText>
            </Ring>
            {m.delta != null ? (
              <View style={{ flexShrink: 1 }}>
                <ThemedText variant="headline" style={{ color: m.delta >= 0 ? colors.ok : colors.label2 }}>{m.delta > 0 ? `+${m.delta}` : m.delta}</ThemedText>
                <ThemedText variant="foot" color="label2">depuis le départ</ThemedText>
              </View>
            ) : null}
          </View>
        ) : (
          <ThemedText variant="foot" color="label2" style={{ marginTop: 8 }}>Le repère apparaîtra après le premier questionnaire.</ThemedText>
        )}
      </Card>
      <Card>
        <Kicker glyph="pulse">Bien-être</Kicker>
        {last != null ? (
          <>
            <ThemedText variant="title2" style={{ marginTop: 6 }}>
              {fmtDecimal(last)}
              <ThemedText variant="foot" color="label2">{' /5'}</ThemedText>
            </ThemedText>
            <View style={{ marginTop: 4 }}><Sparkline values={m.wellbeing} /></View>
          </>
        ) : (
          <ThemedText variant="foot" color="label2" style={{ marginTop: 8 }}>Une mesure par séance, remplie avec votre enfant.</ThemedText>
        )}
      </Card>
    </Grid2>
  );
}

function CoachRows({ m, a }: { m: BilanModel; a: BilanActions }) {
  const none = 'Votre coach le complétera.';
  return (
    <List>
      <ListRow glyph="target" iconColor="sysOrange" title="Objectif SMART" subtitle={m.smart ?? none} onPress={() => a.onRow('smart')} />
      <ListRow glyph="toolbox" iconColor="sysTeal" title="Boîte à outils" subtitle={m.toolbox.length ? joinList(m.toolbox) : none} value={m.toolbox.length ? String(m.toolbox.length) : undefined} onPress={() => a.onRow('toolbox')} />
      <ListRow glyph="check" iconColor="sysGreen" title="Prochaines étapes" subtitle={m.steps.length ? stepsSummary(m.steps) : none} onPress={() => a.onRow('steps')} />
      <ListRow glyph="document" iconColor="sysIndigo" title="Documents" subtitle={m.docs.length ? joinList(m.docs) : none} value={m.docs.length ? String(m.docs.length) : undefined} onPress={() => a.onRow('docs')} />
    </List>
  );
}

export function BilanView({ m, a }: { m: BilanModel; a: BilanActions }) {
  const { colors, style } = useTheme();
  const navH = useNavBarHeight();
  const lt = useLargeTitle(34);
  const [menu, setMenu] = useState(false);
  const multiple = m.childOptions.length > 1;
  const natif = style === 'natif';
  const carnet = style === 'carnet';
  const subtitle = m.done >= TOTAL_SESSIONS ? 'Passeport d’athlète · Parcours terminé' : `Passeport d’athlète · Séance ${m.done + 1} sur ${TOTAL_SESSIONS}`;
  const pair = (
    <GlassPair
      items={[
        { glyph: 'pencil', accessibilityLabel: 'Personnaliser le passeport', onPress: a.onPersonalize },
        { glyph: 'bell', accessibilityLabel: 'Notifications', onPress: a.onBell },
      ]}
    />
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID="bilan-ouvert">
      <ScrollView
        onScroll={lt.onScroll}
        scrollEventThrottle={lt.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: 32 }}
        refreshControl={a.onRefresh ? <RefreshControl refreshing={!!a.refreshing} onRefresh={a.onRefresh} tintColor={colors.label2} /> : undefined}
      >
        {natif ? (
          <>
            <Pressable
              disabled={!multiple}
              onPress={() => setMenu(true)}
              accessibilityRole={multiple ? 'button' : 'header'}
              accessibilityLabel={multiple ? `${m.displayName}. Changer d’enfant` : m.displayName}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4, paddingHorizontal: 16 }}
            >
              <ThemedText variant="largetitle">{m.displayName}</ThemedText>
              {multiple ? <View style={{ marginTop: 6 }}><Icon name="chevronDown" size={20} color={colors.label3} strokeWidth={2.6} /></View> : null}
            </Pressable>
            <ThemedText variant="sub" color="label2" style={{ paddingTop: 2, paddingHorizontal: 16 }}>{subtitle}</ThemedText>
          </>
        ) : null}
        {style === 'nuit' ? (
          <ThemedText variant="largetitle" accessibilityRole="header" style={{ paddingTop: 4, paddingHorizontal: 16 }}>Bilan</ThemedText>
        ) : null}

        {m.readonly ? <Section style={{ marginTop: 12 }}><ReadOnlyNotice /></Section> : null}

        <Section style={{ marginTop: carnet ? 0 : 14 }}>
          {carnet ? <PassportObject m={m} /> : <IdentityCard m={m} />}
        </Section>

        {m.pendingQuestionnaire ? (
          <Section style={{ marginTop: 12 }}>
            <List>
              <ListRow
                glyph="pulse" iconColor="sysOrange" title={`Questionnaire à remplir avec ${m.firstName}`}
                subtitle="Quelques minutes, sur votre téléphone. Ses réponses sont partagées avec son coach."
                onPress={a.onQuestionnaire}
              />
            </List>
          </Section>
        ) : null}

        {carnet ? <SectionHeader title="Ce qui grandit" action={{ label: 'Tout voir', onPress: a.onSkills }} /> : null}
        <Section style={{ marginTop: carnet ? 0 : 12 }}>
          <Pressable onPress={a.onSkills} accessibilityRole="button" accessibilityLabel="Voir les compétences de vie">
            <GaugeCards m={m} />
          </Pressable>
        </Section>

        {carnet && m.quote ? (
          <Section style={{ marginTop: 12 }}>
            <Card>
              <Kicker glyph="target">Objectif de saison</Kicker>
              <ThemedText variant="displayQuote" style={{ marginTop: 8 }}>{`« ${m.quote.text} »`}</ThemedText>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Tag label={m.quote.tag} />
                {m.focusWord ? <Tag tone="gray" label={`Mot-focus : ${m.focusWord}`} /> : null}
              </View>
            </Card>
          </Section>
        ) : null}

        <Section style={{ marginTop: 12 }}>
          <CoachRows m={m} a={a} />
        </Section>
      </ScrollView>

      {natif ? (
        <NavBar
          title={m.displayName}
          titleVisible={lt.titleVisible}
          edge={lt.edge}
          right={<GlassGroup>{pair}<ParentAvatar initial={m.parentInitial} /></GlassGroup>}
        />
      ) : (
        <NavBar
          title={carnet ? 'Bilan' : undefined}
          edge={carnet || lt.edge}
          left={<ChildPill name={m.displayName} initial={m.initial} accent={m.accent} photoUri={m.photoUri} multiple={multiple} onPress={() => setMenu(true)} />}
          right={pair}
        />
      )}

      <MenuPopover
        visible={menu}
        onClose={() => setMenu(false)}
        top={navH}
        left={16}
        items={m.childOptions.map((c) => ({ key: c.id, label: c.label, checked: c.id === m.activeChildId, onPress: () => a.onSelectChild(c.id) }))}
      />
    </View>
  );
}
