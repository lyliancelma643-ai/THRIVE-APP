import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Modal, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabaseClient as supabase, useFamily, useChildren } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { OfflineState } from '../../components/OfflineState';
import { LockedSection } from '../../components/access/LockedSection';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { sectionView } from '../../services/access';
import { useTheme } from '../../design';
import { BilanView } from '../../components/bilan/BilanView';
import { LifeSkillsSheet, PersonalizeView } from '../../components/bilan/BilanSheets';
import { CoachDetailSheet, type CoachDetailKind } from '../../components/bilan/CoachDetailSheet';
import {
  fetchDocuments, fetchIdentity, fetchInsights, fetchNextSteps, fetchPassportCard, fetchSkillBaselines, saveIdentity, signedDocumentUrl,
  type DocRow, type NextStepRow, type PassportCard,
} from '../../components/bilan/bilanApi';
import { buildBilanModel } from '../../components/bilan/bilanModel';
import { parseJersey, type AccentKey, type Gauge, type Identity, type LsssPoint, type PermaPoint } from '../../components/bilan/bilanData';

// Bilan de l'enfant (écrans G, H, I, J) : passeport, jauges (RPC gauge_summary / lsss_progression / perma_progression),
// travail du coach, questionnaires à remplir. Accès : section Bilan de access_state() (migration 080) ;
// verrouillé → aperçu factice flouté, AUCUNE requête de données. La mise en page vit dans components/bilan (vues).

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_URL || 'https://app.thrivesportpositive.com';

type BilanState = { done: number; coachFirst: string | null; pending: { kind: string; token: string }[] };

async function loadBilans(childId: string): Promise<BilanState> {
  const [sessions, assignment, pending] = await Promise.all([
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
  ]);
  const done = (sessions.data ?? []).filter((s: { status: string }) => s.status === 'COMPLETED').length;
  const a = (assignment.data ?? [])[0] as { profiles?: { first_name?: string } | { first_name?: string }[] } | undefined;
  const p = Array.isArray(a?.profiles) ? a?.profiles[0] : a?.profiles;
  return {
    done,
    coachFirst: p?.first_name ?? null,
    pending: ((pending.data ?? []) as { kind: string; access_token: string }[]).map((q) => ({ kind: q.kind, token: q.access_token })),
  };
}

export default function BilansScreen() {
  const { colors } = useTheme();
  const router = useRouter();
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
  const [card, setCard] = useState<PassportCard | null>(null);
  const [steps, setSteps] = useState<NextStepRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [baselines, setBaselines] = useState<Record<string, number>>({});
  const [sheet, setSheet] = useState<'skills' | null>(null);
  const [understand, setUnderstand] = useState(false);
  const [detail, setDetail] = useState<CoachDetailKind | null>(null);
  const [perso, setPerso] = useState(false);
  const [nick, setNick] = useState('');
  const [num, setNum] = useState('');
  const [accent, setAccent] = useState<AccentKey | null>(null);
  const [saving, setSaving] = useState(false);

  const access = useSubscriptionStore((st) => st.access);
  const view = access ? sectionView(access, 'bilan') : null;

  const reload = useCallback(async () => {
    if (!child?.id || !view || view === 'locked') return;
    setLoading(true);
    setLoadError(false);
    try {
      setData(await loadBilans(child.id));
      const [ins, idt, pc, st, dc] = await Promise.all([
        fetchInsights(child.id), fetchIdentity(child.id), fetchPassportCard(child.id), fetchNextSteps(child.id), fetchDocuments(child.id),
      ]);
      setLsss(ins.lsss);
      setPerma(ins.perma);
      setGauge(ins.gauge);
      setIdentity(idt);
      setCard(pc);
      setSteps(st);
      setDocs(dc);
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

  // Repère de départ par compétence : lu à l'ouverture de la feuille (H).
  useEffect(() => {
    if (sheet === 'skills' && child?.id && view && view !== 'locked') {
      fetchSkillBaselines(child.id).then(setBaselines).catch(() => setBaselines({}));
    }
  }, [sheet, child?.id, view]);

  const model = useMemo(
    () =>
      child && data
        ? buildBilanModel({
            child,
            childOptions: children.map((c) => ({ id: c.id, label: c.first_name })),
            activeChildId: child.id,
            parentInitial: (user?.firstName ?? 'P').charAt(0).toUpperCase(),
            done: data.done,
            coachFirst: data.coachFirst,
            pendingQuestionnaire: data.pending.length > 0,
            readonly: view === 'readonly',
            identity, card, gauge, lsss, perma, steps, docs,
          })
        : null,
    [child, children, data, user?.firstName, view, identity, card, gauge, lsss, perma, steps, docs],
  );

  if (childrenLoading || !view) return <ActivityIndicator style={{ marginTop: 96 }} />;
  if (view === 'locked') return <LockedSection section="bilan" childName={child?.first_name ?? null} />;
  if (loadError && !data) return <OfflineState onRetry={reload} />;
  if (!child) {
    return <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} />;
  }
  if (!model) return <ActivityIndicator style={{ marginTop: 96 }} />;

  const openPerso = () => {
    setNick(identity.nickname ?? '');
    setNum(identity.jersey_number == null ? '' : String(identity.jersey_number));
    setAccent(identity.accent_color);
    setPerso(true);
  };
  const jersey = parseJersey(num);
  const numOk = num.trim() === '' || jersey !== null;
  const onSave = async () => {
    if (!numOk || saving) return;
    setSaving(true);
    const next: Identity = { nickname: nick.trim() || null, jersey_number: jersey, accent_color: accent };
    const ok = await saveIdentity(child.id, next);
    setSaving(false);
    if (ok) {
      setIdentity(next);
      setPerso(false);
    }
  };
  const pendingToken = data?.pending[0]?.token;

  return (
    <>
      <BilanView
        m={model}
        a={{
          onSkills: () => setSheet('skills'),
          onPersonalize: openPerso,
          onBell: () => router.push('/(parent)/notifications'),
          onSelectChild: setSelectedId,
          onQuestionnaire: () => pendingToken && WebBrowser.openBrowserAsync(`${WEB_ORIGIN}/q/${pendingToken}`),
          onRow: setDetail,
          onRefresh: reload,
          refreshing: loading,
        }}
      />
      <LifeSkillsSheet
        visible={sheet === 'skills'}
        onClose={() => setSheet(null)}
        lsss={lsss}
        gauge={gauge}
        baselines={baselines}
        onInfo={() => setUnderstand(true)}
        understandVisible={understand}
        onCloseUnderstand={() => setUnderstand(false)}
        childName={child.first_name}
      />
      <CoachDetailSheet
        kind={detail}
        onClose={() => setDetail(null)}
        card={card}
        steps={steps}
        docs={docs}
        onOpenDoc={async (d) => {
          const url = await signedDocumentUrl(d.storage_path);
          if (url) WebBrowser.openBrowserAsync(url);
        }}
      />
      <Modal visible={perso} animationType="slide" onRequestClose={() => setPerso(false)} statusBarTranslucent>
        <PersonalizeView
          name={child.first_name}
          initial={child.first_name.charAt(0).toUpperCase()}
          jersey={num}
          onJersey={setNum}
          nickname={nick}
          onNickname={setNick}
          accent={accent}
          onAccent={setAccent}
          position={card?.position ?? null}
          photoUri={card?.avatarUrl ?? null}
          onCancel={() => setPerso(false)}
          onSave={onSave}
          saving={saving}
          invalid={!numOk}
        />
      </Modal>
    </>
  );
}
