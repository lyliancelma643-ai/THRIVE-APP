import React, { useCallback, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabaseClient as supabase, useFamily, useChildren } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { OfflineState } from '../../components/OfflineState';
import { LockedSection, ReadOnlyNotice } from '../../components/access/LockedSection';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { sectionView } from '../../services/access';
import { ListGroup, ListRow, Pill, SPACING, ThemedText, useTheme } from '../../design';
import { Card, ChildChips, ScreenScaffold } from '../../components/bilan/ScreenScaffold';
import { ValueCurve, CurveCaption } from '../../components/bilan/PermaCurve';
import { LifeSkillsSheet, PersonalizeSheet, UnderstandSheet } from '../../components/bilan/BilanSheets';
import { fetchIdentity, fetchInsights, saveIdentity } from '../../components/bilan/bilanApi';
import { ACCENT_TOKEN, REPORT_SECTION_LABELS, asText, type Gauge, type Identity, type LsssPoint, type PermaPoint } from '../../components/bilan/bilanData';

// Bilans de l'enfant : progression dans les 13 séances, coach, questionnaires
// à remplir et bilans envoyés par le coach (table parent_reports, RLS famille).
// Accès : section Bilan de access_state() (migration 080) ; verrouillé →
// squelette factice flouté, AUCUNE requête de données.

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_URL || 'https://app.thrivesportpositive.com';
const TOTAL_SESSIONS = 13;

type Report = {
  id: string;
  created_at: string;
  parent_visible_body: { session_number?: number | null; sections?: Record<string, unknown> } | null;
};

type BilanState = {
  done: number;
  coach: string | null;
  pending: { kind: string; token: string }[];
  reports: Report[];
};

async function loadBilans(childId: string): Promise<BilanState> {
  const [sessions, assignment, pending, reports] = await Promise.all([
    supabase.from('sessions').select('status').eq('child_id', childId),
    supabase
      .from('coach_assignments')
      .select('profiles:coach_id (first_name, last_name)')
      .eq('child_id', childId)
      .eq('is_active', true)
      .limit(1),
    supabase
      .from('questionnaires')
      .select('kind, access_token')
      .eq('child_id', childId)
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .not('access_token', 'is', null),
    supabase
      .from('parent_reports')
      .select('id, created_at, parent_visible_body')
      .eq('child_id', childId)
      .order('created_at', { ascending: false }),
  ]);
  const done = (sessions.data ?? []).filter((s: { status: string }) => s.status === 'COMPLETED').length;
  const a = (assignment.data ?? [])[0] as { profiles?: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] } | undefined;
  const p = Array.isArray(a?.profiles) ? a?.profiles[0] : a?.profiles;
  return {
    done,
    coach: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : null,
    pending: ((pending.data ?? []) as { kind: string; access_token: string }[]).map((q) => ({
      kind: q.kind,
      token: q.access_token,
    })),
    reports: (reports.data ?? []) as Report[],
  };
}

export default function BilansScreen() {
  const { colors, radius } = useTheme();
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);
  const params = useLocalSearchParams<{ child?: string; focus?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(typeof params.child === 'string' ? params.child : null);
  const child = children.find((c) => c.id === selectedId) ?? children[0];
  const [data, setData] = useState<BilanState | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lsss, setLsss] = useState<LsssPoint[]>([]);
  const [perma, setPerma] = useState<PermaPoint[]>([]);
  const [gauge, setGauge] = useState<Gauge | null>(null);
  const [identity, setIdentity] = useState<Identity>({ nickname: null, jersey_number: null, accent_color: null });
  const [sheet, setSheet] = useState<'skills' | 'understand' | 'perso' | null>(null);
  const [saving, setSaving] = useState(false);

  const access = useSubscriptionStore((st) => st.access);
  const view = access ? sectionView(access, 'bilan') : null;

  const reload = useCallback(async () => {
    if (!child?.id || !view || view === 'locked') return;
    setLoading(true);
    setLoadError(false);
    try {
      setData(await loadBilans(child.id));
      const [ins, idt] = await Promise.all([fetchInsights(child.id), fetchIdentity(child.id)]);
      setLsss(ins.lsss);
      setPerma(ins.perma);
      setGauge(ins.gauge);
      setIdentity(idt);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [child?.id, view]);

  // Arrivée depuis une notification (?child=…&focus=competences) : ouvre la carte visée.
  useEffect(() => {
    if (typeof params.child === 'string') setSelectedId(params.child);
    if (params.focus === 'competences') setSheet('skills');
  }, [params.child, params.focus]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (childrenLoading || !view) return <ActivityIndicator style={{ marginTop: 96 }} />;
  if (view === 'locked') return <LockedSection section="bilan" />;
  if (loadError && !data) return <OfflineState onRetry={reload} />;

  const accentBg = identity.accent_color ? colors[ACCENT_TOKEN[identity.accent_color]] : colors.tint;
  const displayName = identity.nickname || child?.first_name || '';

  const onSave = async (v: Identity) => {
    if (!child) return;
    setSaving(true);
    const ok = await saveIdentity(child.id, v);
    setSaving(false);
    if (ok) {
      setIdentity(v);
      setSheet(null);
    }
  };

  return (
    <ScreenScaffold
      title={child ? `Bilan de ${displayName}` : 'Bilan'}
      refreshing={loading}
      onRefresh={reload}
      header={<ChildChips items={children.map((c) => ({ id: c.id, label: c.first_name }))} activeId={child?.id} onSelect={setSelectedId} />}
    >
      {view === 'readonly' && <ReadOnlyNotice />}
      {!child ? (
        <ThemedText variant="subheadline" color="label2">Ajoutez votre enfant pour suivre ses bilans.</ThemedText>
      ) : !data ? (
        <ActivityIndicator />
      ) : (
        <>
          {/* G — passeport */}
          <View style={{ backgroundColor: accentBg, borderRadius: radius.card, padding: SPACING.space4, marginBottom: SPACING.space3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="footnote" style={{ color: colors.tintInk }}>Programme THRIVE</ThemedText>
                <ThemedText variant="title1" style={{ color: colors.tintInk }}>{displayName}</ThemedText>
                {data.coach ? <ThemedText variant="footnote" style={{ color: colors.tintInk, marginTop: 2 }}>Coach : {data.coach}</ThemedText> : null}
              </View>
              {identity.jersey_number != null ? (
                <ThemedText variant="numeralHero" style={{ color: colors.tintInk }}>{identity.jersey_number}</ThemedText>
              ) : null}
            </View>
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.space3 }}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`${data.done} séances réalisées sur ${TOTAL_SESSIONS}`}
            >
              {Array.from({ length: TOTAL_SESSIONS }, (_, i) => (
                <View
                  key={i}
                  style={{
                    width: 16, height: 16, borderRadius: 8, marginRight: 6, marginBottom: 6,
                    backgroundColor: i < data.done ? colors.tintInk : 'transparent',
                    borderWidth: 1.5, borderColor: colors.tintInk, opacity: i < data.done ? 1 : 0.5,
                  }}
                />
              ))}
            </View>
            <ThemedText variant="footnote" style={{ color: colors.tintInk }}>
              {data.done} séance{data.done > 1 ? 's' : ''} sur {TOTAL_SESSIONS}
            </ThemedText>
          </View>

          {data.pending.map((q) => (
            <Pressable
              key={q.token}
              onPress={() => WebBrowser.openBrowserAsync(`${WEB_ORIGIN}/q/${q.token}`)}
              accessibilityRole="link"
              accessibilityLabel={`Questionnaire à remplir avec ${child.first_name}`}
              style={{ backgroundColor: colors.accent, borderRadius: radius.card, padding: SPACING.space4, marginBottom: SPACING.space3, minHeight: SPACING.touchMin }}
            >
              <ThemedText variant="headline" style={{ color: colors.accentInk }}>Questionnaire à remplir avec {child.first_name}</ThemedText>
              <ThemedText variant="footnote" style={{ color: colors.accentInk, marginTop: 2 }}>
                Quelques minutes, sur votre téléphone. Ses réponses sont partagées avec son coach.
              </ThemedText>
            </Pressable>
          ))}

          {/* Jauge = LSSS (gauge_summary) */}
          <Card>
            <ThemedText variant="headline">Compétences de vie</ThemedText>
            {gauge ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: SPACING.space2 }}>
                <ThemedText variant="numeralHero" style={{ fontVariant: ['tabular-nums'] }}>{gauge.global}</ThemedText>
                <ThemedText variant="footnote" color="label2" style={{ marginLeft: SPACING.space2 }}>sur 100</ThemedText>
              </View>
            ) : (
              <ThemedText variant="subheadline" color="label2" style={{ marginTop: SPACING.space1 }}>
                Le repère apparaîtra après le premier questionnaire.
              </ThemedText>
            )}
          </Card>
          <ListGroup>
            <ListRow icon="trending-up" iconColor="sysTeal" title="Voir les compétences de vie" onPress={() => setSheet('skills')} />
            <ListRow icon="information-circle" iconColor="sysBlue" title="Comprendre l’outil" onPress={() => setSheet('understand')} />
            <ListRow icon="color-palette" iconColor="sysIndigo" title="Personnaliser le passeport" onPress={() => setSheet('perso')} last />
          </ListGroup>

          {/* Courbe = PERMA / bien-être par séance */}
          {perma.length > 0 && (
            <Card style={{ marginTop: SPACING.space3 }}>
              <ThemedText variant="headline" style={{ marginBottom: SPACING.space2 }}>Bien-être au fil des séances</ThemedText>
              <ValueCurve
                values={perma.map((p) => p.value)}
                labels={perma.map((p) => `S${p.session_number}`)}
                accessibilityLabel={`Courbe de bien-être : ${perma.map((p) => `séance ${p.session_number}, ${p.value}`).join(' ; ')}`}
              />
              <CurveCaption>Une mesure par séance, remplie avec votre enfant.</CurveCaption>
            </Card>
          )}

          {/* Travail du coach */}
          <ThemedText variant="title3" style={{ marginTop: SPACING.space4, marginBottom: SPACING.space3 }} accessibilityRole="header">
            Bilans du coach
          </ThemedText>
          {data.reports.length === 0 ? (
            <Card>
              <ThemedText variant="subheadline" color="label2">Les bilans de séance apparaîtront ici après chaque séance.</ThemedText>
            </Card>
          ) : (
            data.reports.map((r) => {
              const body = r.parent_visible_body ?? {};
              const sections = body.sections ?? {};
              return (
                <Card key={r.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <ThemedText variant="headline">{body.session_number ? `Séance ${body.session_number}` : 'Bilan'}</ThemedText>
                    <Pill label={new Date(r.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })} />
                  </View>
                  {Object.keys(REPORT_SECTION_LABELS).map((k) => {
                    const t = asText(sections[k]);
                    if (!t) return null;
                    return (
                      <View key={k} style={{ marginTop: SPACING.space3 }}>
                        <ThemedText variant="footnote" color="label2" style={{ fontWeight: '600' }}>{REPORT_SECTION_LABELS[k]}</ThemedText>
                        <ThemedText variant="body" style={{ marginTop: 2 }}>{t}</ThemedText>
                      </View>
                    );
                  })}
                </Card>
              );
            })
          )}
        </>
      )}

      <LifeSkillsSheet visible={sheet === 'skills'} onClose={() => setSheet(null)} lsss={lsss} gauge={gauge} />
      <UnderstandSheet visible={sheet === 'understand'} onClose={() => setSheet(null)} />
      <PersonalizeSheet visible={sheet === 'perso'} onClose={() => setSheet(null)} value={identity} onSave={onSave} saving={saving} />
    </ScreenScaffold>
  );
}
