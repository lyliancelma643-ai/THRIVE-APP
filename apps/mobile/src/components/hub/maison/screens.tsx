// Écrans secondaires de Maison, portages fidèles du web (app/parent/(hub)/fitness/…) :
// toutes (catalogue), programme (13 semaines + bibliothèque), carnet, quand-il-dit-non, sources.

import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Paper } from '../../../design';
import { cellWidth, useLayout } from '../../../design/layout';
import {
  BackLink, Eyebrow, FadeUp, LaunchButton, NcCard, NcPill, NcRow, PillGroup, Tap, WIcon, WText, useWeb,
} from '../../../design/web';
import {
  BAND_LABELS, FILTERS, P3_WEEKS, PAGE_NON, PILLAR_PLAIN, REWARDS, ROLE_LABELS, SOURCES_PAGE_TITLE, TERMS_LINE,
  activitiesOfWeek, bonusActivities, byProgramme, captureItems, complementsOfWeek, fill, formatLongDate, getActivity, isVisible,
  matchesFilter, p3Pool, pickTonight, plainAction, plainSession, renderOpener, weekSpan,
  type AgeBand, type FilterId, type P3Activity, type P3MomentRow, type P3RewardRow, type RewardId,
} from '../../../lib/p3web';
import type { MaisonCtx } from './MaisonFrame';
import { useMaisonNav } from './nav';
import { PILLAR_ICON, PosterCard, vignetteSource } from './parts';

/* ───────────────────────────── Pièces ───────────────────────────── */

export function PillarTag({ pillar }: { pillar: P3Activity['pillar_main'] }) {
  const w = useWeb();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <WIcon name={PILLAR_ICON[pillar]} size={16} color={w.accentInk} />
      <WText size={13} tone="soft">
        {PILLAR_PLAIN[pillar]}
      </WText>
    </View>
  );
}

function Title({ children, size = 30 }: { children: string; size?: number }) {
  return (
    <WText display size={size} weight={600} lh={1.1} tone="ink" style={{ marginTop: 8 }} accessibilityRole="header">
      {children}
    </WText>
  );
}

/* ───────────────────────────── Toutes les activités ───────────────────────────── */

const BANDS: AgeBand[] = ['8-11', '12-14', '15-17'];
const PHASES = [
  { id: 'ANCRER', label: 'Ancrer' },
  { id: 'DEVELOPPER', label: 'Développer' },
  { id: 'INTEGRER', label: 'Intégrer' },
] as const;
type Order = 'programme' | 'nouvelles';

// Âge, filtre et ordre restent choisis le temps de la session (retour d'une fiche sur le même rayon).
const catalogueMemory = new Map<string, { band: AgeBand; filter: FilterId; order: Order }>();

export function Catalogue({ ctx }: { ctx: MaisonCtx }) {
  const { columns } = useLayout();
  const nav = useMaisonNav(ctx);
  const { data, firstName } = ctx;
  const mem = catalogueMemory.get(ctx.child.id);
  const [band, setBandState] = useState<AgeBand>(mem?.band ?? ctx.band);
  const [filter, setFilterState] = useState<FilterId>(mem?.filter ?? 'tout');
  const [order, setOrderState] = useState<Order>(mem?.order ?? 'programme');
  const save = (next: Partial<{ band: AgeBand; filter: FilterId; order: Order }>) =>
    catalogueMemory.set(ctx.child.id, { band, filter, order, ...next });
  const setBand = (b: AgeBand) => (setBandState(b), save({ band: b }));
  const setFilter = (f: FilterId) => (setFilterState(f), save({ filter: f }));
  const setOrder = (o: Order) => (setOrderState(o), save({ order: o }));

  const all = useMemo(() => p3Pool().filter((a) => isVisible(a, data.openWeek)), [data.openWeek]);
  const list = useMemo(() => {
    const kept = all.filter((a) => matchesFilter(a, filter, { doneIds: data.doneIds, favoris: data.saved.favoris }));
    return order === 'nouvelles'
      ? [...kept].sort((a, b) => Number(data.doneIds.has(a.id)) - Number(data.doneIds.has(b.id)) || byProgramme(a, b))
      : [...kept].sort(byProgramme);
  }, [all, filter, order, data.doneIds, data.saved.favoris]);

  const open = (a: P3Activity) => nav.fiche(a.id, band === ctx.band ? {} : { bande: band });
  const grid = (items: P3Activity[]) => (
    <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 28 }}>
      {items.map((a, i) => (
        <View key={a.id} style={{ width: cellWidth(columns) }}>
          <PosterCard wide index={i} activity={a} done={data.doneIds.has(a.id)} onPress={() => open(a)} line={renderOpener(a, a.base_duration, band)} />
        </View>
      ))}
    </View>
  );

  return (
    <View>
      <BackLink label="Maison" onPress={nav.back} />
      <Title>Toutes les activités</Title>
      <WText size={15} tone="soft" style={{ marginTop: 6 }}>
        {`${all.length} activités, toutes pensées pour les 8–17 ans. Choisis l’âge : la phrase à dire et la fiche s’adaptent.`}
      </WText>

      <View style={{ marginTop: 24 }}>
        <Eyebrow style={{ marginBottom: 8 }}>Version pour</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BANDS.map((b) => (
            <NcPill key={b} on={band === b} onPress={() => setBand(b)} label={`${BAND_LABELS[b]}${b === ctx.band ? ` · ${firstName}` : ''}`} />
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {FILTERS.map((f) => (
          <NcPill key={f.id} label={f.label} on={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>
      <PillGroup<Order>
        style={{ marginTop: 12 }}
        value={order}
        options={[
          { value: 'programme', label: 'Ordre du programme' },
          { value: 'nouvelles', label: 'Nouvelles d’abord' },
        ]}
        onChange={setOrder}
      />
      {list.length > 0 ? (
        <WText size={14} tone="soft" style={{ marginTop: 16 }}>{`${list.length} activité${list.length > 1 ? 's' : ''} · version ${BAND_LABELS[band]}`}</WText>
      ) : null}

      {list.length === 0 ? (
        <WText size={15} tone="soft" style={{ paddingVertical: 40 }}>
          Rien ici pour l’instant. Ce rayon se remplira au fil des moments.
        </WText>
      ) : order === 'programme' ? (
        [...PHASES, { id: null, label: 'Bonus · hors programme' }].map((p) => {
          const items = list.filter((a) => a.phase === p.id);
          if (!items.length) return null;
          return (
            <View key={p.id ?? 'bonus'} style={{ marginTop: 36 }}>
              <WText display size={22} weight={600} tone="ink" accessibilityRole="header">
                {p.label}
              </WText>
              <WText size={14} tone="soft" style={{ marginTop: 2 }}>
                {weekSpan(items)}
              </WText>
              {grid(items)}
            </View>
          );
        })
      ) : (
        <View style={{ marginTop: 8 }}>{grid(list)}</View>
      )}
    </View>
  );
}

/* ───────────────────────────── Mes favoris ───────────────────────────── */

/**
 * « Mes favoris » (depuis le compte et la fiche) : une page à part pour retrouver d'un coup d'œil les activités mises
 * en Favori ★ et celles Mises de côté ⚑ depuis la fiche (« Lancer · Favori · De côté ») ou pendant l'activité (+).
 */
export function Favoris({ ctx }: { ctx: MaisonCtx }) {
  const { columns } = useLayout();
  const nav = useMaisonNav(ctx);
  const w = useWeb();
  const { data, firstName } = ctx;
  const all = useMemo(() => p3Pool().filter((a) => isVisible(a, data.openWeek)).sort(byProgramme), [data.openWeek]);
  const favoris = all.filter((a) => data.saved.favoris.has(a.id));
  const deCote = all.filter((a) => data.saved.deCote.has(a.id));
  const grid = (items: P3Activity[]) => (
    <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 28 }}>
      {items.map((a, i) => (
        <View key={a.id} style={{ width: cellWidth(columns) }}>
          <PosterCard wide index={i} activity={a} done={data.doneIds.has(a.id)} onPress={() => nav.fiche(a.id)} line={renderOpener(a, a.base_duration, ctx.band)} />
        </View>
      ))}
    </View>
  );
  const section = (icon: 'star' | 'flag', title: string, items: P3Activity[], empty: string) => (
    <View style={{ marginTop: 32 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(249,235,80,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <WIcon name={icon} size={18} color={w.accentInk} strokeWidth={2.2} />
        </View>
        <WText display size={22} weight={600} tone="ink" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </WText>
        <WText size={14} weight={600} tone="soft">
          {String(items.length)}
        </WText>
      </View>
      {items.length ? (
        grid(items)
      ) : (
        <NcCard style={{ marginTop: 14 }}>
          <WText size={15} lh={1.5} tone="soft">
            {empty}
          </WText>
        </NcCard>
      )}
    </View>
  );
  return (
    <View>
      <BackLink label="Maison" onPress={nav.back} />
      <Title>Mes favoris</Title>
      <WText size={15} tone="soft" style={{ marginTop: 6 }}>
        {`Les activités que tu veux garder sous la main pour ${firstName}.`}
      </WText>
      {section('star', 'Favoris', favoris, 'Touche ☆ Favori sur une fiche, ou le + pendant l’activité, pour la retrouver ici.')}
      {section('flag', 'Mis de côté', deCote, 'Touche ⚑ De côté pour garder une activité pour plus tard : elle ne te sera plus proposée le soir en attendant.')}
    </View>
  );
}

/* ───────────────────────────── Le programme ───────────────────────────── */

const PHASE_LABEL = { ANCRER: 'Ancrer', DEVELOPPER: 'Développer', INTEGRER: 'Intégrer' } as const;
type Shelf = 'tout' | 'voiture' | 'non' | 'epuise' | 'preferees' | 'de_cote' | 'favoris';
const SHELVES: { value: Shelf; label: string }[] = [
  { value: 'tout', label: 'J’ai 10 minutes' },
  { value: 'voiture', label: 'Dans la voiture' },
  { value: 'non', label: 'Quand il dit non' },
  { value: 'epuise', label: 'Quand je suis épuisé' },
  { value: 'preferees', label: 'Ses préférées' },
  { value: 'de_cote', label: 'Mis de côté' },
  { value: 'favoris', label: 'Favoris' },
];

const programmeMemory = new Map<string, number | null>();

function FicheRow({ a, done, onPress }: { a: P3Activity; done: boolean; onPress: () => void }) {
  const w = useWeb();
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={`${a.title}${done ? ', déjà vécue' : ''}`}>
      <NcRow style={{ minHeight: 64, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: done ? w.accent : 'transparent', borderWidth: done ? 0 : 1, borderColor: w.line2 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>{`${a.programme === 'complement' ? 'Pour aller plus loin · ' : ''}${ROLE_LABELS[a.role]}`}</Eyebrow>
          <WText size={16} weight={600} tone="ink">
            {a.title}
          </WText>
          <WText size={14} tone="soft" style={{ marginTop: 2 }}>
            {a.objective}
          </WText>
          <WText size={13} tone="faint" style={{ marginTop: 4 }}>{`${a.durations.join(' · ')} min`}</WText>
        </View>
        <WIcon name="chevron-right" size={20} color={w.text3} />
      </NcRow>
    </Tap>
  );
}

export function Programme({ ctx }: { ctx: MaisonCtx }) {
  const w = useWeb();
  const nav = useMaisonNav(ctx);
  const { data } = ctx;
  const [openDetail, setOpenDetailState] = useState<number | null>(programmeMemory.get(ctx.child.id) ?? null);
  const setOpenDetail = (n: number | null) => {
    programmeMemory.set(ctx.child.id, n);
    setOpenDetailState(n);
  };
  const [whyOpen, setWhyOpen] = useState(false);
  const [shelf, setShelf] = useState<Shelf>('tout');
  const pool = useMemo(() => p3Pool(), []);

  const lastRating = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const x of data.moments) if (!m.has(x.activity_id)) m.set(x.activity_id, x.rating);
    return m;
  }, [data.moments]);

  const library = useMemo(() => {
    const open = pool.filter((a) => isVisible(a, data.openWeek));
    switch (shelf) {
      case 'voiture':
        return open.filter((a) => a.car_ok);
      case 'non':
        return open.filter((a) => a.anti_refusal);
      case 'epuise':
        return open.filter((a) => a.parent_energy === 'basse');
      case 'preferees':
        return open.filter((a) => (lastRating.get(a.id) ?? 0) >= 4);
      case 'de_cote':
        return open.filter((a) => data.saved.deCote.has(a.id));
      case 'favoris':
        return open.filter((a) => data.saved.favoris.has(a.id));
      default:
        return open;
    }
  }, [pool, shelf, lastRating, data.saved, data.openWeek]);

  const detail = openDetail ? P3_WEEKS.find((x) => x.week === openDetail) : null;
  const open = (a: P3Activity) => nav.fiche(a.id);

  return (
    <View>
      <BackLink label="Maison" onPress={nav.back} />
      <Title>Le programme</Title>
      <WText size={15} tone="soft" style={{ marginTop: 4 }}>{`13 semaines, trois moments par semaine, avec ${ctx.firstName}.`}</WText>

      {detail ? (
        <FadeUp key={detail.week} style={{ marginTop: 24 }}>
          <Pressable onPress={() => setOpenDetail(null)} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
            <WIcon name="chevron-left" size={16} color={w.text3} />
            <WText size={15} weight={600} tone="soft">
              Les 13 semaines
            </WText>
          </Pressable>
          <Eyebrow style={{ marginTop: 12 }}>{`Semaine ${detail.week} · ${PHASE_LABEL[detail.phase]}`}</Eyebrow>
          <WText display size={28} weight={600} tone="ink" style={{ marginTop: 4 }} accessibilityRole="header">
            {detail.title}
          </WText>
          <WText display size={24} lh={1.3} tone="ink" style={{ marginTop: 16 }}>
            {detail.opening_line}
          </WText>
          <View style={{ marginTop: 16, gap: 12 }}>
            {detail.intro.map((p, i) => (
              <WText key={i} size={16} lh={1.6} tone="body">
                {p}
              </WText>
            ))}
          </View>
          <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 }}>
            {detail.pillars.map((p) => (
              <PillarTag key={p} pillar={p} />
            ))}
          </View>
          <Pressable onPress={() => setWhyOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: whyOpen }} style={{ marginTop: 16, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <WText size={14} weight={600} tone="accent">
              Pourquoi cette semaine
            </WText>
          </Pressable>
          {whyOpen ? (
            <View style={{ gap: 4 }}>
              <WText size={14} lh={1.55} tone="soft">
                {plainSession(detail.session_source)}
              </WText>
              <WText size={14} lh={1.55} tone="soft">
                {[plainAction(detail.action), detail.skill].filter(Boolean).join(' · ')}
              </WText>
              <WText size={14} lh={1.55} tone="soft">
                {detail.foundation}
              </WText>
            </View>
          ) : null}
          <View style={{ marginTop: 24, gap: 12 }}>
            {activitiesOfWeek(detail.week)
              .filter((a) => pool.some((p) => p.id === a.id))
              .map((a) => (
                <FicheRow key={a.id} a={a} done={data.doneIds.has(a.id)} onPress={() => open(a)} />
              ))}
          </View>
          {(() => {
            const extra = complementsOfWeek(detail.week).filter((a) => pool.some((p) => p.id === a.id));
            if (!extra.length) return null;
            const isOpen = isVisible(extra[0], data.openWeek);
            return (
              <View style={{ marginTop: 32 }}>
                <Eyebrow>Pour aller plus loin cette semaine</Eyebrow>
                <WText size={14} tone="soft" style={{ marginTop: 4, marginBottom: 12 }}>
                  {isOpen ? 'Jamais obligatoires : les trois fiches du dessus suffisent pour passer à la suite.' : 'Ils s’ouvriront avec cette semaine.'}
                </WText>
                {isOpen ? (
                  <View style={{ gap: 12 }}>
                    {extra.map((a) => (
                      <FicheRow key={a.id} a={a} done={data.doneIds.has(a.id)} onPress={() => open(a)} />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })()}
        </FadeUp>
      ) : (
        <>
          <View style={{ marginTop: 24, gap: 10 }}>
            {P3_WEEKS.map((wk) => {
              const current = wk.week === data.openWeek;
              const acts = activitiesOfWeek(wk.week);
              const done = acts.filter((a) => data.doneIds.has(a.id)).length;
              return (
                <Tap key={wk.week} onPress={() => setOpenDetail(wk.week)} accessibilityRole="button" accessibilityLabel={`Semaine ${wk.week} : ${wk.title}. ${done} sur 3 déjà vécues`}>
                  <NcRow ring={current ? w.accentLine : undefined} style={{ minHeight: 64, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <WText display size={20} weight={600} tone="accent" style={{ width: 32 }}>
                      {String(wk.week)}
                    </WText>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Eyebrow>{`${PHASE_LABEL[wk.phase]}${current ? ' · conseillée maintenant' : ''}`}</Eyebrow>
                      <WText size={16} weight={600} tone="ink">
                        {wk.title}
                      </WText>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {acts.map((a) => (
                        <View key={a.id} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: data.doneIds.has(a.id) ? w.accent : 'transparent', borderWidth: data.doneIds.has(a.id) ? 0 : 1, borderColor: w.line2 }} />
                      ))}
                    </View>
                  </NcRow>
                </Tap>
              );
            })}
          </View>

          {(() => {
            const bonus = bonusActivities().filter((a) => pool.some((p) => p.id === a.id) && isVisible(a, data.openWeek));
            if (!bonus.length) return null;
            return (
              <View style={{ marginTop: 40 }}>
                <Eyebrow style={{ marginBottom: 4 }}>Bonus · hors programme</Eyebrow>
                <WText size={14} tone="soft" style={{ marginBottom: 12 }}>
                  Pour le week-end, en famille. Ils ne débloquent rien.
                </WText>
                <View style={{ gap: 12 }}>
                  {bonus.map((a) => (
                    <FicheRow key={a.id} a={a} done={data.doneIds.has(a.id)} onPress={() => open(a)} />
                  ))}
                </View>
              </View>
            );
          })()}

          <View style={{ marginTop: 40 }}>
            <Eyebrow style={{ marginBottom: 12 }}>La bibliothèque</Eyebrow>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {SHELVES.map((s) => (
                <NcPill key={s.value} label={s.label} on={shelf === s.value} onPress={() => setShelf(s.value)} />
              ))}
            </ScrollView>
            <View style={{ marginTop: 20, gap: 12 }}>
              {library.map((a) => (
                <FicheRow key={a.id} a={a} done={data.doneIds.has(a.id)} onPress={() => open(a)} />
              ))}
              {library.length === 0 ? (
                <WText size={15} tone="soft" style={{ paddingVertical: 24 }}>
                  Ce rayon se remplira au fil des semaines.
                </WText>
              ) : null}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

/* ───────────────────────────── Le carnet ───────────────────────────── */

type Entry = { at: string; moment?: P3MomentRow; reward?: P3RewardRow };

/** Quand l'objet arrive, dit simplement (jamais un compte à rebours). */
function unlockLine(t: (typeof REWARDS)[number]['trigger']): string {
  switch (t.kind) {
    case 'week_complete':
      return `Il s’ouvre à la fin de la semaine ${t.week}`;
    case 'activity_done':
      return `Il s’ouvre après « ${getActivity(t.activity)?.title ?? 'l’activité'} »`;
    case 'moments':
      return `Il s’ouvre après ${t.count} moments`;
    default:
      return `Il s’ouvre après ${t.months} mois avec THRIVE Maison`;
  }
}

export function rewardTitle(id: RewardId, firstName: string): string {
  const r = REWARDS.find((x) => x.id === id);
  return r ? fill(r.label, { prenom: firstName }) : '';
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function Carnet({ ctx }: { ctx: MaisonCtx }) {
  const w = useWeb();
  const nav = useMaisonNav(ctx);
  const { data, firstName } = ctx;

  const entries = useMemo<Entry[]>(() => {
    const visibleRewards = data.rewardRows.filter((r) => REWARDS.find((x) => x.id === r.reward_id)?.available);
    return [
      ...data.carnet.map((m) => ({ at: m.created_at, moment: m })),
      ...visibleRewards.map((r) => ({ at: r.earned_at, reward: r })),
    ].sort((a, b) => b.at.localeCompare(a.at));
  }, [data.carnet, data.rewardRows]);

  const earned = new Set(data.rewardRows.map((r) => r.reward_id));
  const objets = REWARDS.filter((r) => r.available);

  return (
    <View>
      <BackLink label="Maison" onPress={nav.back} />
      <WText display size={36} weight={500} lh={1.05} tone="ink" style={{ marginTop: 8 }} accessibilityRole="header">
        {'Le carnet de '}
        <WText display italic size={36} weight={500} lh={1.05} tone="ink">
          {firstName}
        </WText>
      </WText>

      {entries.length === 0 ? (
        <NcCard style={{ marginTop: 24 }}>
          <WText size={17} lh={1.5} tone="ink">
            Le carnet se remplit tout seul, moment après moment.
          </WText>
          <LaunchButton label="La carte du soir" icon="arrow-right" height={48} fontSize={16} onPress={nav.home} style={{ marginTop: 16, alignSelf: 'flex-start' }} />
        </NcCard>
      ) : (
        <View style={{ marginTop: 28, gap: 20 }}>
          {entries.map((e, n) =>
            e.moment ? (
              <View key={`m-${e.moment.activity_id}-${e.at}`} style={{ transform: [{ rotate: n % 2 ? '0.5deg' : '-0.4deg' }] }}>
                <Paper laid radius={22} padding={14}>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    {vignetteSource(e.moment.activity_id) ? (
                      <Image source={vignetteSource(e.moment.activity_id)!} style={{ width: 88, height: 88, borderRadius: 13, backgroundColor: '#EFE9DF' }} />
                    ) : null}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <WText display italic size={14} color={w.paperInk}>
                        {capitalize(formatLongDate(e.at))}
                      </WText>
                      <WText size={15} weight={700} color="#022539" style={{ marginTop: 2 }}>
                        {getActivity(e.moment.activity_id)?.title ?? ''}
                      </WText>
                      {e.moment.kept_phrase ? (
                        <WText display size={19} lh={1.3} color="#022539" style={{ marginTop: 8 }}>{`« ${e.moment.kept_phrase} »`}</WText>
                      ) : null}
                      {captureItems(e.moment.capture).length > 0 ? (
                        <View style={{ marginTop: 8, gap: 4 }}>
                          {captureItems(e.moment.capture).map((c, i) => (
                            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                              <View style={{ width: 8, height: 8, marginTop: 8, borderRadius: 4, backgroundColor: '#A7C4BC' }} />
                              <WText size={15} color="#33454F" style={{ flex: 1 }}>
                                {c}
                              </WText>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Paper>
              </View>
            ) : e.reward ? (
              <View key={`r-${e.reward.reward_id}`}>
                <WText display italic size={14} tone="soft" style={{ marginBottom: 8 }}>
                  {capitalize(formatLongDate(e.at))}
                </WText>
                <Tap onPress={() => nav.objet(e.reward!.reward_id)} accessibilityRole="button" accessibilityLabel={rewardTitle(e.reward.reward_id, firstName)}>
                  <Paper radius={22} padding={18} framed>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <StarBadge />
                      <View style={{ flex: 1 }}>
                        <WText size={11} weight={700} upper tracking={0.12} color={w.paperInk}>
                          Débloqué
                        </WText>
                        <WText display size={20} weight={500} lh={1.2} color="#022539">
                          {rewardTitle(e.reward.reward_id, firstName)}
                        </WText>
                      </View>
                      <WIcon name="chevron-right" size={20} color="#56626B" />
                    </View>
                  </Paper>
                </Tap>
              </View>
            ) : null,
          )}
        </View>
      )}

      <View style={{ marginTop: 56 }}>
        <Eyebrow>Ce qu’on garde</Eyebrow>
        <WText display size={28} weight={500} tone="ink" style={{ marginTop: 6 }} accessibilityRole="header">{`Les objets de ${firstName}`}</WText>
        <View style={{ marginTop: 20, gap: 12 }}>
          {objets.map((r) =>
            earned.has(r.id) ? (
              <Tap key={r.id} onPress={() => nav.objet(r.id)} accessibilityRole="button" accessibilityLabel={`${rewardTitle(r.id, firstName)}, gagné, à ouvrir`}>
                <Paper radius={22} padding={0}>
                  <View style={{ minHeight: 76, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <StarBadge />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <WText display size={19} weight={500} lh={1.2} color="#022539">
                        {rewardTitle(r.id, firstName)}
                      </WText>
                      <WText size={13} color="#56626B" style={{ marginTop: 2 }}>
                        Gagné · à ouvrir
                      </WText>
                    </View>
                    <WIcon name="chevron-right" size={20} color="#56626B" />
                  </View>
                </Paper>
              </Tap>
            ) : (
              <View key={r.id} style={{ minHeight: 72, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: w.line2, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: w.chip, alignItems: 'center', justifyContent: 'center' }}>
                  <WIcon name="lock" size={18} color={w.text4} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <WText size={15} weight={600} tone="body">
                    {rewardTitle(r.id, firstName)}
                  </WText>
                  <WText size={13} tone="soft" style={{ marginTop: 2 }}>{`${unlockLine(r.trigger)}${r.bonus ? ` · ${r.bonus}` : ''}`}</WText>
                </View>
              </View>
            ),
          )}
        </View>
      </View>
    </View>
  );
}

/** `.maison-star` de 44 px (émail jaune, étoile pleine). */
function StarBadge() {
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F9EB50', alignItems: 'center', justifyContent: 'center', shadowColor: '#F9EB50', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } }}>
      <WIcon name="star" size={22} color="#022539" strokeWidth={1.7} filled />
    </View>
  );
}

/* ───────────────────────────── Quand il dit non ───────────────────────────── */

export function PageNon({ ctx }: { ctx: MaisonCtx }) {
  const w = useWeb();
  const nav = useMaisonNav(ctx);
  const [others, setOthers] = useState(false);
  const mine = PAGE_NON.byAge.find((b) => b.band === ctx.band) ?? PAGE_NON.byAge[0];
  const rest = PAGE_NON.byAge.filter((b) => b !== mine);
  const soft = useMemo(
    () =>
      pickTonight({
        firstName: ctx.firstName, band: ctx.band, declaredDuration: 10, place: 'maison', parentEnergy: null, childMood: null,
        moments: ctx.data.moments, consecutiveRefusals: 2, now: new Date(), pool: p3Pool(),
      }),
    [ctx.firstName, ctx.band, ctx.data.moments],
  );

  return (
    <View>
      <BackLink label="Maison" onPress={nav.back} />
      <Title>{PAGE_NON.title}</Title>
      <WText size={17} lh={1.55} tone="body" style={{ marginTop: 12 }}>
        {PAGE_NON.intro}
      </WText>

      <NcCard style={{ marginTop: 24 }}>
        <Eyebrow>{`${mine.band} ans`}</Eyebrow>
        <WText size={16} lh={1.55} tone="ink" style={{ marginTop: 8 }}>
          {mine.text}
        </WText>
      </NcCard>
      <Pressable onPress={() => setOthers((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: others }} style={{ marginTop: 12, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
        <WText size={14} weight={600} tone="accent">
          Les autres âges
        </WText>
      </Pressable>
      {others ? (
        <View style={{ gap: 12 }}>
          {rest.map((b) => (
            <NcRow key={b.band} style={{ padding: 16 }}>
              <Eyebrow>{`${b.band} ans`}</Eyebrow>
              <WText size={15} lh={1.55} tone="body" style={{ marginTop: 6 }}>
                {b.text}
              </WText>
            </NcRow>
          ))}
        </View>
      ) : null}

      {[PAGE_NON.worse, PAGE_NON.works].map((block) => (
        <View key={block.title} style={{ marginTop: 32 }}>
          <Eyebrow style={{ marginBottom: 12 }}>{block.title}</Eyebrow>
          <View style={{ gap: 8 }}>
            {block.items.map((it) => (
              <View key={it} style={{ flexDirection: 'row', gap: 8 }}>
                <WText size={16} tone="accent">
                  —
                </WText>
                <WText size={16} lh={1.5} tone="body" style={{ flex: 1 }}>
                  {it}
                </WText>
              </View>
            ))}
          </View>
        </View>
      ))}

      <WText display size={28} lh={1.25} tone="ink" style={{ marginTop: 40 }}>
        {PAGE_NON.exitLine}
      </WText>
      <WText size={15} tone="soft" style={{ marginTop: 8 }}>
        {PAGE_NON.exitNote}
      </WText>

      {soft ? (
        <Tap
          onPress={() => nav.fiche(soft.activity.id)}
          accessibilityRole="link"
          accessibilityLabel={PAGE_NON.ctaSoft}
          style={{ marginTop: 32, alignSelf: 'flex-start', minHeight: 52, paddingHorizontal: 24, borderRadius: 26, borderWidth: 1, borderColor: w.line2, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <WText size={15} weight={600} tone="ink">
            {PAGE_NON.ctaSoft}
          </WText>
          <WIcon name="arrow-right" size={16} color={w.text} />
        </Tap>
      ) : null}
    </View>
  );
}

/* ───────────────────────────── Les sources ───────────────────────────── */

const LEVEL_NOTE =
  'Niveau A : fondé sur des études solides. Niveau B : adaptation THRIVE cohérente avec la recherche. Niveau C : choix pédagogique de terrain.';

export function Sources({ ctx }: { ctx: MaisonCtx }) {
  const nav = useMaisonNav(ctx);
  const sources = useMemo(() => {
    const map = new Map<string, { citation: string; level: string; fiches: { id: string; title: string }[] }>();
    for (const a of p3Pool()) {
      for (const s of a.sources) {
        const entry = map.get(s.citation) ?? { citation: s.citation, level: s.level, fiches: [] };
        if (!entry.fiches.some((f) => f.id === a.id)) entry.fiches.push({ id: a.id, title: a.title });
        map.set(s.citation, entry);
      }
    }
    return [...map.values()].sort((x, y) => x.citation.localeCompare(y.citation, 'fr'));
  }, []);

  return (
    <View>
      <BackLink label="Maison" onPress={nav.back} />
      <Title>{SOURCES_PAGE_TITLE}</Title>
      <WText size={14} lh={1.5} tone="soft" style={{ marginTop: 12 }}>
        {LEVEL_NOTE}
      </WText>
      <View style={{ marginTop: 24, gap: 12 }}>
        {sources.map((s) => (
          <NcRow key={s.citation} style={{ padding: 16 }}>
            <WText size={15} lh={1.5} tone="ink">
              {s.citation}
            </WText>
            <WText size={13} tone="soft" style={{ marginTop: 4 }}>{`Niveau ${s.level}`}</WText>
            <WText size={13} tone="faint" style={{ marginTop: 8 }}>
              {s.fiches.map((f, i) => (
                <WText key={f.id} size={13} tone="faint">
                  {i > 0 ? ' · ' : ''}
                  <WText size={13} tone="faint" style={{ textDecorationLine: 'underline' }} onPress={() => nav.fiche(f.id)}>
                    {f.title}
                  </WText>
                </WText>
              ))}
            </WText>
          </NcRow>
        ))}
      </View>
      <WText size={13} lh={1.5} tone="faint" style={{ marginTop: 40 }}>
        {TERMS_LINE}
      </WText>
    </View>
  );
}
