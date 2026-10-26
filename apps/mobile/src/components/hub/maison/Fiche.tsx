// ─────────────────────────────────────────────────────────────────────────────
// E3 — La fiche, portage fidèle de apps/web/src/app/parent/(hub)/fitness/[activityId]/page.tsx.
// Lire en 20 secondes, décider, lancer. Tout le texte vient du JSON partagé via resolveActivity() (R1).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Paper } from '../../../design';
import { BackLink, Eyebrow, LaunchButton, NcCard, NcRow, Tap, WIcon, WSection, WText, useWeb, type WIconName } from '../../../design/web';
import { frTypo, timerSummary } from '../../activite/flow';
import { VISUAL_LABELS } from '../../activite/visuals/content';
import {
  BAND_LABELS, DURATION_WORDS, PILLAR_PLAIN, ROLE_LABELS, effectiveDuration, getActivity, getWeek, plainAction, plainSession, resolveActivity,
  isVisible, p3Pool, type AgeBand, type Duration, type P3Activity, type Place,
} from '../../../lib/p3web';
import { excludeTonight } from '../session';
import { HubScreen } from '../HubScreen';
import { MaisonSkeleton, Under8, forChild, useMaison, type MaisonCtx } from './MaisonFrame';
import { useMaisonNav } from './nav';
import { ActivityArch } from './parts';
import { PillarTag } from './screens';
import { Split } from '../Split';
import { Rise } from '../../motion/Rise';
import { useLayout, useWindowDimensions } from '../../../design/layout';

const PLACE_LABELS: Record<Place, string> = { maison: 'À la maison', exterieur: 'Dehors', voiture: 'En voiture', partout: 'Partout' };
const EXT_LABELS = { approfondir: 'Approfondir', ancrer: 'Ancrer', transferer: 'Transférer' } as const;
const LEVEL_NOTE =
  'Niveau A : fondé sur des études solides. Niveau B : adaptation THRIVE cohérente avec la recherche. Niveau C : choix pédagogique de terrain.';

/** Le seul markdown des fiches : **gras** (InlineMd du web), avec la typographie française. */
export function InlineMd({ text, size = 16, lh = 1.55, tone = 'body' as const }: { text: string; size?: number; lh?: number; tone?: 'body' | 'ink' }) {
  const parts = frTypo(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <WText size={size} lh={lh} tone={tone}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <WText key={i} size={size} lh={lh} weight={600} tone="ink">
            {p.slice(2, -2)}
          </WText>
        ) : (
          p
        ),
      )}
    </WText>
  );
}

/** Hauteur réservée sous le contenu pour la barre d'actions collante. */
export const FICHE_BAR_SPACE = 104;

function FicheBody({
  ctx, activity, bandOverride, duration, setDuration,
}: { ctx: MaisonCtx; activity: P3Activity; bandOverride: boolean; duration: Duration; setDuration: (d: Duration) => void }) {
  const w = useWeb();
  const nav = useMaisonNav(ctx);
  const { width: screen } = useWindowDimensions();
  const { wide } = useLayout();
  const [whyLevel, setWhyLevel] = useState(0);
  const [copied, setCopied] = useState(false);

  const r = resolveActivity(activity, duration, ctx.band)!;
  const week = getWeek(activity.week);
  const after = activity.after ? getActivity(activity.after) : null;

  const copy = async () => {
    try {
      // Chargé au toucher seulement : jamais au lancement de l'app.
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(r.opener.replace(/^«\s*|\s*»$/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // presse-papier indisponible
    }
  };

  const chips: { icon: WIconName; text: string }[] = [
    { icon: 'timer', text: `${r.duration} min` },
    { icon: 'child', text: forChild(ctx) },
    { icon: 'home', text: activity.places.map((p) => PLACE_LABELS[p]).join(' · ') },
    { icon: 'clipboard', text: activity.materials.length ? activity.materials.join(', ') : 'Rien à préparer' },
    { icon: 'sparkle', text: `Énergie : ${activity.parent_energy}` },
    ...(activity.participants ? [{ icon: 'users' as const, text: activity.participants }] : []),
  ];

  return (
    <Split
      ratio={[4, 6]}
      left={
        <>
      <Rise delay={60}>
      <Eyebrow style={{ marginTop: 12 }}>
        {activity.programme === 'bonus'
          ? 'Bonus · hors programme'
          : `Semaine ${activity.week} · ${activity.programme === 'complement' ? 'Pour aller plus loin · ' : ''}${ROLE_LABELS[activity.role]}`}
      </Eyebrow>
      </Rise>
      <Rise delay={100}>
      <WText display size={35} weight={500} lh={1.05} tone="ink" style={{ marginTop: 8 }} accessibilityRole="header">
        {activity.title}
      </WText>
      <WText size={15} tone="soft" style={{ marginTop: 6 }}>
        {activity.subtitle}
      </WText>
      {after ? (
        <WText size={14} tone="soft" style={{ marginTop: 4 }}>
          {'À faire après '}
          <WText size={14} weight={600} tone="accent" style={{ textDecorationLine: 'underline' }} onPress={() => nav.fiche(after.id)}>
            {`« ${after.title} »`}
          </WText>
          {ctx.data.doneIds.has(after.id) ? ' (déjà vécue)' : ''}
        </WText>
      ) : null}
      </Rise>

      {/* L'arche : la vignette de l'activité. L'enfant comprend l'activité sans lire son but. */}
      <Rise delay={0}>
      <View style={{ alignItems: wide ? 'flex-start' : 'center', marginTop: 24 }}>
        <ActivityArch activityId={activity.id} width={wide ? 270 : Math.min(330, Math.round(screen * 0.86))} />
      </View>
      </Rise>

        </>
      }
      right={
        <>
      {/* Ce qu'on travaille vraiment : l'objectif relié à la séance du coach */}
      <Rise delay={150}>
      <View style={{ marginTop: wide ? 12 : 32, transform: [{ rotate: '-0.3deg' }] }} accessibilityLabel="Ce qu’on travaille">
        <Paper radius={26} padding={24} style={{ paddingBottom: 0 }}>
          <View style={{ paddingBottom: 20 }}>
            <Eyebrow color={w.paperInk}>Ce qu’on travaille</Eyebrow>
            <WText display size={28} weight={500} lh={1.12} color="#022539" style={{ marginTop: 8 }}>
              {week?.skill ?? activity.subtitle}
            </WText>
            <WText size={16} lh={1.5} color="#022539" style={{ marginTop: 14 }}>
              <WText size={16} lh={1.5} weight={700} color="#022539">
                {'Objectif : '}
              </WText>
              {activity.objective}
            </WText>
            <View style={{ marginTop: 16, gap: 8 }}>
              {[
                ['Avec le coach', week ? plainSession(week.session_source) : 'Hors séance'],
                ...(plainAction(week?.action) ? [['Axe', plainAction(week?.action)!]] : []),
                ['Pilier', PILLAR_PLAIN[activity.pillar_main]],
                ...(week ? [[`Semaine ${week.week}`, week.opening_line]] : []),
              ].map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', gap: 8 }}>
                  <WText size={14} lh={1.45} color="#56626B">
                    {k}
                  </WText>
                  <WText size={14} lh={1.45} color="#33454F" style={{ flex: 1 }}>
                    {v}
                  </WText>
                </View>
              ))}
            </View>
          </View>
        </Paper>
      </View>
      </Rise>

      {/* Barre de contexte : une puce par information */}
      <Rise delay={200}>
      <View style={{ marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {chips.map((c) => (
          <View key={c.text} style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: w.chip, borderWidth: 1, borderColor: w.line, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
            <WIcon name={c.icon} size={16} color={w.sageInk} />
            <WText size={13.5} tone="body" style={{ flexShrink: 1 }}>
              {c.text}
            </WText>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 12 }}>
        <PillarTag pillar={activity.pillar_main} />
      </View>
      </Rise>

      {activity.durations.length > 1 ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Durée"
          style={{ marginTop: 20, flexDirection: 'row', gap: 4, padding: 4, borderRadius: 26, backgroundColor: w.chip, borderWidth: 1, borderColor: w.line }}
        >
          {activity.durations.map((d) => {
            const on = d === duration;
            return (
              <Tap
                key={d}
                onPress={() => setDuration(d as Duration)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${d} minutes`}
                style={{ flex: 1, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? w.text : 'transparent' }}
              >
                <WText size={14} weight={on ? 600 : 500} color={on ? w.bg : w.text2}>{`${d} min`}</WText>
              </Tap>
            );
          })}
        </View>
      ) : null}

      {/* Le seul endroit où le texte est aussi grand que le titre */}
      <WSection title="Ce que tu dis pour commencer">
        <View
          style={{
            borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomRightRadius: 26, borderBottomLeftRadius: 8,
            backgroundColor: w.surface, borderWidth: 1, borderColor: w.line2, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16,
          }}
        >
          <WText display size={84} lh={84} color={w.sage} style={{ position: 'absolute', left: 20, top: -4, opacity: 0.6 }} accessibilityElementsHidden>
            “
          </WText>
          <WText display italic size={25} lh={1.3} tone="ink" style={{ marginTop: 12 }}>
            {frTypo(r.opener)}
          </WText>
          <Pressable onPress={copy} accessibilityRole="button" style={{ marginTop: 12, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
            <WIcon name={copied ? 'check' : 'clipboard'} size={18} color={w.sageInk} />
            <WText size={14} weight={600} tone="sage">
              {copied ? 'Phrase copiée' : 'Copier la phrase'}
            </WText>
          </Pressable>
        </View>
      </WSection>

      {activity.safety ? (
        <WSection title="À savoir avant de commencer">
          <NcRow style={{ padding: 16 }}>
            <InlineMd text={activity.safety} size={15} />
          </NcRow>
        </WSection>
      ) : null}

      <WSection title="Le déroulé">
        <View style={{ gap: 24 }}>
          {r.steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 16 }}>
              {i < r.steps.length - 1 ? (
                <View style={{ position: 'absolute', left: 17, top: 40, bottom: -24, borderLeftWidth: 2, borderStyle: 'dotted', borderColor: 'rgba(167,196,188,0.6)' }} />
              ) : null}
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: w.surface, borderWidth: 1.5, borderColor: w.sage, alignItems: 'center', justifyContent: 'center' }}>
                <WText display size={18} weight={600} tone="ink" lh={20}>
                  {String(i + 1)}
                </WText>
              </View>
              <View style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                <InlineMd text={s} />
                {activity.guide[i]?.timer || activity.guide[i]?.visual ? (
                  <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {activity.guide[i].timer ? (
                      <GuideChip icon="timer" text={`Minuteur ${timerSummary(activity.guide[i].timer!)}`} />
                    ) : null}
                    {activity.guide[i].visual ? <GuideChip icon="eye" text={`À montrer : ${VISUAL_LABELS[activity.guide[i].visual!]}`} /> : null}
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        {r.variant ? (
          <NcRow style={{ padding: 16, marginTop: 20 }}>
            <Eyebrow style={{ marginBottom: 6 }}>
              {bandOverride ? `Version ${BAND_LABELS[ctx.band]}` : `Pour ${ctx.firstName}${ctx.age !== null ? `, à ${ctx.age} ans` : ''}`}
            </Eyebrow>
            <InlineMd text={r.variant} size={15} />
          </NcRow>
        ) : null}
      </WSection>

      {/* La valeur du produit : mise en avant forte */}
      <WSection title={`À éviter pendant ces ${DURATION_WORDS[r.duration]}`}>
        <NcCard>
          <View style={{ gap: 16 }}>
            {r.donts.map((d, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 26, height: 26, marginTop: 1, borderRadius: 13, backgroundColor: 'rgba(167,196,188,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <WIcon name="close" size={14} color={w.sageInk} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <InlineMd text={d} lh={1.5} tone="ink" />
                </View>
              </View>
            ))}
          </View>
        </NcCard>
      </WSection>

      <WSection title="Ce que tu vas voir">
        <InlineMd text={r.what_you_will_see} lh={1.6} />
      </WSection>

      {activity.extensions.filter((e) => e.adds_to <= r.duration).length > 0 ? (
        <View style={{ marginTop: 24, gap: 12 }}>
          {activity.extensions
            .filter((e) => e.adds_to <= r.duration)
            .map((e) => (
              <NcRow key={e.adds_to} style={{ padding: 16 }}>
                <Eyebrow style={{ marginBottom: 6 }}>{`+10 min — ${EXT_LABELS[e.kind]}`}</Eyebrow>
                <InlineMd text={e.text} size={15} />
              </NcRow>
            ))}
        </View>
      ) : null}

      {/* Pourquoi ça marche — 3 niveaux : une ligne → le détail → la source */}
      <WSection title="Pourquoi ça marche">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: w.line2, alignItems: 'center', justifyContent: 'center' }}>
            <WText size={13} weight={700} tone="soft" lh={15}>
              i
            </WText>
          </View>
          <WText size={15} lh={1.55} tone="body" style={{ flex: 1 }}>
            {activity.why_one_line}
          </WText>
        </View>
        {whyLevel === 0 ? (
          <Pressable onPress={() => setWhyLevel(1)} accessibilityRole="button" style={{ marginTop: 8, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <WText size={14} weight={600} tone="sage">
              Le détail
            </WText>
          </Pressable>
        ) : null}
        {whyLevel >= 1 ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <WText size={15} lh={1.6} tone="body">
              {activity.why_detail}
            </WText>
            <WText size={13} tone="soft">
              {activity.method_ref}
            </WText>
            {whyLevel === 1 ? (
              <Pressable onPress={() => setWhyLevel(2)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                <WText size={14} weight={600} tone="sage">
                  La source
                </WText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {whyLevel === 2 ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            {activity.sources.map((s) => (
              <WText key={s.citation} size={14} lh={1.5} tone="body">
                {`${s.citation} `}
                <WText size={14} tone="soft">{`— Niveau ${s.level}`}</WText>
              </WText>
            ))}
            <WText size={13} tone="soft" style={{ marginTop: 4 }}>
              {LEVEL_NOTE}
            </WText>
          </View>
        ) : null}
      </WSection>
        </>
      }
    />
  );
}

function GuideChip({ icon, text }: { icon: WIconName; text: string }) {
  const w = useWeb();
  return (
    <View style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(167,196,188,0.15)', borderWidth: 1, borderColor: 'rgba(167,196,188,0.3)', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <WIcon name={icon} size={16} color={w.sageInk} />
      <WText size={13.5} weight={600} tone="sage">
        {text}
      </WText>
    </View>
  );
}

/** Barre d'actions de la fiche, collante en bas (au-dessus des onglets, comme sur le web) : Lancer, Favori, De côté, Autre. */
function FicheOverlay({
  ctx, activity, duration, place, bandOverride,
}: { ctx: MaisonCtx; activity: P3Activity; duration: Duration; place: 'maison' | 'exterieur' | 'voiture'; bandOverride: boolean }) {
  const w = useWeb();
  const nav = useMaisonNav(ctx);
  const fav = ctx.data.saved.favoris.has(activity.id);
  const aside = ctx.data.saved.deCote.has(activity.id);
  const action = (icon: WIconName, label: string, on: boolean, a11y: string, onPress: () => void) => (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: on }}
      style={{ width: 58, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 2 }}
    >
      <WIcon name={icon} size={20} color={on ? w.accentInk : w.text3} strokeWidth={on && icon === 'star' ? 2.6 : 1.9} />
      <WText size={11} weight={600} tone="soft" lh={13}>
        {label}
      </WText>
    </Tap>
  );
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, bottom: 10, alignItems: 'center' }}>
      <Rise delay={260} style={{ width: '100%', maxWidth: 560 }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: 34, backgroundColor: w.surfaceKind === 'maison' && w.isNight ? 'rgba(0,49,76,0.94)' : w.tab,
          borderWidth: 1, borderColor: w.line2, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 16 }, elevation: 12,
        }}
      >
        <LaunchButton
          label="Lancer"
          height={52}
          onPress={() => nav.launch(activity.id, duration, place, bandOverride ? ctx.band : undefined)}
          style={{ flex: 1 }}
        />
        {action('star', 'Favori', fav, fav ? 'Retirer des favoris' : 'Ajouter aux favoris', () => ctx.data.toggleSaved(activity.id, 'FAVORI'))}
        {action('flag', 'De côté', aside, aside ? 'Ne plus mettre de côté' : 'Mettre de côté', () => ctx.data.toggleSaved(activity.id, 'DE_COTE'))}
        {action('refresh', 'Autre', false, 'Autre activité', () => {
          excludeTonight(ctx.child.id, activity.id);
          nav.home();
        })}
      </View>
      </Rise>
    </View>
  );
}

type FicheParams = { activityId: string; duree?: string; lieu?: string; bande?: string };

function parseDuration(raw?: string): Duration {
  return raw === '20' ? 20 : raw === '30' ? 30 : 10;
}
function parsePlace(raw?: string): 'maison' | 'exterieur' | 'voiture' {
  return raw === 'exterieur' || raw === 'voiture' ? raw : 'maison';
}
function parseBand(raw?: string): AgeBand | null {
  return raw === '8-11' || raw === '12-14' || raw === '15-17' ? raw : null;
}

function FicheReady({ ctx, activity, params }: { ctx: MaisonCtx; activity: P3Activity; params: FicheParams }) {
  const band = parseBand(params.bande);
  const bandOverride = band !== null && band !== ctx.band;
  const c = band ? { ...ctx, band } : ctx;
  const [duration, setDuration] = useState<Duration>(effectiveDuration(activity, parseDuration(params.duree)) ?? activity.base_duration);
  return (
    <HubScreen
      surface="maison"
      contentPaddingBottom={FICHE_BAR_SPACE + 24}
      overlay={<FicheOverlay ctx={c} activity={activity} duration={duration} place={parsePlace(params.lieu)} bandOverride={bandOverride} />}
    >
      <BackLinkMaison ctx={c} />
      <FicheBody ctx={c} activity={activity} bandOverride={bandOverride} duration={duration} setDuration={setDuration} />
    </HubScreen>
  );
}

function BackLinkMaison({ ctx }: { ctx: MaisonCtx }) {
  const nav = useMaisonNav(ctx);
  return <BackLink label="Maison" onPress={nav.back} />;
}

/**
 * La route de la fiche : toute fiche publiée s'ouvre, quelle que soit la semaine en cours ; un complément dès que
 * sa semaine est ouverte. `bande` (depuis le catalogue) montre la version d'une autre tranche d'âge.
 */
export function FicheScreen({ params }: { params: FicheParams }) {
  const m = useMaison();
  const activity = getActivity(String(params.activityId ?? ''));
  const inPool = !!activity && p3Pool().some((a) => a.id === activity.id);
  if (m.status !== 'ready' || !m.ctx) {
    return <HubScreen surface="maison">{m.status === 'under8' ? <Under8 /> : <MaisonSkeleton />}</HubScreen>;
  }
  if (!activity || !inPool || !isVisible(activity, m.ctx.data.openWeek)) {
    return (
      <HubScreen surface="maison">
        <View style={{ paddingVertical: 64, alignItems: 'center' }}>
          <WText size={16} tone="body" center>
            Cette fiche n’est pas encore disponible.
          </WText>
          <BackLinkMaison ctx={m.ctx} />
        </View>
      </HubScreen>
    );
  }
  return <FicheReady key={activity.id} ctx={m.ctx} activity={activity} params={params} />;
}
