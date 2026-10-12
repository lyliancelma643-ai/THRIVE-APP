import React, { useCallback, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { supabaseClient as supabase, useFamily, useChildren } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { OfflineState } from '../../components/OfflineState';
import { LockedSection, ReadOnlyNotice } from '../../components/access/LockedSection';
import { sectionView } from '../../services/access';
import { Pill, Sheet, SPACING, ThemedText, VignetteImage, useTheme } from '../../design';
import { Card, ChildChips, ScreenScaffold } from '../../components/bilan/ScreenScaffold';
import { REPORT_SECTION_LABELS, asText } from '../../components/bilan/bilanData';

// Mes séances : séances en présentiel de l'enfant (à venir + historique) et bilan du coach (T).
// Accès : section Mes séances de access_state() (migration 080) ; verrouillé →
// squelette factice flouté, AUCUNE requête de données (la RLS refuse aussi).

const TOTAL_SESSIONS = 13;

type Session = {
  id: string;
  session_number: number;
  title: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
};

type Report = { id: string; created_at: string; parent_visible_body: { session_number?: number | null; sections?: Record<string, unknown> } | null };

// Aucun état d'échec affiché : une séance manquée se « replanifie ».
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Planifiée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Faite',
  CANCELLED: 'Annulée',
  MISSED: 'À replanifier',
  POSTPONED: 'Reportée',
};

function when(s: Session): string {
  const d = s.completed_at ?? s.scheduled_at;
  if (!d) return 'Date à venir';
  return new Date(d).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

function Ring({ done }: { done: number }) {
  const { colors } = useTheme();
  const size = 88, sw = 10, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const p = Math.min(1, done / TOTAL_SESSIONS);
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`${done} séances sur ${TOTAL_SESSIONS}`} style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.fill} strokeWidth={sw} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={colors.tint} strokeWidth={sw} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText variant="title3" style={{ fontVariant: ['tabular-nums'] }}>{done}/{TOTAL_SESSIONS}</ThemedText>
      </View>
    </View>
  );
}

export default function SeancesScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const child = children.find((c) => c.id === selectedId) ?? children[0];
  const access = useSubscriptionStore((st) => st.access);
  const view = access ? sectionView(access, 'seances') : null;
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportFor, setReportFor] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    if (!child?.id || !view || view === 'locked') return;
    setLoading(true);
    setLoadError(false);
    const [s, r] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, session_number, title, status, scheduled_at, completed_at')
        .eq('child_id', child.id)
        .order('session_number', { ascending: true }),
      supabase
        .from('parent_reports')
        .select('id, created_at, parent_visible_body')
        .eq('child_id', child.id)
        .order('created_at', { ascending: false }),
    ]);
    setLoading(false);
    if (s.error) setLoadError(true);
    else {
      setSessions((s.data ?? []) as Session[]);
      setReports((r.data ?? []) as Report[]);
    }
  }, [child?.id, view]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (childrenLoading || !view) return <ActivityIndicator style={{ marginTop: 96 }} />;
  if (view === 'locked') return <LockedSection section="seances" />;
  if (loadError && !sessions) return <OfflineState onRetry={reload} />;

  const upcoming = (sessions ?? []).filter((s) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS' || s.status === 'POSTPONED');
  const history = (sessions ?? []).filter((s) => !upcoming.includes(s));
  const done = (sessions ?? []).filter((s) => s.status === 'COMPLETED').length;
  const reportOf = (n: number) => reports.find((r) => r.parent_visible_body?.session_number === n);

  const row = (s: Session) => {
    const rep = reportOf(s.session_number);
    const Wrapper: React.ElementType = rep ? Pressable : View;
    return (
      <Wrapper
        key={s.id}
        {...(rep
          ? { onPress: () => setReportFor(s), accessibilityRole: 'button', accessibilityLabel: `Séance ${s.session_number}, ${s.title}. Voir le bilan du coach` }
          : { accessible: true, accessibilityLabel: `Séance ${s.session_number}, ${s.title}, ${STATUS_LABEL[s.status] ?? ''}` })}
        style={{ minHeight: SPACING.rowMin, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgGrouped2, borderRadius: 16, padding: SPACING.space3, marginBottom: SPACING.space2 }}
      >
        <VignetteImage id={`ACT-${String(s.session_number).padStart(2, '0')}01`} accessibilityLabel="" style={{ width: 56, height: 56, borderRadius: 12 }} />
        <View style={{ flex: 1, marginLeft: SPACING.space3 }}>
          <ThemedText variant="footnote" color="label2">Séance {s.session_number} · {STATUS_LABEL[s.status] ?? s.status}</ThemedText>
          <ThemedText variant="headline" numberOfLines={2}>{s.title}</ThemedText>
          <ThemedText variant="footnote" color="label2">{when(s)}</ThemedText>
        </View>
        {rep ? <Pill label="Bilan" tone="tint" /> : null}
      </Wrapper>
    );
  };

  const sections = reportFor ? (reportOf(reportFor.session_number)?.parent_visible_body?.sections ?? {}) : {};

  return (
    <ScreenScaffold
      title="Mes séances"
      refreshing={loading}
      onRefresh={reload}
      header={<ChildChips items={children.map((c) => ({ id: c.id, label: c.first_name }))} activeId={child?.id} onSelect={setSelectedId} />}
    >
      {view === 'readonly' && <ReadOnlyNotice />}
      {!child ? (
        <ThemedText variant="subheadline" color="label2">Ajoutez votre enfant pour voir ses séances.</ThemedText>
      ) : !sessions ? (
        <ActivityIndicator />
      ) : sessions.length === 0 ? (
        <ThemedText variant="subheadline" color="label2">
          Les séances de {child.first_name} apparaîtront ici dès qu’elles seront planifiées par le coach.
        </ThemedText>
      ) : (
        <>
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ring done={done} />
            <View style={{ flex: 1, marginLeft: SPACING.space4 }}>
              <ThemedText variant="headline">Le parcours de {child.first_name}</ThemedText>
              <ThemedText variant="footnote" color="label2">{done} séance{done > 1 ? 's' : ''} sur {TOTAL_SESSIONS}</ThemedText>
            </View>
          </Card>
          {view === 'open' && upcoming.length > 0 && (
            <>
              <ThemedText variant="title3" accessibilityRole="header" style={{ marginVertical: SPACING.space3 }}>À venir</ThemedText>
              {upcoming.map(row)}
            </>
          )}
          <ThemedText variant="title3" accessibilityRole="header" style={{ marginVertical: SPACING.space3 }}>Historique</ThemedText>
          {history.length === 0 ? (
            <ThemedText variant="subheadline" color="label2">Aucune séance passée pour le moment.</ThemedText>
          ) : (
            history.map(row)
          )}
        </>
      )}

      {/* T — bilan du coach */}
      <Sheet visible={!!reportFor} onClose={() => setReportFor(null)} title={reportFor ? `Bilan de la séance ${reportFor.session_number}` : 'Bilan'} detent="large">
        {Object.keys(REPORT_SECTION_LABELS).map((k) => {
          const t = asText((sections as Record<string, unknown>)[k]);
          if (!t) return null;
          return (
            <View key={k} style={{ marginBottom: SPACING.space3 }}>
              <ThemedText variant="footnote" color="label2" style={{ fontWeight: '600' }}>{REPORT_SECTION_LABELS[k]}</ThemedText>
              <ThemedText variant="body" style={{ marginTop: 2 }}>{t}</ThemedText>
            </View>
          );
        })}
      </Sheet>
    </ScreenScaffold>
  );
}
