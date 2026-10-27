// L'onglet Bilan, portage de apps/web/src/app/parent/(hub)/bilans/page.tsx : même accès (access_state, 080), mêmes
// rappels de questionnaire, même « Carte d'identité » (gabarit HTML du web rendu à l'identique), mêmes fiches.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { usePageStage } from '../../../stores/pageReady.store';
import * as WebBrowser from 'expo-web-browser';
import { DelayedSkeleton, WaveSkeleton } from '../../motion/WaveSkeleton';
import { ProgressRing } from '../../motion/ProgressRing';
import { AccentButton, Tap, WIcon, WText, useWeb } from '../../../design/web';
import { buildHtml, ageFromDob } from '../../../../../web/src/app/parent/(hub)/bilans/bilan-html';
import { useAuthStore } from '../../../stores/auth.store';
import { useChildStore, useSelectedChild } from '../../../stores/child.store';
import { useSubscriptionStore } from '../../../stores/subscription.store';
import { sectionView } from '../../../services/access';
import { useStall } from '../../../hooks/useStall';
import { LoadRetry } from '../LoadRetry';
import { useUpgrade } from '../UpgradeSheet';
import { HubScreen } from '../HubScreen';
import { HubLocked, ReadOnlyBanner } from '../HubLocked';
import { openNotificationTarget } from '../HubProvider';
import BilanDom, { type BilanAction } from './BilanDom';
import { DetailSheet, InfoSheet, PassportSheet, isDetailKey, type DetailKey } from './BilanSheets';
import { accentHex, programPct, resolveAvatarUrl, signedDocUrl, useBilanData, usePack } from './data';


function BilanSkeleton() {
  return (
    <DelayedSkeleton>
      <View style={{ gap: 12, marginTop: 8, alignItems: 'center' }} accessibilityLabel="Chargement du bilan">
        <ProgressRing value={0} animate={false} size={180} />
        <View style={{ alignSelf: 'stretch', gap: 12 }}>
          <WaveSkeleton gap={12} shapes={[{ height: 72, radius: 26 }, { height: 72, radius: 26 }, { height: 176, radius: 26 }]} />
        </View>
      </View>
    </DelayedSkeleton>
  );
}

/** Rappel de questionnaire (même grammaire que les cartes : aplat, un seul accent). */
function Pending({ tone, title, body, token, onDone }: { tone: 'sun' | 'sage'; title: string; body: string; token: string | null; onDone: () => void }) {
  const w = useWeb();
  const router = useRouter();
  const ring = tone === 'sun' ? 'rgba(249,235,80,0.25)' : 'rgba(167,196,188,0.3)';
  return (
    <View style={{ marginBottom: 12, padding: 16, borderRadius: 18, backgroundColor: w.surface, borderWidth: 1, borderColor: ring, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tone === 'sun' ? 'rgba(249,235,80,0.1)' : 'rgba(167,196,188,0.1)', alignItems: 'center', justifyContent: 'center' }}>
        <WIcon name={tone === 'sun' ? 'clipboard' : 'chart'} size={20} color={tone === 'sun' ? w.accentInk : w.sageInk} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <WText size={15} weight={600} tone="ink">
          {title}
        </WText>
        <WText size={13} tone="soft">
          {body}
        </WText>
      </View>
      {token ? (
        <AccentButton label="Ouvrir" height={44} tone={tone === 'sun' ? 'accent' : 'sage'} onPress={() => void openNotificationTarget(router as never, `/q/${token}`).then(onDone)} />
      ) : null}
    </View>
  );
}

function BilanInner({ scrollRef, refreshTick, onRefreshed }: { scrollRef: React.RefObject<ScrollView | null>; refreshTick: number; onRefreshed: () => void }) {
  const w = useWeb();
  const { openUpgrade } = useUpgrade();
  const router = useRouter();
  const params = useLocalSearchParams<{ child?: string; focus?: string }>();
  const { children, isLoading: childrenLoading, loaded, selectChild } = useChildStore();
  const child = useSelectedChild();
  const access = useSubscriptionStore((s) => s.access);
  const view = access ? sectionView(access, 'bilan') : null;
  const { data, error, reload } = useBilanData(child && view && view !== 'locked' ? child.id : null);
  const { can, loaded: packLoaded } = usePack(child?.id ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [infoKey, setInfoKey] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<DetailKey | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [docError, setDocError] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [domFailed, setDomFailed] = useState(false);
  const [domKey, setDomKey] = useState(0);
  const top = useRef(0);
  const domReady = useRef(false);
  const domTries = useRef(0);
  const [domShown, setDomShown] = useState(false);
  // La carte (webview) n'est montée qu'au premier passage sur l'onglet : montée cachée en arrière-plan, iOS pouvait
  // la mesurer à 0 px et elle restait vide.
  const [seen, setSeen] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setSeen(true);
    }, []),
  );

  // Un chargement ne reste jamais sans issue : au bout de 10 s, « Réessayer » (accès, dossier ou carte).
  const waiting = !access || (!data && !!child) || !packLoaded;
  const stalled = useStall(waiting, 10_000);
  // Page de chargement de l'onglet : le dossier lu, puis la carte réellement affichée (hauteur > 0).
  const nothingToShow = !!access && (view === 'locked' || (loaded && !childrenLoading && !child));
  const giveUp = stalled || (error && !data) || domFailed;
  usePageStage('bilan', 'dossier', nothingToShow || giveUp || (!!data && packLoaded));
  usePageStage('bilan', 'affichage', nothingToShow || giveUp || domShown);
  const retryAll = () => {
    void useSubscriptionStore.getState().loadServerAccess();
    const uid = useAuthStore.getState().user?.id;
    if (uid) void useChildStore.getState().loadChildren(uid);
    void reload();
    setDomFailed(false);
    setDomKey((k) => k + 1);
  };

  // La carte d'identité (webview) est remontée si elle ne s'annonce pas dans les 8 s (une fois automatiquement,
  // puis « Réessayer »), et au retour de l'arrière-plan après une longue pause (iOS peut vider une webview endormie).
  const hasData = !!data;
  useEffect(() => {
    if (!hasData || !seen || domFailed) return;
    domReady.current = false;
    const t = setTimeout(() => {
      if (domReady.current) return;
      if (domTries.current < 1) {
        domTries.current += 1;
        setDomKey((k) => k + 1);
      } else {
        setDomFailed(true);
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [hasData, seen, domKey, domFailed]);
  useEffect(() => {
    let leftAt = 0;
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') leftAt = leftAt || Date.now();
      else {
        if (leftAt && Date.now() - leftAt > 5 * 60_000) setDomKey((k) => k + 1);
        leftAt = 0;
      }
    });
    return () => sub.remove();
  }, []);

  // Glisser vers le bas : relecture du dossier.
  useEffect(() => {
    if (refreshTick === 0) return;
    void reload().finally(onRefreshed);
  }, [refreshTick]);

  // Arrivée depuis une notification : /bilans?child=…&focus=… → bon enfant, puis la carte visée.
  useEffect(() => {
    if (typeof params.child === 'string' && children.some((c) => c.id === params.child) && params.child !== child?.id) selectChild(params.child);
    if (typeof params.focus === 'string') setFocus(params.focus);
  }, [params.child, params.focus, children, child?.id, selectChild]);

  useEffect(() => {
    let ok = true;
    resolveAvatarUrl(child?.avatar_url).then((u) => ok && setAvatarUrl(u));
    return () => {
      ok = false;
    };
  }, [child?.avatar_url]);

  const docIdByKind = useCallback((kind: string) => data?.docs.find((d) => d.kind === kind && d.parent_visible)?.id, [data]);

  const html = useMemo(() => {
    if (!child || !data) return null;
    const { coach, completed, identity, statusByNum, gauge, lsssPoints, permaPoints, nextSteps, emotions } = data;
    return buildHtml({
      firstName: child.first_name ?? '',
      fullName: `${child.first_name ?? ''}${child.last_name ? ` ${child.last_name}` : ''}`.trim(),
      initials: `${child.first_name?.[0] ?? ''}${child.last_name?.[0] ?? ''}`.toUpperCase() || '★',
      avatarUrl,
      nickname: child.nickname ?? null,
      jerseyNumber: child.jersey_number ?? null,
      accentColor: accentHex(child.accent_color),
      age: ageFromDob(child.date_of_birth),
      sport: identity?.sport || '—',
      poste: identity?.position || '—',
      club: identity?.club ?? null,
      coachLast: coach?.last_name || '—',
      coachLabel: coach ? `${coach.first_name?.[0] ? `${coach.first_name[0]}. ` : ''}${coach.last_name}` : null,
      force1: identity?.strengths?.[0] || '—',
      completed,
      pct: programPct(completed, 13, identity?.program_pct_override ?? null),
      smartGoal: identity?.smart_goal ?? null,
      focusWord: identity?.focus_word ?? null,
      toolboxCount: identity?.toolbox?.length ?? 0,
      toolbox: identity?.toolbox ?? [],
      letter: identity?.letter ?? null,
      sportStory: identity?.sport_story ?? null,
      strengths: identity?.strengths ?? [],
      seasonDream: identity?.season_dream ?? null,
      lifeSkillGoal: identity?.life_skill_goal ?? null,
      myActions: identity?.my_actions ?? [],
      gaugeGlobal: gauge?.global ?? null,
      gaugeDelta: lsssPoints.length >= 2 ? lsssPoints[lsssPoints.length - 1].value - lsssPoints[0].value : null,
      bySkill: gauge?.by_skill ?? {},
      lsssPoints,
      permaPoints,
      nextSteps: nextSteps.map((s) => ({ label: s.label, status: s.status, due_date: s.due_date })),
      docIds: { contract: docIdByKind('CONTRACT'), letter: docIdByKind('LETTER'), certificate: docIdByKind('CERTIFICATE') },
      latestEmotion: emotions[0]?.emotion ?? null,
      statusByNum,
      certificateReady: identity?.certificate_ready ?? false,
      ent: { skillBreakdown: can('skillBreakdown'), lsssCurve: can('lsssCurve'), emotionWheel: can('emotionWheel') },
    });
  }, [child, data, avatarUrl, can, docIdByKind]);

  // Variables CSS de l'ambiance (globals.css du web), posées sur la racine du gabarit.
  const vars = useMemo(
    () => ({
      '--bg': w.bg, '--surface': w.surface, '--surface-sub': w.surfaceSub, '--text': w.text, '--text2': w.text2, '--text3': w.text3,
      '--text4': w.text4, '--line': w.line, '--line2': w.line2, '--chip': w.chip, '--accent-ink': w.accentInk, '--sage-ink': w.sageInk,
      '--bad-ink': w.isNight ? '#E78A8A' : '#B42318', '--bad-num': w.isNight ? '#FFB4B4' : '#B42318',
      '--warn-ink': w.warnInk, '--warn-num': w.isNight ? '#F2D18A' : '#8A5A00', '--kid-mix': w.isNight ? '100%' : '42%',
      color: w.text2,
    }),
    [w],
  );

  const openDoc = async (docId: string) => {
    const doc = data?.docs.find((d) => d.id === docId);
    const url = doc ? await signedDocUrl(doc.storage_path) : null;
    if (!url) {
      setDocError(true);
      return;
    }
    setDocError(false);
    void WebBrowser.openBrowserAsync(url);
  };

  const onAction = async (a: BilanAction) => {
    if (a.type === 'edit') setEditOpen(true);
    else if (a.type === 'doc') void openDoc(a.value);
    else if (a.type === 'href') {
      // « Voir les forfaits » des contenus floutés → le panneau « Passer au forfait supérieur » ; les séances vidéo = « Bientôt ».
      if (a.value.startsWith('/parent/upgrade')) openUpgrade();
      else if (a.value.startsWith('/parent/fitness/seances')) router.push('/(parent)/videos');
      else if (a.value.startsWith('/parent/my-sessions')) router.navigate('/(parent)/seances');
    } else if (isDetailKey(a.value)) setDetailKey(a.value);
    else setInfoKey(a.value);
  };

  if (!access || ((childrenLoading || !loaded) && !child)) return stalled ? <LoadRetry onRetry={retryAll} /> : <BilanSkeleton />;
  if (view === 'locked') return <HubLocked section="bilan" />;

  if (!child) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 80 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, marginBottom: 24, backgroundColor: 'rgba(249,235,80,0.1)', alignItems: 'center', justifyContent: 'center' }}>
          <WIcon name="sparkle" size={24} color={w.accentInk} />
        </View>
        <WText display size={24} weight={600} tone="ink" center style={{ marginBottom: 12 }}>
          Aucun profil enfant
        </WText>
        <WText size={15} tone="soft" center>
          Ajoute un enfant pour découvrir sa carte d’identité d’athlète THRIVE.
        </WText>
        <AccentButton label="Ajouter mon enfant" onPress={() => router.push('/(parent)/children')} style={{ marginTop: 24 }} />
      </View>
    );
  }
  // Le gabarit attend le forfait : jamais de « Contenu réservé » affiché un instant à tort.
  if (!data || !html || !packLoaded) return stalled || (error && !data) ? <LoadRetry onRetry={retryAll} /> : <BilanSkeleton />;

  const identity = data.identity;
  return (
    <View>
      {view === 'readonly' ? <ReadOnlyBanner endedOn={access.packEnd} /> : null}
      {data.pendingLsss ? (
        <Pending tone="sun" title="Questionnaire LSSS en attente" body={`${child.first_name} a un questionnaire à compléter avec toi.`} token={data.pendingLsss.token} onDone={() => void reload()} />
      ) : null}
      {data.pendingPerma ? (
        <Pending
          tone="sage"
          title={`Questionnaire bien-être à compléter${data.pendingPerma.session_number ? ` — séance ${data.pendingPerma.session_number}` : ''}`}
          body={`${child.first_name} a un court questionnaire de bien-être (EPOCH) à remplir avec toi.`}
          token={data.pendingPerma.token}
          onDone={() => void reload()}
        />
      ) : null}
      {docError ? (
        <View style={{ marginBottom: 12, padding: 16, borderRadius: 18, backgroundColor: w.surface, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityRole="alert">
          <WText size={14} tone="body" style={{ flex: 1 }}>
            Le document n’a pas pu s’ouvrir. Vérifie ta connexion et réessaie ; s’il manque, écris à ton coach.
          </WText>
          <Tap onPress={() => setDocError(false)} accessibilityRole="button" accessibilityLabel="Fermer" style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: w.line2, alignItems: 'center', justifyContent: 'center' }}>
            <WIcon name="close" size={16} color={w.text2} />
          </Tap>
        </View>
      ) : null}

      {domFailed ? (
        <View style={{ alignItems: 'center', paddingVertical: 48, gap: 16 }} accessibilityRole="alert">
          <WText size={15} tone="soft" center>
            La carte d’identité n’a pas pu s’afficher. Vérifie ta connexion, puis réessaie.
          </WText>
          <AccentButton
            label="Réessayer"
            height={44}
            onPress={() => {
              setDomFailed(false);
              setDomKey((k) => k + 1);
            }}
          />
        </View>
      ) : (
        <View onLayout={(e) => (top.current = e.nativeEvent.layout.y)}>
          {seen ? (
          <BilanDom
            key={domKey}
            html={html}
            vars={vars}
            focus={focus}
            onReady={async () => {
              domReady.current = true;
              domTries.current = 0;
              setDomShown(true);
            }}
            onAction={onAction}
            onFocusOffset={async (y) => {
              scrollRef.current?.scrollTo({ y: Math.max(0, top.current + y - 120), animated: false });
              setFocus(null);
            }}
            dom={{
              matchContents: true, scrollEnabled: false, useExpoDOMWebView: true, style: { backgroundColor: 'transparent' },
              onError: () => setDomFailed(true),
            }}
          />
          ) : null}
        </View>
      )}

      <DetailSheet
        detailKey={detailKey}
        onClose={() => setDetailKey(null)}
        onExplain={() => {
          const k = detailKey;
          setDetailKey(null);
          setTimeout(() => setInfoKey(k), 260);
        }}
        onOpenDoc={openDoc}
        d={{
          firstName: child.first_name ?? '',
          accent: accentHex(child.accent_color),
          toolbox: identity?.toolbox ?? [],
          focusWord: identity?.focus_word ?? null,
          nextSteps: data.nextSteps,
          sportStory: identity?.sport_story ?? null,
          strengths: identity?.strengths ?? [],
          seasonDream: identity?.season_dream ?? null,
          sport: identity?.sport || '—',
          poste: identity?.position || '—',
          club: identity?.club ?? null,
          smartGoal: identity?.smart_goal ?? null,
          lifeSkillGoal: identity?.life_skill_goal ?? null,
          myActions: identity?.my_actions ?? [],
          pct: programPct(data.completed, 13, identity?.program_pct_override ?? null),
          letter: identity?.letter ?? null,
          completed: data.completed,
          certificateReady: identity?.certificate_ready ?? false,
          docIds: { contract: docIdByKind('CONTRACT'), letter: docIdByKind('LETTER'), certificate: docIdByKind('CERTIFICATE') },
        }}
      />
      <InfoSheet infoKey={infoKey} onClose={() => setInfoKey(null)} />
      <PassportSheet
        visible={editOpen}
        child={child}
        currentAvatarUrl={avatarUrl}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          setEditOpen(false);
          const uid = useAuthStore.getState().user?.id;
          if (uid) await useChildStore.getState().loadChildren(uid);
          void reload();
        }}
      />
    </View>
  );
}

export function BilanScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const childId = useSelectedChild()?.id ?? null;
  return (
    <HubScreen
      ref={scrollRef}
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
      <BilanInner key={childId ?? 'none'} scrollRef={scrollRef} refreshTick={tick} onRefreshed={() => setRefreshing(false)} />
    </HubScreen>
  );
}
