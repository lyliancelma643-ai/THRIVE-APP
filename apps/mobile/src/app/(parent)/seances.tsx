import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Share, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabaseClient as supabase, useFamily, useChildren } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { OfflineState } from '../../components/OfflineState';
import { LockedSection } from '../../components/access/LockedSection';
import { sectionView } from '../../services/access';
import { useTheme } from '../../design';
import { SeancesView, type SeanceItem } from '../../components/bilan/SeancesView';
import { SessionReportView, type SessionReportModel } from '../../components/bilan/SessionReportView';
import { fetchSessionReport } from '../../components/bilan/bilanApi';
import { buildReportModel, buildSeancesModel, type SessionRow } from '../../components/bilan/bilanModel';

// Mes séances (écrans S et T) : séances en présentiel de l'enfant, par phase, et bilan du coach de chaque séance validée.
// Accès : section Mes séances de access_state() (migration 080) ; verrouillé → aperçu factice flouté,
// AUCUNE requête de données (la RLS refuse aussi). La mise en page vit dans components/bilan (vues).

type ParentReport = { id: string; created_at: string; parent_visible_body: { session_number?: number | null; sections?: Record<string, unknown> } | null };

export default function SeancesScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const child = children.find((c) => c.id === selectedId) ?? children[0];
  const access = useSubscriptionStore((st) => st.access);
  const view = access ? sectionView(access, 'seances') : null;
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [reports, setReports] = useState<ParentReport[]>([]);
  const [coachFirst, setCoachFirst] = useState<string | null>(null);
  const [report, setReport] = useState<SessionReportModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    if (!child?.id || !view || view === 'locked') return;
    setLoading(true);
    setLoadError(false);
    const [s, r, a] = await Promise.all([
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
      supabase
        .from('coach_assignments')
        .select('profiles:coach_id (first_name)')
        .eq('child_id', child.id)
        .eq('is_active', true)
        .limit(1),
    ]);
    setLoading(false);
    if (s.error) {
      setLoadError(true);
      return;
    }
    setSessions((s.data ?? []) as SessionRow[]);
    setReports((r.data ?? []) as ParentReport[]);
    const row = (a.data ?? [])[0] as { profiles?: { first_name?: string } | { first_name?: string }[] } | undefined;
    const p = Array.isArray(row?.profiles) ? row?.profiles[0] : row?.profiles;
    setCoachFirst(p?.first_name ?? null);
  }, [child?.id, view]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const model = useMemo(
    () =>
      child && sessions
        ? buildSeancesModel({
            sessions,
            reportSessionNumbers: new Set(reports.map((r) => r.parent_visible_body?.session_number).filter((n): n is number => typeof n === 'number')),
            coachFirst,
            childName: child.first_name,
            childOptions: children.map((c) => ({ id: c.id, label: c.first_name })),
            activeChildId: child.id,
            readonly: view === 'readonly',
          })
        : null,
    [child, children, sessions, reports, coachFirst, view],
  );

  if (childrenLoading || !view) return <ActivityIndicator style={{ marginTop: 96 }} />;
  if (view === 'locked') return <LockedSection section="seances" childName={child?.first_name ?? null} />;
  if (loadError && !sessions) return <OfflineState onRetry={reload} />;
  if (!child) return <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} />;
  if (!model) return <ActivityIndicator style={{ marginTop: 96 }} />;

  const openReport = async (item: SeanceItem) => {
    const session = sessions?.find((s) => s.id === item.id);
    if (!session) return;
    const rpc = await fetchSessionReport(session.id);
    const sections = reports.find((r) => r.parent_visible_body?.session_number === session.session_number)?.parent_visible_body?.sections ?? null;
    setReport(buildReportModel({ session, rpc, sections, coachFirst }));
  };

  return (
    <>
      <SeancesView
        m={model}
        a={{ onOpenReport: openReport, onSelectChild: setSelectedId, onRefresh: reload, refreshing: loading }}
      />
      <Modal visible={!!report} animationType="slide" onRequestClose={() => setReport(null)} statusBarTranslucent>
        {report ? (
          <SessionReportView
            m={report}
            onBack={() => setReport(null)}
            onShare={() => Share.share({ message: [report.title, report.message].filter(Boolean).join('\n\n') })}
          />
        ) : null}
      </Modal>
    </>
  );
}
