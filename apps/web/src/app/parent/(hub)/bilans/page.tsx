'use client';

import { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useChildStore } from '@/stores/child.store';
import { useAccessStore } from '@/lib/access';
import { usePlan } from '@/lib/entitlements';
import { BilanLockedPreview } from '@/components/parent/AccessGate';
import { DocMeta, programPct, signedDocUrl } from '@/lib/bilan';
import { accentHex, resolveAvatarUrl } from '@/lib/avatar';
import { DESIGN_CSS, ageFromDob, buildHtml } from './bilan-html';
import { CARD_INFO, InfoModal, BilanSkeleton } from './card-info';
import { useBilanData } from './useBilanData';
import { PassportEditModal } from './passport-edit';
import { DetailModal, isDetailKey, type DetailKey } from './detail-modal';

/* ────────────────────────────────────────────────────────────────────────────
   Page « Carte d'identité » (zone bilan) — portage fidèle du design Claude
   « Carte Identite THRIVE v2 ».
   Découpage (2026-07-11) : le gabarit HTML vit dans ./bilan-html.ts, les fiches
   d'explication + modale dans ./card-info.tsx, la couche données (TanStack
   Query + invalidation realtime) dans ./useBilanData.ts. Ce fichier ne fait
   plus que l'assemblage.
──────────────────────────────────────────────────────────────────────────── */

function AthleteIdentityPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { children, selectedChildId, isLoading: childrenLoading, loadChildren, selectChild } =
    useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;
  // Droits du forfait — pilotent les sections analytiques (teaser si verrouillé)
  const { can } = usePlan(selectedChildId);

  const [infoKey, setInfoKey] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<DetailKey | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const { data, isPending } = useBilanData(selectedChildId);

  // Photo de profil : children.avatar_url stocke un chemin storage (bucket
  // privé child-avatars) → URL signée résolue ici. Les vieilles URL http
  // passent telles quelles (resolveAvatarUrl gère les deux).
  const { data: avatarUrl } = useQuery({
    queryKey: ['child-avatar', selectedChild?.id, selectedChild?.avatar_url],
    queryFn: () => resolveAvatarUrl(selectedChild?.avatar_url),
    enabled: Boolean(selectedChild),
    staleTime: 45 * 60_000, // l'URL signée vit 60 min
  });

  // Arrivée depuis une notification : /parent/bilans?child=<id>&focus=<carte>
  // → on bascule sur le bon enfant si besoin, puis on scrolle vers la carte
  // [data-info=<focus>] et on la met en évidence, avant de nettoyer l'URL.
  useEffect(() => {
    const childParam = searchParams.get('child');
    const focusParam = searchParams.get('focus');
    if (!childParam && !focusParam) return;
    if (childParam && childParam !== selectedChildId && children.some((c) => c.id === childParam)) {
      selectChild(childParam);
      return; // l'effet rejouera une fois les données du bon enfant chargées
    }
    if (!data) return; // la grille n'est pas encore rendue
    const done = () => router.replace('/parent/bilans', { scroll: false });
    if (!focusParam) {
      done();
      return;
    }
    // Scroll instantané (le scroll fluide est avorté par les re-renders et
    // animations d'entrée de la grille) : on atterrit sur la carte, la
    // surbrillance guide l'œil, puis on nettoie l'URL.
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `.bilan-root [data-info="${CSS.escape(focusParam)}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.classList.add('b-flash');
        el.addEventListener('animationend', () => el.classList.remove('b-flash'), { once: true });
      }
      done();
    }, 350);
    return () => clearTimeout(t);
  }, [searchParams, data, selectedChildId, children, selectChild, router]);

  // Clics délégués : [data-action] ouvre l'édition du passeport, [data-doc]
  // télécharge (URL signée), [data-href] navigue, [data-info] ouvre la fiche
  // d'explication.
  const onClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-action="edit-passport"]')) {
      e.stopPropagation();
      setEditOpen(true);
      return;
    }
    const docId = target.closest('[data-doc]')?.getAttribute('data-doc');
    if (docId) {
      e.stopPropagation();
      const doc = data?.docs.find((d) => d.id === docId);
      if (doc) {
        const url = await signedDocUrl(doc.storage_path, 120);
        if (url) window.open(url, '_blank', 'noopener');
      }
      return;
    }
    const nav = target.closest('[data-href]');
    const href = nav?.getAttribute('data-href');
    if (href) {
      router.push(href);
      return;
    }
    const key = target.closest('[data-info]')?.getAttribute('data-info');
    if (!key) return;
    // Cartes « livrables » : d'abord la fiche détaillée avec les données de
    // l'enfant en grand ; la flèche de la fiche mène à l'explication.
    if (isDetailKey(key)) setDetailKey(key);
    else if (CARD_INFO[key]) setInfoKey(key);
  };

  const openDoc = async (docId: string) => {
    const doc = data?.docs.find((dd) => dd.id === docId);
    if (!doc) return;
    const url = await signedDocUrl(doc.storage_path, 120);
    if (url) window.open(url, '_blank', 'noopener');
  };

  // Liste des enfants ou données du bilan encore en chargement : squelette
  // plutôt qu'un flash d'état vide ou de carte à 0 %.
  if ((childrenLoading && !selectedChild) || (selectedChild && (isPending || !data))) {
    return <BilanSkeleton />;
  }

  if (!selectedChild) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-2xl text-sun">
          ◈
        </div>
        <h2 className="font-display text-2xl font-semibold text-white mb-3">Aucun profil enfant</h2>
        <p className="text-white/55">
          Ajoute un enfant pour découvrir sa carte d&apos;identité d&apos;athlète THRIVE.
        </p>
      </div>
    );
  }

  const {
    coach,
    completed,
    identity,
    statusByNum,
    gauge,
    lsssPoints,
    permaPoints,
    nextSteps,
    emotions,
    docs,
    pendingLsss,
    pendingPerma,
  } = data!;

  const docIdByKind = (kind: DocMeta['kind']) =>
    docs.find((d) => d.kind === kind && d.parent_visible)?.id;

  const age = ageFromDob(selectedChild.date_of_birth);
  const initials =
    `${selectedChild.first_name?.[0] ?? ''}${selectedChild.last_name?.[0] ?? ''}`.toUpperCase() ||
    '★';
  const html = buildHtml({
    firstName: selectedChild.first_name ?? '',
    fullName: `${selectedChild.first_name ?? ''}${selectedChild.last_name ? ' ' + selectedChild.last_name : ''}`.trim(),
    initials,
    avatarUrl: avatarUrl ?? null,
    nickname: selectedChild.nickname ?? null,
    jerseyNumber: selectedChild.jersey_number ?? null,
    accentColor: accentHex(selectedChild.accent_color),
    age,
    sport: identity?.sport || 'Hockey sur glace',
    poste: identity?.position || '—',
    club: identity?.club ?? null,
    coachLast: coach?.last_name || '—',
    coachLabel: coach ? `${coach.first_name?.[0] ? coach.first_name[0] + '. ' : ''}${coach.last_name}` : null,
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
    gaugeDelta:
      lsssPoints.length >= 2
        ? lsssPoints[lsssPoints.length - 1].value - lsssPoints[0].value
        : null,
    bySkill: gauge?.by_skill ?? {},
    lsssPoints,
    permaPoints,
    nextSteps: nextSteps.map((s) => ({ label: s.label, status: s.status, due_date: s.due_date })),
    docIds: {
      contract: docIdByKind('CONTRACT'),
      letter: docIdByKind('LETTER'),
      certificate: docIdByKind('CERTIFICATE'),
    },
    latestEmotion: emotions[0]?.emotion ?? null,
    statusByNum,
    certificateReady: identity?.certificate_ready ?? false,
    ent: {
      skillBreakdown: can('skillBreakdown'),
      lsssCurve: can('lsssCurve'),
      emotionWheel: can('emotionWheel'),
    },
  });

  return (
    <div className="-mx-4 md:-mx-6 -my-6 md:-my-8">
      <style dangerouslySetInnerHTML={{ __html: DESIGN_CSS }} />
      {pendingLsss && (
        <div className="mx-4 md:mx-6 mt-4 mb-2 p-4 rounded-2xl bg-[#0a3a44] border border-[#F9EB50]/30 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#F9EB50]/15 flex items-center justify-center text-[#F9EB50] shrink-0">
            ✎
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#eaf3f1]">Questionnaire LSSS en attente</p>
            <p className="text-xs text-[#eaf3f1]/60">
              {selectedChild.first_name} a un questionnaire à compléter avec toi.
            </p>
          </div>
          {pendingLsss.token && (
            <a
              href={`/q/${pendingLsss.token}`}
              className="shrink-0 px-4 py-2 rounded-full bg-[#F9EB50] text-[#06222a] text-sm font-bold"
            >
              Ouvrir
            </a>
          )}
        </div>
      )}
      {pendingPerma && (
        <div className="mx-4 md:mx-6 mt-4 mb-2 p-4 rounded-2xl bg-[#2e2410] border border-[#F6B45A]/40 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#F6B45A]/15 flex items-center justify-center text-[#F6B45A] shrink-0">
            ☀️
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#eaf3f1]">
              Questionnaire bien-être à compléter
              {pendingPerma.session_number ? ` — séance ${pendingPerma.session_number}` : ''}
            </p>
            <p className="text-xs text-[#eaf3f1]/60">
              {selectedChild.first_name} a un court questionnaire de bien-être (EPOCH) à remplir avec toi.
            </p>
          </div>
          {pendingPerma.token && (
            <a
              href={`/q/${pendingPerma.token}`}
              className="shrink-0 px-4 py-2 rounded-full bg-[#F6B45A] text-[#241a08] text-sm font-bold"
            >
              Ouvrir
            </a>
          )}
        </div>
      )}
      <div onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      {detailKey &&
        typeof document !== 'undefined' &&
        // Portal vers <body> : la modale (position:fixed) doit se référer à
        // l'écran, pas au conteneur de page animé (transform → bloc conteneur).
        createPortal(
          <DetailModal
            detailKey={detailKey}
            d={{
              firstName: selectedChild.first_name ?? '',
              accent: accentHex(selectedChild.accent_color),
              toolbox: identity?.toolbox ?? [],
              focusWord: identity?.focus_word ?? null,
              nextSteps,
              sportStory: identity?.sport_story ?? null,
              strengths: identity?.strengths ?? [],
              seasonDream: identity?.season_dream ?? null,
              sport: identity?.sport || 'Hockey sur glace',
              poste: identity?.position || '—',
              club: identity?.club ?? null,
              smartGoal: identity?.smart_goal ?? null,
              lifeSkillGoal: identity?.life_skill_goal ?? null,
              myActions: identity?.my_actions ?? [],
              pct: programPct(completed, 13, identity?.program_pct_override ?? null),
              letter: identity?.letter ?? null,
              completed,
              certificateReady: identity?.certificate_ready ?? false,
              docIds: {
                contract: docIdByKind('CONTRACT'),
                letter: docIdByKind('LETTER'),
                certificate: docIdByKind('CERTIFICATE'),
              },
            }}
            onClose={() => setDetailKey(null)}
            // La fiche d'explication s'ouvre PAR-DESSUS la fiche détaillée
            // (portail monté après → dernier dans <body> → au premier plan).
            onExplain={() => setInfoKey(detailKey)}
            onOpenDoc={openDoc}
          />,
          document.body
        )}
      {infoKey &&
        CARD_INFO[infoKey] &&
        typeof document !== 'undefined' &&
        createPortal(
          <InfoModal info={CARD_INFO[infoKey]} onClose={() => setInfoKey(null)} />,
          document.body
        )}
      {editOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <PassportEditModal
            child={selectedChild}
            currentAvatarUrl={avatarUrl ?? null}
            onClose={() => setEditOpen(false)}
            onSaved={async () => {
              setEditOpen(false);
              // Nouveau chemin de photo → nouvelle URL signée, et re-lecture
              // des colonnes de personnalisation dans le store enfants.
              await queryClient.invalidateQueries({ queryKey: ['child-avatar'] });
              if (user?.id) await loadChildren(user.id);
            }}
          />,
          document.body
        )}
    </div>
  );
}

// ── Garde d'accès : aperçu grisé tant que le compte n'est pas activé ─────────
// (titres visibles, contenu non cliquable — enforcement réel via RLS)
export default function BilansPage() {
  const { access, isLoading, refresh } = useAccessStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (isLoading || !access) {
    return <div className="h-40 rounded-2xl bg-white/[0.05] animate-pulse" aria-hidden />;
  }
  if (!access.unlocked) return <BilanLockedPreview />;
  return (
    // Suspense requis par useSearchParams (deep-link des notifications)
    <Suspense fallback={<BilanSkeleton />}>
      <AthleteIdentityPageInner />
    </Suspense>
  );
}
