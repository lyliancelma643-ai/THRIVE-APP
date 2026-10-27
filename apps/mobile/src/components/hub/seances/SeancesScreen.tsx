// Mes séances — portage fidèle de apps/web/src/app/parent/(hub)/my-sessions/page.tsx (téléphone) : le programme 1:1
// de l'enfant, la jauge 0/13, la prochaine séance, les 13 séances (contour tant que non validée, surface pleine une
// fois validée, anneau qui respire sur la séance en cours) et le bilan du coach déplié sous la séance (RPC filtré
// `session_report`, migration 039 : le serveur n'envoie jamais le contenu réservé).

import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Platform, RefreshControl, UIManager, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { supabaseClient as supabase } from '@thrive/shared';
import { DelayedSkeleton, WaveSkeleton } from '../../motion/WaveSkeleton';
import { AccentButton, Eyebrow, FadeUp, GhostButton, NcCard, NcRow, Tap, Track, WIcon, WText, useWeb } from '../../../design/web';
import { THRIVE_SESSIONS } from '../../../../../web/src/lib/coach';
import { sessionWhen } from '../../../../../web/src/lib/session-time';
import type { Pack } from '../../../../../web/src/lib/packs';
import { useSelectedChild, useChildStore } from '../../../stores/child.store';
import { useSubscriptionStore } from '../../../stores/subscription.store';
import { useAuthStore } from '../../../stores/auth.store';
import { sectionView } from '../../../services/access';
import { useUpgrade } from '../UpgradeSheet';
import { useStall } from '../../../hooks/useStall';
import { LoadRetry } from '../LoadRetry';
import { Split } from '../Split';
import { useLayout } from '../../../design/layout';
import { HubScreen } from '../HubScreen';
import { useRevalidateStore } from '../../../stores/revalidate.store';
import { usePageStage } from '../../../stores/pageReady.store';
import { HubLocked, ReadOnlyBanner } from '../HubLocked';
import { usePack } from '../bilan/data';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

type Status = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
type OneToOneSession = {
  id: string;
  session_number: number | null;
  title: string | null;
  status: Status;
  scheduled_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
};
type SessionBilan = {
  session_id: string;
  session_number: number | null;
  premium: boolean;
  message: string | null;
  has_bilan: boolean;
  has_observations: boolean;
  bilan: Record<string, unknown> | null;
  observations: Record<string, number> | null;
  observation_labels: string[] | null;
};
type CoachInfo = { first_name: string; last_name: string } | null;

/** Banc d'essai DEV (/__ecran) : séances de démonstration par enfant, jamais lues en production. */
export const DEV_SEANCES_FIXTURES = new Map<string, { sessions: OneToOneSession[]; bilans: Record<string, SessionBilan>; coach: CoachInfo }>();

const PHASE_LABELS = { ANCRER: 'Phase 1 — Ancrer', DEVELOPPER: 'Phase 2 — Développer', INTEGRER: 'Phase 3 — Intégrer' } as const;
function phaseOfSession(n: number | null): keyof typeof PHASE_LABELS {
  if (!n || n <= 2) return 'ANCRER';
  if (n <= 10) return 'DEVELOPPER';
  return 'INTEGRER';
}

/** Échelle de couleur des notes (PackGate.tsx du web). */
const NOTE_COLORS: Record<number, string> = { 5: '#34D399', 4: '#A3E635', 3: '#F9EB50', 2: '#B7AE72', 1: '#6B7280' };

function ScoreGauge({ note, locked }: { note: number; locked: boolean }) {
  const w = useWeb();
  const value = Math.max(0, Math.min(5, Math.round(note)));
  const pct = (value / 5) * 100;
  const color = NOTE_COLORS[value] ?? '#6B7280';
  const c = 2 * Math.PI * 16;
  return (
    <View style={{ width: 56, height: 56 }} accessibilityLabel={locked ? 'Note masquée — réservée aux packs supérieurs' : `Note ${value} sur 5`}>
      <Svg viewBox="0 0 36 36" width={56} height={56} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={18} cy={18} r={16} fill="none" stroke={w.line2} strokeWidth={3} />
        <Circle cx={18} cy={18} r={16} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <WText display size={18} weight={600} tone="ink" lh={20}>
          {String(value)}
        </WText>
      </View>
    </View>
  );
}

/** Note d'upgrade : cadenas + ce qui s'ouvre, et TOUJOURS le bouton « Passer au forfait … » (panneau UpgradeSheet). */
function UpgradeHint({ pack }: { pack: Pack }) {
  const w = useWeb();
  const { openUpgrade } = useUpgrade();
  const hint =
    pack === 'AVANCE'
      ? 'Ton forfait Individuel donne accès aux bilans des séances 3, 7 et 13. Le forfait Complet ouvre toutes les séances.'
      : 'Le bilan détaillé et les observations du coach s’ouvrent avec un forfait Individuel ou Complet.';
  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(249,235,80,0.28)', backgroundColor: 'rgba(249,235,80,0.07)', paddingHorizontal: 14, paddingVertical: 12, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ marginTop: 2 }}>
          <WIcon name="lock" size={16} color={w.accentInk} />
        </View>
        <WText size={14} lh={1.5} tone="body" style={{ flex: 1 }}>
          <WText size={14} weight={600} tone="accent">
            {'Contenu réservé. '}
          </WText>
          {hint}
        </WText>
      </View>
      <AccentButton label={pack === 'AVANCE' ? 'Passer au forfait Complet' : 'Débloquer le bilan détaillé'} icon="sparkle" height={46} onPress={openUpgrade} />
    </View>
  );
}

function fieldLabel(key: string): string {
  if (key === 'message du coach') return 'Message du coach';
  const k = key.replace(/_/g, ' ').trim();
  return k.charAt(0).toUpperCase() + k.slice(1);
}

/** Corps du bilan d'une séance : message (tous les forfaits), bilan détaillé et observations (selon le forfait). */
function BilanDetails({ bilan, pack }: { bilan: SessionBilan | null; pack: Pack }) {
  const w = useWeb();
  const premium = bilan?.premium ?? false;
  const fields = Object.entries(bilan?.bilan ?? {});
  const obs: [string, number][] = premium
    ? Object.entries(bilan?.observations ?? {}).map(([k, v]) => [k, Number(v)])
    : (bilan?.observation_labels ?? []).map((l) => [l, 3]);
  return (
    <View style={{ gap: 14 }}>
      {bilan?.message ? (
        <View>
          <Eyebrow style={{ marginBottom: 10 }}>Message du coach</Eyebrow>
          <WText size={15} lh={1.6} tone="body">
            {bilan.message}
          </WText>
        </View>
      ) : null}
      {bilan?.has_bilan ? (
        <View>
          <Eyebrow style={{ marginBottom: 10 }}>Bilan du coach</Eyebrow>
          {premium ? (
            <View style={{ gap: 10 }}>
              {fields.map(([k, v]) => (
                <View key={k} style={{ gap: 2 }}>
                  <WText size={13} tone="soft">
                    {fieldLabel(k)}
                  </WText>
                  <WText size={15} weight={500} tone="ink">
                    {String(v)}
                  </WText>
                </View>
              ))}
            </View>
          ) : (
            <View>
              <View style={{ gap: 8, marginBottom: 12 }}>
                {['95%', '88%', '72%'].map((x) => (
                  <View key={x} style={{ height: 12, width: x as `${number}%`, borderRadius: 4, backgroundColor: w.chip }} />
                ))}
                <BlurView intensity={10} tint={w.isNight ? 'dark' : 'light'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              </View>
              <UpgradeHint pack={pack} />
            </View>
          )}
        </View>
      ) : null}
      {bilan?.has_observations ? (
        <View>
          <Eyebrow style={{ marginBottom: 10 }}>Observations du coach</Eyebrow>
          {!premium && !bilan?.has_bilan ? (
            <View style={{ marginBottom: 12 }}>
              <UpgradeHint pack={pack} />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
            {obs.map(([ind, note]) => (
              <View key={ind} style={{ width: '48.5%', borderRadius: 16, backgroundColor: w.surfaceSub, paddingHorizontal: 10, paddingVertical: 14, alignItems: 'center', gap: 8 }}>
                <View style={{ opacity: premium ? 1 : 0.9 }}>
                  <ScoreGauge note={note} locked={!premium} />
                  {!premium ? <BlurView intensity={14} tint={w.isNight ? 'dark' : 'light'} style={{ position: 'absolute', top: 18, left: 16, width: 24, height: 22, borderRadius: 6 }} /> : null}
                </View>
                <WText size={13} weight={600} lh={1.35} tone="ink" center>
                  {ind}
                </WText>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Pastille du numéro : sauge cochée (validée), jaune plein (en cours, sans anneau autour), contour (à venir). */
function NumberBadge({ n, state }: { n: number; state: 'done' | 'current' | 'off' | 'todo' }) {
  const w = useWeb();
  const base = { width: 34, height: 34, borderRadius: 17, alignItems: 'center' as const, justifyContent: 'center' as const };
  if (state === 'done') {
    return (
      <View style={[base, { backgroundColor: w.sage }]}>
        <WIcon name="check" size={16} color="#06222A" strokeWidth={2.6} />
      </View>
    );
  }
  if (state === 'current') {
    return (
      <View style={[base, { backgroundColor: w.accent }]}>
        <WText display size={15} weight={600} color="#06222A" lh={18}>
          {String(n)}
        </WText>
      </View>
    );
  }
  return (
    <View style={[base, { borderWidth: 1, borderColor: state === 'off' ? 'rgba(248,113,113,0.4)' : w.line2 }]}>
      <WText display size={15} weight={600} color={state === 'off' ? 'rgba(252,165,165,0.8)' : w.text3} lh={18}>
        {String(n)}
      </WText>
    </View>
  );
}

function NextSessionCard({ session, fallbackTitle, childName, coachName }: { session: OneToOneSession; fallbackTitle: string | null; childName: string; coachName: string | null }) {
  const w = useWeb();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const title = session.title ?? fallbackTitle ?? `Séance ${session.session_number ?? ''}`;
  const live = session.status === 'IN_PROGRESS';
  const upcoming = !!session.scheduled_at && new Date(session.scheduled_at).getTime() > Date.now();

  // La fiche d'événement du Calendrier d'iOS, pré-remplie (aucun accès au calendrier n'est demandé pour l'afficher).
  const addToCalendar = async () => {
    if (!session.scheduled_at) return;
    const start = new Date(session.scheduled_at);
    const end = new Date(start.getTime() + (session.duration_minutes || 60) * 60_000);
    try {
      // Chargé au toucher seulement : jamais au lancement de l'app.
      const Calendar = await import('expo-calendar');
      const r = await Calendar.createEventInCalendarAsync({
        title: `THRIVE · ${title} (${childName})`,
        startDate: start,
        endDate: end,
        notes: coachName ? `Séance ${session.session_number ?? ''} avec ${coachName}, coach THRIVE.` : undefined,
      });
      if (r?.action === 'saved') setAdded(true);
    } catch {
      // Calendrier indisponible : rien à faire, la date reste affichée.
    }
  };

  return (
    <FadeUp delay={0.14} style={{ marginTop: 24 }}>
      <NcCard ring={w.accentLine}>
        <Eyebrow>{live ? 'Séance en cours' : 'Prochaine séance'}</Eyebrow>
        <WText display size={20} weight={600} lh={1.25} tone="ink" style={{ marginTop: 6 }}>{`${session.session_number ? `${session.session_number}. ` : ''}${title}`}</WText>
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <WIcon name="calendar" size={16} color={w.accentInk} />
          <WText size={15} weight={600} tone="accent" style={{ flex: 1 }}>
            {session.scheduled_at ? sessionWhen(session.scheduled_at) : 'Date à fixer avec ton coach'}
          </WText>
        </View>
        {coachName ? (
          <WText size={14} tone="soft" style={{ marginTop: 4 }}>{`Avec ${coachName}`}</WText>
        ) : null}
        <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {upcoming ? <AccentButton label={added ? 'Ajoutée au calendrier' : 'Ajouter au calendrier'} icon={added ? 'check' : 'calendar'} height={44} onPress={addToCalendar} /> : null}
          <GhostButton label="Écrire au coach" icon="mail" height={44} fontSize={14} onPress={() => router.push('/(parent)/messages')} />
        </View>
      </NcCard>
    </FadeUp>
  );
}

function SeancesInner({ refreshTick, onRefreshed }: { refreshTick: number; onRefreshed: () => void }) {
  const w = useWeb();
  const router = useRouter();
  const child = useSelectedChild();
  const { isLoading: childrenLoading, loaded } = useChildStore();
  const access = useSubscriptionStore((s) => s.access);
  const view = access ? sectionView(access, 'seances') : null;
  const { pack } = usePack(child?.id ?? null);
  const [sessions, setSessions] = useState<OneToOneSession[]>([]);
  const [bilans, setBilans] = useState<Record<string, SessionBilan>>({});
  const [coach, setCoach] = useState<CoachInfo>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const { wide } = useLayout();
  const stalled = useStall(!access || ((childrenLoading || !loaded) && !child) || loading, 10_000);
  // Page de chargement de l'onglet : prête quand les séances sont lues (ou qu'il n'y a rien à lire).
  usePageStage('seances', 'seances', (!!access && (view === 'locked' || (loaded && !childrenLoading && !child) || (!!child && !loading))) || stalled);
  const retryAll = () => {
    void useSubscriptionStore.getState().loadServerAccess();
    const uid = useAuthStore.getState().user?.id;
    if (uid) void useChildStore.getState().loadChildren(uid);
    setLoading(true);
    void load();
  };

  // Une seule lecture à la fois ; l'heure de la dernière sert à espacer les relectures au retour sur l'onglet.
  const inFlight = useRef<string | null>(null);
  const lastLoad = useRef(0);
  const hasLoaded = useRef(false);
  const load = useCallback(async () => {
    if (!child?.id || !view || view === 'locked') {
      setLoading(false);
      return;
    }
    // Même enfant déjà en cours de lecture : on n'empile pas (un changement d'enfant, lui, relit toujours).
    if (inFlight.current === child.id) return;
    inFlight.current = child.id;
    lastLoad.current = Date.now();
    if (hasLoaded.current) useRevalidateStore.getState().ping();
    try {
      await loadNow();
    } catch {
      // Lecture ratée : on sort du squelette (relecture au retour sur l'onglet / « Réessayer »).
      setLoading(false);
      setFailed(true);
    } finally {
      if (inFlight.current === child.id) inFlight.current = null;
    }
  }, [child?.id, view]);

  const loadNow = async () => {
    if (!child?.id) return;
    const fixture = __DEV__ ? DEV_SEANCES_FIXTURES.get(child.id) : undefined;
    if (fixture) {
      setSessions(fixture.sessions);
      setBilans(fixture.bilans);
      setCoach(fixture.coach);
      setLoading(false);
      return;
    }
    const [sessionsRes, assignmentRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, session_number, title, status, scheduled_at, completed_at, coach_notes, duration_minutes')
        .eq('child_id', child.id)
        .order('session_number', { ascending: true, nullsFirst: false }),
      supabase.from('coach_assignments').select('coach_id, profiles:coach_id (first_name, last_name)').eq('child_id', child.id).eq('is_active', true).limit(1),
    ]);
    const loaded = (sessionsRes.data ?? []) as OneToOneSession[];
    setSessions(loaded);
    const entries = await Promise.all(
      loaded
        .filter((s) => s.status === 'COMPLETED')
        .map(async (s) => {
          const { data } = await supabase.rpc('session_report', { p_session: s.id });
          return [s.id, (data as SessionBilan | null) ?? null] as const;
        }),
    );
    setBilans(Object.fromEntries(entries.filter(([, b]) => b !== null)) as Record<string, SessionBilan>);
    const a = (assignmentRes.data ?? [])[0] as { profiles?: CoachInfo | CoachInfo[] } | undefined;
    setCoach((Array.isArray(a?.profiles) ? a?.profiles[0] : a?.profiles) ?? null);
    setFailed(Boolean(sessionsRes.error));
    setLoading(false);
    hasLoaded.current = true;
  };

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (refreshTick > 0) void load().finally(onRefreshed);
  }, [refreshTick]);

  // Retour sur l'onglet : relecture silencieuse, au plus toutes les 30 s (le temps réel couvre le reste) ;
  // l'ouverture est déjà chargée par l'effet ci-dessus.
  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastLoad.current > 30_000) void load();
    }, [load]),
  );
  useEffect(() => {
    if (!child?.id || view === 'locked') return;
    const ch = supabase
      .channel(`my-sessions-${child.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `child_id=eq.${child.id}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports', filter: `child_id=eq.${child.id}` }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [child?.id, view, load]);

  if (!access || ((childrenLoading || !loaded) && !child)) {
    if (stalled) return <LoadRetry onRetry={retryAll} />;
    return (
      <DelayedSkeleton>
        <WaveSkeleton gap={8} shapes={[0, 1, 2, 3, 4].map(() => ({ height: 64, radius: 18 }))} />
      </DelayedSkeleton>
    );
  }
  if (view === 'locked') return <HubLocked section="seances" />;
  if (!child) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 80 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, marginBottom: 24, backgroundColor: 'rgba(249,235,80,0.1)', alignItems: 'center', justifyContent: 'center' }}>
          <WIcon name="star" size={24} color={w.accentInk} />
        </View>
        <WText display size={24} weight={600} tone="ink" center style={{ marginBottom: 12 }}>
          Aucun profil enfant
        </WText>
        <WText size={15} tone="soft" center>
          Ajoute un enfant pour voir son programme de 13 séances avec son coach THRIVE.
        </WText>
        <AccentButton label="Ajouter mon enfant" onPress={() => router.push('/(parent)/children')} style={{ marginTop: 24 }} />
      </View>
    );
  }
  if (loading) {
    if (stalled) return <LoadRetry onRetry={retryAll} />;
    return (
      <DelayedSkeleton>
        <WaveSkeleton gap={8} shapes={[0, 1, 2, 3, 4].map(() => ({ height: 64, radius: 18 }))} />
      </DelayedSkeleton>
    );
  }

  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length;
  const nextSession =
    sessions.find((x) => x.status === 'IN_PROGRESS') ??
    sessions.filter((x) => x.status === 'SCHEDULED').sort((a, b) => (a.session_number ?? 99) - (b.session_number ?? 99))[0] ??
    null;

  return (
    <View>
      <Split
        ratio={[4, 6]}
        left={
          <>
      {view === 'readonly' ? <ReadOnlyBanner endedOn={access.packEnd} /> : null}
      <FadeUp delay={0.04}>
        <WText display size={34} weight={600} lh={1.1} tone="ink" style={{ marginBottom: 8 }} accessibilityRole="header">
          Mes séances
        </WText>
        <WText size={15} lh={1.55} tone="soft">
          {`Le programme 1:1 de ${child.first_name}`}
          {coach ? (
            <>
              {' avec '}
              <WText size={15} lh={1.55} weight={600} tone="ink">{`${coach.first_name} ${coach.last_name}`}</WText>
              {', coach THRIVE'}
            </>
          ) : null}
          {'. Mise à jour automatique après chaque séance.'}
        </WText>
      </FadeUp>

      <FadeUp delay={0.1} style={{ marginTop: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <WText size={15} weight={600} tone="body">
            Progression du programme
          </WText>
          <WText display size={17} weight={600} tone="accent">{`${completedCount} / 13`}</WText>
        </View>
        <View style={{ marginTop: 12 }}>
          <Track pct={(completedCount / 13) * 100} />
        </View>
        {sessions.length === 0 ? (
          <WText size={13} tone="soft" style={{ marginTop: 12 }}>{`Les séances s’activeront dès qu’un coach THRIVE sera attribué à ${child.first_name}.`}</WText>
        ) : null}
      </FadeUp>

      {nextSession ? (
        <NextSessionCard
          session={nextSession}
          fallbackTitle={THRIVE_SESSIONS.find((t) => t.num === nextSession.session_number)?.title ?? null}
          childName={child.first_name}
          coachName={coach ? `${coach.first_name} ${coach.last_name}` : null}
        />
      ) : null}

          </>
        }
        right={
          <>
      <View style={{ marginTop: wide ? 0 : 32, gap: 8 }}>
        {THRIVE_SESSIONS.map((tpl, i) => {
          const s = sessions.find((x) => x.session_number === tpl.num) ?? null;
          const isDone = s?.status === 'COMPLETED';
          const isCurrent = s?.status === 'IN_PROGRESS';
          const isOff = s?.status === 'MISSED' || s?.status === 'CANCELLED';
          const bilan = isDone && s ? bilans[s.id] ?? null : null;
          const rowId = s?.id ?? `tpl-${tpl.num}`;
          const isSelected = selectedId === rowId;
          const hasDetails = !!(bilan && (bilan.message || bilan.has_bilan || bilan.has_observations));
          const meta = [
            PHASE_LABELS[phaseOfSession(tpl.num)],
            s?.scheduled_at ? sessionWhen(s.scheduled_at) : null,
            isDone ? 'validée' : isCurrent ? 'en cours' : isOff ? (s?.status === 'MISSED' ? 'manquée' : 'annulée') : 'à venir',
          ]
            .filter(Boolean)
            .join(' · ');
          const ring = isSelected ? 'rgba(249,235,80,0.3)' : isCurrent ? 'rgba(249,235,80,0.22)' : undefined;
          return (
            <FadeUp key={rowId} delay={0.16 + i * 0.04}>
              <NcRow idle={!(isDone || isCurrent)} ring={ring} style={{ overflow: 'hidden', ...(isSelected ? { borderRadius: 20 } : null) }}>
                <Tap
                  disabled={!hasDetails}
                  haptic={hasDetails}
                  scaleTo={hasDetails ? 0.98 : 1}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.create(240, 'easeInEaseOut', 'opacity'));
                    setSelectedId(isSelected ? null : rowId);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: hasDetails ? isSelected : undefined, disabled: !hasDetails }}
                  accessibilityLabel={`Séance ${tpl.num} : ${s?.title ?? tpl.title}. ${meta}${hasDetails ? '. Lire le bilan du coach' : ''}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 }}
                >
                  <NumberBadge n={tpl.num} state={isDone ? 'done' : isCurrent ? 'current' : isOff ? 'off' : 'todo'} />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <WText display size={17} weight={600} lh={1.25} tone={isDone || isCurrent ? 'ink' : 'soft'} numberOfLines={2}>
                      {s?.title ?? tpl.title}
                    </WText>
                    <WText size={13} weight={isCurrent ? 600 : 400} tone={isCurrent ? 'accent' : isDone ? 'soft' : 'faint'}>
                      {meta}
                    </WText>
                  </View>
                  {hasDetails ? (
                    <View style={{ transform: [{ rotate: isSelected ? '90deg' : '0deg' }] }}>
                      <WIcon name="chevron-right" size={18} color={isSelected ? w.accentInk : w.text4} />
                    </View>
                  ) : null}
                </Tap>
                {isSelected && hasDetails ? (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 18, paddingTop: 4 }}>
                    <View style={{ height: 1, backgroundColor: w.chip, marginBottom: 14 }} />
                    <BilanDetails bilan={bilan} pack={pack} />
                  </View>
                ) : null}
              </NcRow>
            </FadeUp>
          );
        })}
      </View>
          </>
        }
      />
    </View>
  );
}

export function SeancesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const childId = useSelectedChild()?.id ?? 'none';
  return (
    <HubScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setTick((t) => t + 1);
          }}
        />
      }
    >
      <SeancesInner key={childId} refreshTick={tick} onRefreshed={() => setRefreshing(false)} />
    </HubScreen>
  );
}
