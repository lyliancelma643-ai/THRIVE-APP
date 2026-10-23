// ─────────────────────────────────────────────────────────────────────────────
// Accueil « Maison », portage fidèle de apps/web/src/app/parent/(hub)/fitness/page.tsx.
// Le parent fatigué de 19 h 15 lance un moment en 1 tap (l'affiche du soir, pickTonight), ou choisit librement
// dans les rangées et le catalogue — jamais plus de 3 taps. Anti-culpabilité (R3) : compteur cumulatif d'abord,
// aucun « 0 », aucun mot de manque. Tout texte de fiche vient du JSON partagé (R1).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { Paper } from '../../../design';
import {
  AccentButton, Eyebrow, FadeUp, GhostButton, LaunchButton, MoreLink, NcCard, PillGroup, Tap, WIcon, WText, useWeb,
} from '../../../design/web';
import {
  BILAN_4_SEMAINES, DEFAULT_OPENER, DURATIONS, DURATION_WORDS, PAGE_NON, PLACE_CHOICES, REWARDS, ROLE_LABELS, TERMS_LINE,
  buildShelves, captureText, effectiveDuration, fill, formatLongDate, getActivity, getWeek, isVisible, p3Pool, pickTonight,
  type Duration, type P3Activity, type RewardId,
} from '../../../lib/p3web';
import {
  addRefusal, excludeTonight, popWeekDone, readEvening, readFlag, readLocalJSON, readPrefDuration, writeFlag, writeLocalJSON,
  writePrefDuration, type Evening,
} from '../session';
import type { MaisonCtx } from './MaisonFrame';
import { useMaisonNav } from './nav';
import { ActivityArch, Door, HeroMenu, LinkRow, PosterRow, ShelfPicker, TonightSettings, WeekCard } from './parts';

type PlaceChoice = (typeof PLACE_CHOICES)[number]['id'];

// ── E10 — Onboarding ─────────────────────────────────────────────────────────
function Onboarding({ firstName, onDone, onNon }: { firstName: string; onDone: () => void; onNon: () => void }) {
  const [i, setI] = useState(0);
  const screens = [
    <View key="0">
      <WText display size={32} weight={600} lh={1.15} tone="ink">{`13 semaines. 10 minutes. Toi et ${firstName}.`}</WText>
      <WText size={17} lh={1.55} tone="body" style={{ marginTop: 16 }}>
        Chaque semaine reprend une étape de la Méthode THRIVE. Tu n’as rien à préparer et rien à évaluer.
      </WText>
    </View>,
    <View key="1">
      <WText display size={28} lh={1.25} tone="ink">{`« ${fill(DEFAULT_OPENER, { duree: DURATION_WORDS[10] })} »`}</WText>
      <WText size={17} lh={1.55} tone="body" style={{ marginTop: 16 }}>
        Voilà la phrase qui ouvre tout. Tu la diras souvent.
      </WText>
    </View>,
    <View key="2">
      <WText display size={28} weight={600} lh={1.2} tone="ink">
        Et s’il dit non ?
      </WText>
      <WText size={17} lh={1.55} tone="body" style={{ marginTop: 16 }}>
        {PAGE_NON.intro}
      </WText>
      <WText size={17} lh={1.55} tone="ink" style={{ marginTop: 8 }}>
        {PAGE_NON.exitLine}
      </WText>
      <Pressable onPress={onNon} accessibilityRole="link" style={{ marginTop: 16, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
        <WText size={15} weight={600} tone="accent" style={{ textDecorationLine: 'underline' }}>
          {PAGE_NON.title}
        </WText>
      </Pressable>
    </View>,
    <View key="3">
      <WText display size={28} weight={600} lh={1.2} tone="ink">
        Il n’y a ni retard, ni série à défendre. Trois moments par semaine, c’est déjà réussi.
      </WText>
      <WText size={13} lh={1.5} tone="faint" style={{ marginTop: 24 }}>
        {TERMS_LINE}
      </WText>
    </View>,
  ];
  const last = i === screens.length - 1;
  return (
    <FadeUp key={i} style={{ paddingVertical: 32 }}>
      <Eyebrow style={{ marginBottom: 16 }}>{`Maison · ${i + 1} / ${screens.length}`}</Eyebrow>
      {screens[i]}
      <View style={{ marginTop: 40, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <AccentButton label={last ? 'Commencer la semaine 1' : 'Suivant'} height={56} onPress={() => (last ? onDone() : setI(i + 1))} style={{ paddingHorizontal: 32 }} />
        {!last ? (
          <Pressable onPress={onDone} accessibilityRole="button" hitSlop={8} style={{ minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' }}>
            <WText size={15} weight={600} tone="soft">
              Passer
            </WText>
          </Pressable>
        ) : null}
      </View>
    </FadeUp>
  );
}

// ── Bilan court à 4 semaines (ressenti, jamais un score — gardé sur l'appareil) ──
function Bilan4Semaines({ ctx }: { ctx: MaisonCtx }) {
  const w = useWeb();
  const key = `thrive.p3.bilan4.${ctx.child.id}`;
  const [state, setState] = useState<'hidden' | 'closed' | 'open'>('hidden');
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [feeling, setFeeling] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const first = ctx.data.firstMomentAt;
    const due = !!first && Date.now() - new Date(first).getTime() >= 28 * 864e5;
    readLocalJSON<unknown>(key, null).then((v) => alive && setState(due && !v ? 'closed' : 'hidden'));
    return () => {
      alive = false;
    };
  }, [ctx.data.firstMomentAt, key]);

  if (state === 'hidden') return null;
  const close = (payload: unknown) => {
    writeLocalJSON(key, payload);
    setState('hidden');
  };
  return (
    <NcCard style={{ marginTop: 32 }}>
      <Eyebrow>Pour toi</Eyebrow>
      <WText display size={21} weight={600} tone="ink" style={{ marginTop: 4 }}>
        {fill(BILAN_4_SEMAINES.title, { prenom: ctx.firstName })}
      </WText>
      {state === 'closed' ? (
        <View style={{ marginTop: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <AccentButton label="Répondre" height={44} onPress={() => setState('open')} />
          <Pressable onPress={() => close({ dismissed_at: new Date().toISOString() })} accessibilityRole="button" style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
            <WText size={15} weight={600} tone="soft">
              Plus tard
            </WText>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          <WText size={15} tone="soft">
            {BILAN_4_SEMAINES.intro}
          </WText>
          {BILAN_4_SEMAINES.questions.map((q, i) => (
            <View key={i} style={{ marginTop: 20 }}>
              <WText size={16} tone="ink">
                {fill(q, { prenom: ctx.firstName })}
              </WText>
              <TextInput
                value={answers[i]}
                onChangeText={(t) => setAnswers((a) => a.map((x, j) => (j === i ? t : x)))}
                multiline
                maxLength={800}
                accessibilityLabel={fill(q, { prenom: ctx.firstName })}
                style={{
                  marginTop: 8, minHeight: 64, borderRadius: 16, backgroundColor: w.field, borderWidth: 1, borderColor: w.line2, padding: 12,
                  fontSize: 15, color: w.text, textAlignVertical: 'top',
                }}
              />
            </View>
          ))}
          <WText size={16} tone="ink" style={{ marginTop: 24 }}>
            {fill(BILAN_4_SEMAINES.guiltScale.label, { prenom: ctx.firstName })}
          </WText>
          <PillGroup
            style={{ marginTop: 12 }}
            value={feeling ?? ''}
            options={BILAN_4_SEMAINES.guiltScale.options.map((o) => ({ value: o, label: o }))}
            onChange={(v) => setFeeling(v)}
          />
          <WText size={13} tone="soft" style={{ marginTop: 12 }}>
            {BILAN_4_SEMAINES.guiltScale.note}
          </WText>
          <AccentButton label="Garder" onPress={() => close({ answered_at: new Date().toISOString(), answers, feeling })} style={{ marginTop: 24, alignSelf: 'flex-start' }} />
        </View>
      )}
    </NcCard>
  );
}

// ── E1 — Accueil ─────────────────────────────────────────────────────────────
const SITUATION_SHELVES: Record<string, string> = {
  rien: 'Rien à préparer',
  a_plat: 'Soir à plat',
  non: 'Il dit non',
  voiture: 'En voiture',
  bouger: 'Bouger',
  trente: '30 minutes',
  bonus: 'Week-end',
};

function Home({ ctx }: { ctx: MaisonCtx }) {
  const w = useWeb();
  const nav = useMaisonNav(ctx);
  const { width: screen } = useWindowDimensions();
  const { data, firstName, child } = ctx;
  const [duration, setDuration] = useState<Duration>(10);
  const [place, setPlace] = useState<PlaceChoice>('maison');
  const [evening, setEvening] = useState<Evening>(() => readEvening(child.id));
  const [menu, setMenu] = useState(false);
  const [weekDone, setWeekDone] = useState<number | null>(null);

  useEffect(() => {
    setEvening(readEvening(child.id));
    setWeekDone(popWeekDone(child.id));
    let alive = true;
    readPrefDuration().then((d) => alive && setDuration((data.lastDuration as Duration | null) ?? d ?? 10));
    return () => {
      alive = false;
    };
    // Préférences de départ : lues une fois à l'arrivée sur l'écran.
  }, [child.id]);

  const chooseDuration = (d: Duration) => {
    setDuration(d);
    writePrefDuration(d);
  };

  const all = useMemo(() => p3Pool(), []);
  const catalogueCount = useMemo(() => all.filter((x) => isVisible(x, data.openWeek)).length, [all, data.openWeek]);
  const pool = useMemo(() => all.filter((a) => !evening.excluded.includes(a.id) && !data.saved.deCote.has(a.id)), [all, evening.excluded, data.saved.deCote]);

  const pick = useMemo(
    () =>
      pickTonight({
        firstName, band: ctx.band, declaredDuration: duration, place, parentEnergy: null, childMood: null,
        moments: data.moments, consecutiveRefusals: evening.refusals, now: new Date(), pool,
      }),
    [firstName, ctx.band, duration, place, data.moments, evening.refusals, pool],
  );

  const firstMoment = data.count === 0;
  const a = pick?.activity ?? null;

  const lastRating = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const x of data.moments) if (!m.has(x.activity_id)) m.set(x.activity_id, x.rating);
    return m;
  }, [data.moments]);

  const shelves = useMemo(
    () =>
      buildShelves({
        pool: all, firstName, openWeek: data.openWeek, doneIds: data.doneIds, lastRating, favoris: data.saved.favoris,
        deCote: data.saved.deCote, now: new Date(), heroId: a?.id ?? null,
      }),
    [all, firstName, data.openWeek, data.doneIds, lastRating, data.saved, a?.id],
  );

  const favourite = useMemo(() => {
    const five = data.moments.find((m) => m.rating === 5);
    return five ? getActivity(five.activity_id) : null;
  }, [data.moments]);

  const doneWeek = weekDone ? getWeek(weekDone) : null;
  const doneUnlock = doneWeek?.unlocks && data.rewards.has(doneWeek.unlocks as RewardId) ? (doneWeek.unlocks as RewardId) : null;

  const skip = async (kind: 'PAS_LE_TEMPS' | 'DE_COTE' | 'REFUS_ENFANT') => {
    if (!a) return;
    setMenu(false);
    if (kind === 'DE_COTE') {
      await data.toggleSaved(a.id, 'DE_COTE');
      return;
    }
    if (kind === 'REFUS_ENFANT') setEvening(addRefusal(child.id, a.id));
    else setEvening(excludeTonight(child.id, a.id));
    await data.recordSkip(a.id, kind);
  };

  const openFiche = (x: P3Activity) => nav.fiche(x.id, { duree: duration, lieu: place });
  const isDone = (x: P3Activity) => data.doneIds.has(x.id);
  const archW = Math.min(312, Math.round(screen * 0.82));

  return (
    <View>
      {doneWeek ? (
        <FadeUp style={{ marginBottom: 20 }}>
          <NcCard ring={w.accentLine}>
            <WText display size={20} weight={600} tone="ink">{`Semaine ${doneWeek.week} complète.`}</WText>
            {doneUnlock ? (
              <MoreLink label={fill(REWARDS.find((r) => r.id === doneUnlock)!.label, { prenom: firstName })} onPress={() => nav.objet(doneUnlock)} arrow="arrow-right" />
            ) : null}
          </NcCard>
        </FadeUp>
      ) : null}

      {/* L'AFFICHE DU SOIR — la recommandation, lançable en un tap */}
      {a && pick ? (
        <FadeUp>
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <Pressable
              onPress={() => (menu ? setMenu(false) : openFiche(a))}
              accessibilityRole="button"
              accessibilityLabel={`${a.title}. Recommandé pour ${firstName}. Ouvrir la fiche`}
              style={{ alignItems: 'center', width: '100%' }}
            >
              <ActivityArch activityId={a.id} width={archW} style={{ marginTop: 36 }} />
              <View style={{ marginTop: 28, alignItems: 'center', width: '100%' }}>
                <WText size={12} weight={700} upper tracking={0.16} tone="sage" center>
                  {`Recommandé pour ${firstName} · ${ROLE_LABELS[a.role]}`}
                </WText>
                <WText display size={35} weight={500} lh={1.03} tone="ink" center style={{ marginTop: 12 }}>
                  {a.title}
                </WText>
                <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: 310 }}>
                  <View style={{ marginTop: 3 }}>
                    <WIcon name="sparkle" size={16} color={w.sageInk} />
                  </View>
                  <WText size={15} weight={500} lh={1.45} tone="body" style={{ flexShrink: 1 }}>
                    {pick.reason}
                  </WText>
                </View>
                <WText size={13} tone="soft" center style={{ marginTop: 10 }}>
                  {`${Math.min(duration, Math.max(...a.durations))} min · ${a.materials.length ? a.materials.join(', ') : 'Rien à préparer'} · Énergie : ${a.parent_energy}`}
                </WText>
              </View>
            </Pressable>
            <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 440 }}>
              <LaunchButton label="Lancer" onPress={() => nav.launch(a.id, effectiveDuration(a, duration) ?? a.base_duration, place)} style={{ flex: 1.5 }} />
              <GhostButton label="Voir la fiche" onPress={() => openFiche(a)} style={{ flex: 1 }} />
            </View>
            <HeroMenu
              open={menu}
              onToggle={() => setMenu((m) => !m)}
              options={[
                { id: 'PAS_LE_TEMPS', label: 'Pas ce soir', onPress: () => skip('PAS_LE_TEMPS') },
                { id: 'DE_COTE', label: 'Mettre de côté', onPress: () => skip('DE_COTE') },
                { id: 'REFUS_ENFANT', label: `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)} ne veut pas`, onPress: () => skip('REFUS_ENFANT') },
              ]}
            />
          </View>
        </FadeUp>
      ) : (
        <NcCard>
          {favourite ? (
            <WText size={17} lh={1.5} tone="ink">
              {`Rien de nouveau pour ${place === 'voiture' ? 'ce trajet' : 'ce soir'}. Tu refais `}
              <WText size={17} weight={600} tone="accent" style={{ textDecorationLine: 'underline' }} onPress={() => openFiche(favourite)}>
                {`“${favourite.title}”`}
              </WText>
              {' ?'}
            </WText>
          ) : (
            <WText size={17} lh={1.5} tone="ink">{`Rien de nouveau pour ${place === 'voiture' ? 'ce trajet' : 'ce soir'}. Choisis librement ci-dessous.`}</WText>
          )}
        </NcCard>
      )}

      {firstMoment ? (
        <WText size={16} tone="body" style={{ marginTop: 16 }}>{`« ${fill(DEFAULT_OPENER, { duree: DURATION_WORDS[duration] })} »`}</WText>
      ) : null}

      {/* Ce soir : temps et lieu — une seule puce, règle l'affiche et les liens de toutes les rangées */}
      <View style={{ marginTop: 24, alignItems: 'center' }}>
        <TonightSettings
          duration={duration}
          durations={DURATIONS}
          onDuration={chooseDuration}
          place={place}
          places={PLACE_CHOICES.map((p) => ({ value: p.id, label: p.label }))}
          onPlace={(p) => setPlace(p as PlaceChoice)}
        />
      </View>
      {place === 'voiture' ? (
        <WText size={14} tone="soft" center style={{ marginTop: 8 }}>
          À lire avant de partir. Pendant la route, tout se fait à voix haute.
        </WText>
      ) : null}

      {evening.refusals >= 2 ? <LinkRow label={PAGE_NON.title} onPress={nav.non} /> : null}

      {/* Les quatre portes — la liberté totale à un tap — et les séances vidéo de 20 min (bientôt). */}
      <View accessibilityLabel="Parcourir" style={{ marginTop: 32, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
        <Door strong icon="grid" label="Toutes les activités" onPress={nav.toutes} />
        <Door icon="compass" label="Le programme" onPress={nav.programme} />
        <Door icon="book" label="Le carnet" onPress={nav.carnet} />
        <Door icon="message" label={PAGE_NON.title} onPress={nav.non} />
        <Door wide icon="video" label="Les séances vidéo de 20 min" tag="Bientôt" onPress={nav.videos} />
      </View>

      {/* Progression — le compteur cumulatif d'abord, jamais de « 0 » ; la semaine = trois étoiles */}
      <WeekCard countPhrase={data.countPhrase} done={data.week.done} streak={data.weeklyStreak} />

      {/* Les rangées de la semaine et de l'enfant, puis deux sélecteurs compacts (situation, étape). */}
      {shelves
        .filter((s) => !SITUATION_SHELVES[s.id] && !s.id.startsWith('phase-'))
        .map((s) => (
          <PosterRow
            key={s.id}
            title={s.title}
            subtitle={s.subtitle}
            items={s.items}
            onOpen={openFiche}
            isDone={isDone}
            more={s.id === 'semaine' ? { label: 'Le programme', onPress: nav.programme } : { label: 'Tout voir', onPress: nav.toutes }}
          />
        ))}
      <ShelfPicker
        title="Selon ton moment"
        shelves={shelves.filter((s) => SITUATION_SHELVES[s.id])}
        labelOf={(s) => SITUATION_SHELVES[s.id]}
        onOpen={openFiche}
        isDone={isDone}
        more={{ label: 'Tout voir', onPress: nav.toutes }}
      />
      <ShelfPicker
        title="Tout le parcours"
        shelves={shelves.filter((s) => s.id.startsWith('phase-'))}
        labelOf={(s) => s.title.split(' · ')[0]}
        onOpen={openFiche}
        isDone={isDone}
        more={{ label: 'Le programme', onPress: nav.programme }}
      />

      <GhostButton label={`Voir les ${catalogueCount} activités, triées par âge`} icon="grid" chip={false} onPress={nav.toutes} style={{ marginTop: 40 }} />

      <Bilan4Semaines ctx={ctx} />

      {/* Carnet — les 3 derniers moments */}
      {data.carnet.length > 0 ? (
        <View style={{ marginTop: 40 }}>
          <WText display size={20} weight={600} tone="ink" style={{ marginBottom: 12 }} accessibilityRole="header">
            Le carnet
          </WText>
          <View style={{ gap: 12 }}>
            {data.carnet.slice(0, 3).map((m) => (
              <Tap key={`${m.activity_id}-${m.created_at}`} onPress={nav.carnet} accessibilityRole="button" accessibilityLabel={`${getActivity(m.activity_id)?.title ?? ''}, ${formatLongDate(m.created_at)}`}>
                <Paper laid radius={20} padding={16}>
                  <WText display italic size={13} color={w.paperInk}>
                    {capitalize(formatLongDate(m.created_at))}
                  </WText>
                  <WText size={15} weight={700} color="#022539" style={{ marginTop: 4 }}>
                    {getActivity(m.activity_id)?.title ?? ''}
                  </WText>
                  <WText display size={16} lh={1.35} color="#022539" numberOfLines={3} style={{ marginTop: 6 }}>
                    {m.kept_phrase ? `« ${m.kept_phrase} »` : captureText(m.capture) ?? ''}
                  </WText>
                </Paper>
              </Tap>
            ))}
          </View>
          <MoreLink label="Tout le carnet" onPress={nav.carnet} tone="sage" arrow="arrow-right" />
        </View>
      ) : null}

      <View style={{ marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: w.line, flexDirection: 'row', flexWrap: 'wrap', columnGap: 24 }}>
        <Pressable onPress={nav.sources} accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}>
          <WText size={14} tone="soft">
            Les sources de la méthode
          </WText>
        </Pressable>
      </View>
    </View>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Premier accès : l'accueil en 4 écrans (clé thrive.p3.welcomeSeen, comme le web). */
export function MaisonWelcome({ ctx }: { ctx: MaisonCtx }) {
  const nav = useMaisonNav(ctx);
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    readFlag('thrive.p3.welcomeSeen').then((v) => alive && setSeen(v));
    return () => {
      alive = false;
    };
  }, []);
  if (seen === null) return null;
  if (!seen) {
    return (
      <Onboarding
        firstName={ctx.firstName}
        onNon={nav.non}
        onDone={() => {
          writeFlag('thrive.p3.welcomeSeen');
          setSeen(true);
        }}
      />
    );
  }
  return <Home ctx={ctx} />;
}
