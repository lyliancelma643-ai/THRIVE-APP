import React, { type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  Button, Card, Icon, LockOverlay, MutedPreview, Paper, ProgressBar, ThemedText, Velvet, useTheme, withAlpha,
  type IconName,
} from '../../design';
import { WellbeingCurve } from './Charts';
import { JerseyDisc, useKidColor } from './Chrome';
import {
  PERMA_PILLAR_LABEL, TOTAL_SESSIONS, orderedSkills, skillLabel, stepsSummary, type PermaPillar,
} from './bilanData';
import { LOCK_NOTES, WELLBEING_SCALE, type BilanExtras, type NodeState } from './bilanPage';
import type { BilanActions, BilanModel } from './BilanView';

// Les cartes de la page Bilan (G), dans l'ordre de la page web. Présentationnel : tout vient de `m` (modèle du passeport),
// `x` (extras : séances, lettre, certificat, droits) et `a` (actions). Un seul geste soleil (émail) principal sur la page : la barre du programme. La règle vise le geste principal, pas les marques d’état (point non lu, coche), qui peuvent porter l’émail sans compter.

type P = { m: BilanModel; x: BilanExtras; a: BilanActions };

const CARD_PAD = 18;

function Eyebrow({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return <View style={style}><ThemedText variant="eyebrow" color="label2">{children}</ThemedText></View>;
}

/** Chevron d'affordance en haut à droite : la carte ouvre une fiche. */
function Hint() {
  const { colors } = useTheme();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: 2, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="chevronRight" size={16} color={colors.label3} strokeWidth={2.2} />
    </View>
  );
}

/** Carte du Bilan : `Card` de la page, cliquable (fiche détaillée ou « Comprendre cette carte »). */
function BCard({ label, onPress, hint = true, children, style }: { label: string; onPress?: () => void; hint?: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Card padding={CARD_PAD} onPress={onPress} accessibilityLabel={onPress ? `Voir le détail : ${label}` : undefined} style={style}>
      {children}
      {onPress && hint ? <Hint /> : null}
    </Card>
  );
}

/** En-tête d'atelier : titre Fraunces + statut à droite (retour à la ligne sous le titre si trop long). */
function ToolHead({ title, badge, done, pad = 16, ink }: { title: string; badge: string; done?: boolean; pad?: number; ink?: string }) {
  const { colors } = useTheme();
  // Renseigné : coche + vert d'état ; à venir : gris discret (sur papier, encre explicite passée par `ink`).
  const tone = ink ?? (done ? colors.ok : colors.label3);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: 10, rowGap: 4, marginBottom: pad, paddingRight: 26 }}>
      <ThemedText variant="title3" weight={600} accessibilityRole="header">{title}</ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {done ? <Icon name="check" size={13} color={tone} strokeWidth={3} /> : null}
        <ThemedText variant="foot" weight={600} style={{ color: tone }}>{badge}</ThemedText>
      </View>
    </View>
  );
}

export function TrackRow({ label, value, labelWidth }: { label: string; value: number; labelWidth?: number }) {
  const { colors } = useTheme();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <ThemedText variant={labelWidth ? 'foot' : 'sub'} color="label2" numberOfLines={labelWidth ? undefined : 1} style={labelWidth ? { width: labelWidth } : { flex: 1 }}>{label}</ThemedText>
      <View style={[{ height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' }, labelWidth ? { flex: 1 } : { width: 88 }]}>
        <View style={{ width: `${v}%`, height: '100%', borderRadius: 3, backgroundColor: colors.sage }} />
      </View>
      <ThemedText variant="title3" weight={600} style={{ width: 26, textAlign: 'right', fontSize: labelWidth ? 13 : 15, lineHeight: labelWidth ? 16 : 18 }}>{v}</ThemedText>
    </View>
  );
}

/** Note de verrou : information seule, JAMAIS de lien ni de prix (aucun chemin de paiement dans l'app). */
function LockNote({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.tintSoft, borderWidth: 1, borderColor: colors.separator }}>
      <View style={{ marginTop: 2 }}><Icon name="lock" size={16} color={colors.tintText} /></View>
      <ThemedText variant="sub" color="label2" style={{ flex: 1 }}>
        <ThemedText variant="sub" weight={700}>Contenu réservé. </ThemedText>
        {text}
      </ThemedText>
    </View>
  );
}

/**
 * Aperçu atténué d'une analyse du forfait Groupe : un dessin décoratif (aucune donnée réelle) sous un voile flou,
 * avec la note « dès le pack Individuel ». Sans lien de paiement.
 */
export function LockedPreview({ note, height, children }: { note: string; height: number; children: ReactNode }) {
  return (
    <View style={{ height, marginTop: 14 }} testID="bilan-apercu-verrouille">
      <LockOverlay align="end" preview={<MutedPreview>{children}</MutedPreview>}>
        <LockNote text={note} />
      </LockOverlay>
    </View>
  );
}

// ── 0 · Rappels de questionnaire ───────────────────────────────────────────────

function ReminderCard({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card padding={14} style={{ backgroundColor: colors.badgeBg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={colors.tintText} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="sub" weight={700}>{title}</ThemedText>
          <ThemedText variant="foot" color="label2">{body}</ThemedText>
        </View>
        <Button label="Ouvrir" variant="gray" size="sm" onPress={onPress} accessibilityLabel={title} />
      </View>
    </Card>
  );
}

export function Reminders({ m, x, a }: P) {
  const w = x.pendingWellbeing;
  if (!m.pendingQuestionnaire && !w) return null;
  return (
    <View style={{ gap: 10 }}>
      {m.pendingQuestionnaire ? (
        <ReminderCard
          icon="pulse" title="Questionnaire LSSS en attente"
          body={`${m.firstName} a un questionnaire à compléter avec toi.`} onPress={a.onQuestionnaire}
        />
      ) : null}
      {w ? (
        <ReminderCard
          icon="pulse" title={`Questionnaire bien-être à compléter${w.sessionNumber ? ` — séance ${w.sessionNumber}` : ''}`}
          body={`${m.firstName} a un court questionnaire de bien-être (${WELLBEING_SCALE}) à remplir avec toi.`}
          onPress={() => a.onWellbeingQuestionnaire?.()}
        />
      ) : null}
    </View>
  );
}

// ── 1 · Programme complété (le geste soleil de la page) ────────────────────────

export function ProgrammeHeader({ x, a }: Pick<P, 'x' | 'a'>) {
  const done = x.completed;
  return (
    <Pressable onPress={() => a.onInfo?.('programme')} accessibilityRole="button" accessibilityLabel={`Programme complété : ${x.pct} %. Comprendre cette carte`} style={{ paddingHorizontal: 4 }}>
      <Eyebrow>Programme complété</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <ThemedText variant="numeralHero" style={{ fontSize: 104, lineHeight: 96 }}>{String(x.pct)}</ThemedText>
        <ThemedText variant="title1" color="label3" style={{ fontSize: 32, lineHeight: 36 }}>%</ThemedText>
      </View>
      <ThemedText variant="sub" color="label2" weight={500} style={{ marginTop: 12 }}>
        {`${done} séance${done > 1 ? 's' : ''} sur ${TOTAL_SESSIONS} · ${done < TOTAL_SESSIONS ? 'en cours' : 'terminé'}`}
      </ThemedText>
      <ProgressBar value={x.pct / 100} color="accent" accessibilityLabel="Programme complété" valueText={`${x.pct} %`} style={{ marginTop: 12, height: 8, borderRadius: 4 }} />
    </Pressable>
  );
}

// ── 2 · Passeport athlète (rangée réduite) ─────────────────────────────────────

export function PassportRow({ m, a }: Pick<P, 'm' | 'a'>) {
  const { colors } = useTheme();
  const kid = useKidColor(m.accent);
  const nick = m.fullName.match(/«[^»]*»/)?.[0] ?? null;
  const age = m.sportLine.split(' · ').find((p) => /\d+ ans/.test(p)) ?? null;
  const sub = [age, m.club].filter(Boolean).join(' · ');
  const name = m.fullName.replace(/\s*«[^»]*»/, '');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Paper radius={22} style={{ flex: 1 }}>
        <Pressable
          onPress={() => a.onRow('identite')}
          accessibilityRole="button"
          accessibilityLabel={`Passeport de ${m.firstName}. Voir la fiche identité`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 64 }}
        >
          <View>
            <JerseyDisc size={44} bg={kid.bg} ink={kid.ink} label={m.initial} photoUri={m.photoUri} accessibilityLabel={`Passeport de ${m.firstName}`} />
            {m.jersey != null ? (
              <View style={{ position: 'absolute', right: -6, bottom: -5, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 7, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFEFB' }}>
                <ThemedText variant="cap2" weight={800} style={{ color: colors.navy900, fontSize: 10, lineHeight: 12 }}>{String(m.jersey)}</ThemedText>
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText variant="title3" numberOfLines={1} style={{ fontSize: 18, lineHeight: 22 }}>{name}</ThemedText>
            <ThemedText variant="foot" color="label2" numberOfLines={1}>
              {nick ? <ThemedText variant="foot" color="sageText" style={{ fontStyle: 'italic' }}>{nick}</ThemedText> : null}
              {nick && sub ? ' · ' : ''}
              {sub}
            </ThemedText>
          </View>
          <Icon name="chevronRight" size={16} color={colors.label3} strokeWidth={2.4} />
        </Pressable>
      </Paper>
      <Pressable
        onPress={a.onPersonalize}
        accessibilityRole="button"
        accessibilityLabel="Personnaliser le passeport"
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bgGrouped2, borderWidth: 1, borderColor: colors.separator, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="pencil" size={19} color={colors.label} />
      </Pressable>
    </View>
  );
}

// ── 3 · Compétences de vie ─────────────────────────────────────────────────────

export function SkillsCard({ m, x, a }: P) {
  const skills = orderedSkills(x.gauge?.by_skill ?? {}).slice(0, 4);
  return (
    <BCard label="Compétences de vie" onPress={a.onSkills}>
      <Eyebrow style={{ paddingRight: 30 }}>Compétences de vie</Eyebrow>
      {m.gaugeGlobal == null ? (
        <ThemedText variant="sub" color="label2" weight={500} style={{ marginTop: 12 }}>En attente de la première mesure LSSS.</ThemedText>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <ThemedText variant="numeralHero" style={{ fontSize: 52, lineHeight: 56 }}>{String(m.gaugeGlobal)}</ThemedText>
          <ThemedText variant="sub" weight={600} color="tintText" style={{ flexShrink: 1 }}>
            {m.delta != null ? `${m.delta >= 0 ? '+' : ''}${m.delta} pts depuis le départ` : 'Première mesure'}
          </ThemedText>
        </View>
      )}
      {x.rights.skillBreakdown ? (
        skills.length ? (
          <View style={{ gap: 14, marginTop: 18 }}>
            {skills.map(([k, v]) => <TrackRow key={k} label={skillLabel(k)} value={v} />)}
          </View>
        ) : null
      ) : (
        <LockedPreview note={LOCK_NOTES.skills} height={196}>
          <View style={{ gap: 14 }}>{[68, 44, 81].map((v, i) => <TrackRow key={i} label="Compétence" value={v} />)}</View>
        </LockedPreview>
      )}
      <ThemedText variant="foot" color="label2" style={{ marginTop: 16 }}>Basé sur le questionnaire LSSS · mesuré aux séances 1, 7 et 13.</ThemedText>
    </BCard>
  );
}

// ── 4 · Progression du bien-être ───────────────────────────────────────────────

const PILLAR_ORDER: PermaPillar[] = ['engagement', 'perseverance', 'optimism', 'connectedness', 'happiness'];

export function WellbeingCard({ x, a }: Pick<P, 'x' | 'a'>) {
  const { colors } = useTheme();
  const pts = x.perma;
  const last = pts.length ? [...pts].sort((p, q) => p.session_number - q.session_number)[pts.length - 1] : null;
  const tag = x.rights.wellbeingCurve ? (pts.length ? `${pts.length} séance${pts.length > 1 ? 's' : ''}` : 'à venir') : 'pack Individuel';
  const decor = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 90 }}>
      {[35, 55, 45, 70, 60, 85, 78].map((h, i) => <View key={i} style={{ flex: 1, height: `${h}%`, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: withAlpha(colors.sage, 0.45) }} />)}
    </View>
  );
  return (
    <BCard label="Progression du bien-être" onPress={() => a.onInfo?.('perma')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: 12, rowGap: 4, paddingRight: 30 }}>
        <ThemedText variant="eyebrow" color="label2">Progression du bien-être</ThemedText>
        <ThemedText variant="foot" weight={600} color="label2">{`${WELLBEING_SCALE} · ${tag}`}</ThemedText>
      </View>
      {x.rights.wellbeingCurve ? (
        pts.length ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <View style={{ width: 40, justifyContent: 'space-between', paddingTop: 4, paddingBottom: 24 }}>
                {['Élevé', 'Moyen', 'Bas'].map((t) => <ThemedText key={t} variant="cap2" weight={400} color="label3" numberOfLines={1} style={{ textAlign: 'right' }}>{t}</ThemedText>)}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}><WellbeingCurve points={pts} /></View>
            </View>
            {last ? (
              <View style={{ gap: 11, marginTop: 16 }}>
                {PILLAR_ORDER.map((k) => {
                  const v = last.pillars[k];
                  return v == null ? <PillarEmpty key={k} label={PERMA_PILLAR_LABEL[k]} /> : <TrackRow key={k} label={PERMA_PILLAR_LABEL[k]} value={v} labelWidth={122} />;
                })}
              </View>
            ) : null}
            <ThemedText variant="foot" color="label2" style={{ marginTop: 14 }}>
              {`Bien-être mesuré après chaque séance — échelle ${WELLBEING_SCALE} (engagement, persévérance, optimisme, connexion aux autres, bonheur).`}
            </ThemedText>
          </>
        ) : (
          <ThemedText variant="sub" color="label2" style={{ marginTop: 14 }}>
            En attente du premier questionnaire de bien-être. Le coach en envoie un court après chaque séance.
          </ThemedText>
        )
      ) : (
        <LockedPreview note={LOCK_NOTES.wellbeing} height={210}>{decor}</LockedPreview>
      )}
    </BCard>
  );
}

function PillarEmpty({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <ThemedText variant="foot" color="label2" style={{ width: 122 }}>{label}</ThemedText>
      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.fill }} />
      <ThemedText variant="sub" color="label3" style={{ width: 26, textAlign: 'right' }}>—</ThemedText>
    </View>
  );
}

// ── 5 · Parcours des 13 séances ────────────────────────────────────────────────

function Node({ n, state, sub }: { n: number; state: NodeState; sub: string }) {
  const { colors } = useTheme();
  const base = { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' } as const;
  const look =
    state === 'done' ? { backgroundColor: colors.sage }
    : state === 'current' ? { backgroundColor: colors.tint, borderWidth: 3, borderColor: withAlpha(colors.tint, 0.3) }
    : state === 'replan' ? { borderWidth: 1.5, borderColor: colors.label3, borderStyle: 'dashed' as const }
    : { borderWidth: 1, borderColor: colors.label4 };
  const ink = state === 'done' ? colors.navy900 : state === 'current' ? colors.tintInk : colors.label2;
  return (
    <View style={{ width: `${100 / 7}%`, alignItems: 'center', gap: 6, marginBottom: 12 }}>
      <View style={[base, look]}>
        <ThemedText variant="title3" weight={600} style={{ color: ink, fontSize: 15, lineHeight: 18 }}>{String(n)}</ThemedText>
      </View>
      <ThemedText variant="cap2" color={state === 'current' ? 'tintText' : state === 'done' ? 'label2' : 'label3'} numberOfLines={1} style={{ fontSize: 10, lineHeight: 12 }}>{sub}</ThemedText>
    </View>
  );
}

export function ParcoursCard({ x, a }: Pick<P, 'x' | 'a'>) {
  const { colors } = useTheme();
  const p = x.parcours;
  const legend: [string, string, boolean][] = [[colors.sage, 'Terminée', false], [colors.tint, 'En cours', false], ['transparent', 'À venir', true]];
  return (
    <BCard label="Parcours des 13 séances" onPress={() => a.onInfo?.('parcours')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, paddingRight: 30 }}>
        <ThemedText variant="eyebrow" color="label2">Parcours des 13 séances</ThemedText>
        <ThemedText variant="title3" weight={600} color="tintText" style={{ fontSize: 15, lineHeight: 18 }}>{`${p.doneCount}/${TOTAL_SESSIONS}`}</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }} accessible accessibilityLabel={`${p.doneCount} séances terminées sur ${TOTAL_SESSIONS}`}>
        {p.nodes.map((nd) => <Node key={nd.n} n={nd.n} state={nd.state} sub={nd.sub} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.separator }}>
        {legend.map(([c, t, ring]) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, ...(ring ? { borderWidth: 1, borderColor: colors.label3 } : null) }} />
            <ThemedText variant="foot" color="label2">{t}</ThemedText>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 12, gap: 4 }}>
        {p.last != null ? <ThemedText variant="sub" color="label2" weight={500}>{'Dernière validée · '}<ThemedText variant="sub" weight={700}>{`S${p.last}`}</ThemedText></ThemedText> : null}
        {p.next != null ? (
          <ThemedText variant="sub" color="label2" weight={500}>
            {'Prochaine · '}<ThemedText variant="sub" weight={700}>{`S${p.next}`}</ThemedText>{` · ${p.nextWhen ?? 'à programmer'}`}
          </ThemedText>
        ) : null}
      </View>
    </BCard>
  );
}

// ── 6 · Boîte à outils ─────────────────────────────────────────────────────────

export function ToolboxCard({ x, a }: Pick<P, 'x' | 'a'>) {
  const { colors } = useTheme();
  const tools = x.card?.toolbox ?? [];
  const focus = x.card?.focusWord ?? null;
  return (
    <BCard label="Boîte à outils" onPress={() => a.onRow('boite')}>
      <Eyebrow style={{ paddingRight: 30 }}>Boîte à outils</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <ThemedText variant="numeralHero" style={{ fontSize: 44, lineHeight: 54 }}>{String(tools.length)}</ThemedText>
        <ThemedText variant="sub" color="label2" weight={500}>/ 6 outils collectés</ThemedText>
      </View>
      <ProgressBar value={Math.min(tools.length, 6) / 6} color="sage" accessibilityLabel="Outils collectés" valueText={`${tools.length} sur 6`} style={{ marginVertical: 14, height: 7, borderRadius: 3.5 }} />
      {tools.length ? (
        <View style={{ gap: 10 }}>
          {tools.map((t) => (
            <View key={t.tool} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.sage, marginTop: 8 }} />
              <ThemedText variant="sub" style={{ flex: 1, lineHeight: 20 }}>
                {t.tool}
                {t.context ? <ThemedText variant="sub" color="label3">{` — ${t.context}`}</ThemedText> : null}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.tintSoft }}>
        <ThemedText variant="foot" color="label2">Focus word</ThemedText>
        <ThemedText variant="title3" weight={600} color="tintText" style={{ marginLeft: 'auto', flexShrink: 1, letterSpacing: 0.8, fontSize: 19, lineHeight: 22 }}>{focus ?? '—'}</ThemedText>
      </View>
    </BCard>
  );
}

// ── 7 · Prochaines étapes ──────────────────────────────────────────────────────

export function StepIcon({ status, size = 30 }: { status: 'todo' | 'doing' | 'done'; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.4, backgroundColor: colors.bgGrouped2, alignItems: 'center', justifyContent: 'center' }}>
      {status === 'done' ? <Icon name="check" size={size * 0.5} color={colors.ok} strokeWidth={2.6} /> : status === 'doing' ? <Icon name="timer" size={size * 0.5} color={colors.tintText} /> : (
        <View style={{ width: size * 0.42, height: size * 0.42, borderRadius: 3, borderWidth: 2, borderColor: colors.tintText }} />
      )}
    </View>
  );
}

export function StepsCard({ x, a }: Pick<P, 'x' | 'a'>) {
  const { colors } = useTheme();
  const steps = x.steps.slice(0, 3);
  return (
    <BCard label="Prochaines étapes" onPress={() => a.onRow('etapes')}>
      <Eyebrow style={{ paddingRight: 30, marginBottom: 14 }}>Prochaines étapes</Eyebrow>
      {steps.length ? (
        <View style={{ gap: 10 }}>
          {steps.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: s.status === 'done' ? colors.badgeBg : colors.fill4 }}>
              <StepIcon status={s.status} />
              <ThemedText variant="sub" style={{ flex: 1 }}>{s.label}</ThemedText>
            </View>
          ))}
        </View>
      ) : (
        <ThemedText variant="sub" color="label2">Le coach précisera bientôt les prochaines étapes.</ThemedText>
      )}
      {x.steps.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.separator }}>
          <ThemedText variant="callout" weight={600} color="tintText">{`Voir le parcours complet · ${stepsSummary(x.steps)}`}</ThemedText>
        </View>
      ) : null}
    </BCard>
  );
}

// ── 8 · Mes outils THRIVE ──────────────────────────────────────────────────────

export function ToolsTitle({ x }: { x: BilanExtras }) {
  return (
    <View style={{ marginTop: 22, marginBottom: 4, marginHorizontal: 4 }}>
      <ThemedText variant="title2" weight={600} accessibilityRole="header" style={{ fontSize: 28, lineHeight: 33 }}>Mes outils THRIVE</ThemedText>
      <ThemedText variant="sub" color="label2" style={{ marginTop: 4, lineHeight: 21 }}>Les livrables construits séance après séance — chacun son atelier.</ThemedText>
      <ThemedText variant="foot" weight={600} color="tintText" style={{ marginTop: 6 }}>{`8 ateliers · ${x.toolsFilled} renseignés`}</ThemedText>
    </View>
  );
}

// Fiche Identité Athlète : papier vergé (ce qu'on garde).
export function IdentityCard({ x, a }: Pick<P, 'x' | 'a'>) {
  const c = x.card;
  const filled = !!x.sportStory || (c?.strengths.length ?? 0) > 0 || !!c?.seasonDream;
  return (
    <Paper laid radius={26}>
      <Pressable onPress={() => a.onRow('identite')} accessibilityRole="button" accessibilityLabel="Voir le détail : Fiche Identité Athlète" style={{ padding: CARD_PAD }}>
        <ToolHead title="Fiche Identité Athlète" badge={filled ? 'S1 · renseigné' : 'S1 · à venir'} done={filled} ink={filled ? '#33543F' : '#5A6C73'} />
        <ThemedText variant="eyebrow" color="label2" style={{ marginBottom: 6 }}>Histoire sportive</ThemedText>
        {x.sportStory ? (
          <ThemedText variant="title3" weight={400} style={{ marginBottom: 16, fontSize: 16, lineHeight: 24 }}>{x.sportStory}</ThemedText>
        ) : (
          <ThemedText variant="sub" color="label2" style={{ marginBottom: 16 }}>À renseigner avec le coach.</ThemedText>
        )}
        {c?.seasonDream ? (
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: 'rgba(0,78,122,0.07)', marginBottom: 16 }}>
            <ThemedText variant="eyebrow" color="tintText" style={{ marginBottom: 4 }}>Rêve de saison</ThemedText>
            <ThemedText variant="title3" weight={400} style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 25 }}>{`« ${c.seasonDream} »`}</ThemedText>
          </View>
        ) : null}
        <ThemedText variant="eyebrow" color="label2" style={{ marginBottom: 10 }}>Forces (VIA)</ThemedText>
        {c && c.strengths.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {c.strengths.map((s) => <StrengthChip key={s} label={s} />)}
          </View>
        ) : (
          <ThemedText variant="sub" color="label2">Forces à identifier ensemble.</ThemedText>
        )}
        <View pointerEvents="none" style={{ position: 'absolute', right: 2, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronRight" size={16} color="rgba(2,37,57,0.4)" strokeWidth={2.2} />
        </View>
      </Pressable>
    </Paper>
  );
}

/** Pastille de force sur papier : encre sauge foncée explicite (lisible dans les deux styles). */
export function StrengthChip({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(70,105,95,0.14)' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#46695F' }} />
      <ThemedText variant="foot" weight={600} style={{ color: '#33543F' }}>{label}</ThemedText>
    </View>
  );
}

const SMART = [['S', 'Spécifique'], ['M', 'Mesurable'], ['A', 'Atteignable'], ['R', 'Réaliste'], ['T', 'Temporel']] as const;

export function SmartChips() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {SMART.map(([l, t]) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 12, backgroundColor: colors.fill4 }}>
          <ThemedText variant="title3" weight={600} color="tintText" style={{ fontSize: 13, lineHeight: 16 }}>{l}</ThemedText>
          <ThemedText variant="foot" weight={500} color="label2" style={{ lineHeight: 16 }}>{t}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export function ObjectifCard({ x, a }: Pick<P, 'x' | 'a'>) {
  const { colors } = useTheme();
  const c = x.card;
  const filled = !!c?.smartGoal || !!c?.lifeSkillGoal || x.myActions.length > 0;
  return (
    <BCard label="Fiche Objectif THRIVE" onPress={() => a.onRow('objectif')}>
      <ToolHead title="Fiche Objectif THRIVE" badge={filled ? 'S2 · renseigné' : 'S2 · à venir'} done={filled} />
      <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.badgeBg, marginBottom: 16 }}>
        <ThemedText variant="title3" weight={500} style={{ fontSize: 19, lineHeight: 26 }}>{c?.smartGoal ?? 'Objectif SMART à co-construire avec le coach.'}</ThemedText>
      </View>
      {c?.lifeSkillGoal ? (
        <>
          <ThemedText variant="eyebrow" color="label2" style={{ marginBottom: 6 }}>Objectif life skill</ThemedText>
          <ThemedText variant="sub" style={{ marginBottom: 16 }}>{c.lifeSkillGoal}</ThemedText>
        </>
      ) : null}
      {x.myActions.length ? (
        <>
          <ThemedText variant="eyebrow" color="label2" style={{ marginBottom: 10 }}>Ce qui dépend de moi</ThemedText>
          <View style={{ gap: 8, marginBottom: 16 }}>
            {x.myActions.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <View style={{ marginTop: 3 }}><Icon name="check" size={14} color={colors.tintText} strokeWidth={2.6} /></View>
                <ThemedText variant="sub" style={{ flex: 1 }}>{t}</ThemedText>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <View style={{ marginBottom: 16 }}><SmartChips /></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <ThemedText variant="sub" color="label2">Progression du parcours</ThemedText>
        <ThemedText variant="title3" weight={600} color="tintText" style={{ fontSize: 16, lineHeight: 18 }}>{`${x.pct} %`}</ThemedText>
      </View>
      <ProgressBar value={x.pct / 100} color="tint" accessibilityLabel="Progression du parcours" valueText={`${x.pct} %`} style={{ height: 7, borderRadius: 3.5 }} />
    </BCard>
  );
}

// Focus Word : velours côtelé (la semaine), mot en encre crème : le soleil est déjà pris par la barre du programme.
export function FocusCard({ x, a }: Pick<P, 'x' | 'a'>) {
  const word = x.card?.focusWord ?? null;
  return (
    <Velvet radius={26}>
      <Pressable onPress={() => a.onRow('focus')} accessibilityRole="button" accessibilityLabel={`Voir le détail : Focus Word${word ? ` ${word}` : ''}`} style={{ paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center', gap: 6 }}>
        <ThemedText variant="eyebrow" color="label2">Focus Word · S9</ThemedText>
        <ThemedText variant="largeTitle" weight={600} style={{ fontSize: 46, lineHeight: 50, letterSpacing: 2.8, textAlign: 'center', marginTop: 8 }}>{word ? word.toUpperCase() : '—'}</ThemedText>
        <ThemedText variant="eyebrow" color="label2" style={{ marginTop: 8, fontSize: 12, lineHeight: 12 }}>{word ? 'Mot-ancre actif' : 'À définir en séance 9'}</ThemedText>
      </Pressable>
      <Hint />
    </Velvet>
  );
}

const WHEEL = ['#A7C4BC', '#6FA8B0', '#CDBF78', '#8FB3C4']; // illustration de la roue (canevas), pas un token de thème

export function EmotionWheel({ size = 150, children }: { size?: number; children?: ReactNode }) {
  const stroke = 27;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {WHEEL.map((col, i) => (
          <Circle
            key={col} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} opacity={0.92}
            strokeDasharray={`${c / 4 - 1} ${c}`} strokeDashoffset={-(c / 4) * i} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 2 }}>{children}</View>
    </View>
  );
}

export function EmotionsCard({ x, a }: Pick<P, 'x' | 'a'>) {
  const open = x.rights.emotionWheel;
  return (
    <BCard label="Roue des Émotions" onPress={() => a.onInfo?.('emotions')}>
      <ToolHead title="Roue des Émotions" badge="Séances S4 · S5" pad={6} />
      {open ? (
        <View style={{ marginVertical: 14 }}>
          <EmotionWheel>
            <ThemedText variant="foot" weight={600} color="label2">{x.latestEmotion ? 'Identifiée' : 'À explorer'}</ThemedText>
            <ThemedText variant="title3" color="tintText" numberOfLines={1} style={{ maxWidth: 90, textAlign: 'center' }}>{x.latestEmotion ?? '—'}</ThemedText>
          </EmotionWheel>
        </View>
      ) : (
        <LockedPreview note={LOCK_NOTES.emotions} height={290}>
          <EmotionWheel />
        </LockedPreview>
      )}
    </BCard>
  );
}

const ROUTINE = ['Respire · 3 cycles lents', 'Visualise le geste parfait', null, 'Action — j’y vais'] as const;

export function routineSteps(focusWord: string | null): string[] {
  return ROUTINE.map((t) => t ?? (focusWord ? `Mot-ancre · « ${focusWord} »` : 'Mot-ancre'));
}

export function RoutineSteps({ focusWord, big }: { focusWord: string | null; big?: boolean }) {
  const { colors } = useTheme();
  const d = big ? 38 : 30;
  const steps = routineSteps(focusWord);
  return (
    <View style={{ gap: big ? 20 : 14 }}>
      <View style={{ position: 'absolute', left: d / 2 - 1, top: d / 2, bottom: d / 2, width: 2, backgroundColor: colors.sage, opacity: 0.55 }} />
      {steps.map((t, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: big ? 16 : 13 }}>
          <View
            style={[
              { width: d, height: d, borderRadius: d / 2, alignItems: 'center', justifyContent: 'center' },
              i === 0 ? { backgroundColor: colors.tint } : i === 3 ? { backgroundColor: colors.bgGrouped2, borderWidth: 1, borderColor: colors.label3 } : { backgroundColor: colors.sage },
            ]}
          >
            <ThemedText variant="title3" weight={600} style={{ fontSize: big ? 16 : 14, lineHeight: 18, color: i === 0 ? colors.tintInk : i === 3 ? colors.label : colors.navy900 }}>{String(i + 1)}</ThemedText>
          </View>
          <ThemedText variant={big ? 'body' : 'sub'} weight={i === 3 ? 700 : 500} style={{ flex: 1 }}>{t}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export function RoutineCard({ x, a }: Pick<P, 'x' | 'a'>) {
  return (
    <BCard label="Routine pré-tir" onPress={() => a.onRow('routine')}>
      <ToolHead title="Routine pré-tir" badge="Séance S6" pad={18} />
      <RoutineSteps focusWord={x.card?.focusWord ?? null} />
    </BCard>
  );
}

export function ContratCard({ m, x, a }: P) {
  const { colors } = useTheme();
  const rows: [string, string][] = [['Athlète', m.firstName], ['Coach', m.coachFirst ?? '—'], ['Parent', 'Engagé']];
  const doc = x.docIds.contract;
  // Pas de bouton dans un bouton : la fiche s'ouvre par le haut de la carte, le téléchargement est à part.
  return (
    <Card padding={CARD_PAD}>
      <Pressable onPress={() => a.onInfo?.('contrat')} accessibilityRole="button" accessibilityLabel="Voir le détail : Contrat de confiance">
        <ToolHead title="Contrat de confiance" badge="Séance S1" pad={6} />
        {rows.map(([role, val], i) => (
          <View key={role} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 12, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: colors.separator }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText variant="cap2" color="label2" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{role}</ThemedText>
              <ThemedText variant="title3" weight={400} style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 24 }}>{val}</ThemedText>
            </View>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.badgeBg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={14} color={colors.ok} strokeWidth={2.6} />
            </View>
          </View>
        ))}
        <Hint />
      </Pressable>
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.separator }}>
        {doc ? (
          <Pressable onPress={() => a.onOpenDoc?.(doc)} accessibilityRole="button" accessibilityLabel="Télécharger le contrat signé" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
            <Icon name="arrowUp" size={17} color={colors.tintText} />
            <ThemedText variant="callout" weight={600} color="tintText">Télécharger le contrat signé</ThemedText>
          </Pressable>
        ) : (
          <ThemedText variant="callout" weight={600} color="label3" style={{ minHeight: 44, paddingTop: 10 }}>Les 3 parties engagées</ThemedText>
        )}
      </View>
    </Card>
  );
}

/** Lignes d'écriture factices de la lettre : aucune ligne du vrai texte (elle reste scellée). */
export function LetterLines({ lines = [92, 100, 84, 60], gap = 10 }: { lines?: number[]; gap?: number }) {
  return (
    <View style={{ gap }}>
      {lines.map((w, i) => <View key={i} style={{ height: 7, width: `${w}%`, borderRadius: 4, backgroundColor: 'rgba(0,49,76,0.16)' }} />)}
    </View>
  );
}

export function LettreCard({ m, x, a }: P) {
  const sealed = x.letter === 'sealed';
  const doc = x.docIds.letter;
  return (
    <Paper laid radius={26}>
      <View style={{ padding: CARD_PAD }}>
        <Pressable onPress={() => a.onRow('lettre')} accessibilityRole="button" accessibilityLabel="Voir le détail : Lettre à moi-même">
          <ToolHead title="Lettre à moi-même dans 1 an" badge={sealed ? 'S13 · scellée' : 'S13 · à venir'} done={sealed} ink={sealed ? '#33543F' : '#5A6C73'} />
          <View style={{ borderRadius: 16, backgroundColor: 'rgba(0,49,76,0.05)', padding: 18 }}>
            <ThemedText variant="title3" weight={400} color="label2" style={{ fontStyle: 'italic', marginBottom: 14, fontSize: 16, lineHeight: 20 }}>{`Chère ${m.firstName},`}</ThemedText>
            <LetterLines />
          </View>
          {!(sealed && doc) ? (
            <ThemedText variant="sub" weight={500} color="label2" style={{ marginTop: 12 }}>{sealed ? 'Scellée — à ouvrir dans 1 an' : 'À écrire lors de la séance bilan (S13).'}</ThemedText>
          ) : null}
          <View pointerEvents="none" style={{ position: 'absolute', right: -16, top: -14, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevronRight" size={16} color="rgba(2,37,57,0.4)" strokeWidth={2.2} />
          </View>
        </Pressable>
        {sealed && doc ? (
          <Pressable onPress={() => a.onOpenDoc?.(doc)} accessibilityRole="button" accessibilityLabel="Télécharger la lettre (PDF)" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginTop: 8 }}>
            <Icon name="arrowUp" size={17} color="#004E7A" />
            <ThemedText variant="sub" weight={600} color="tintText">Télécharger la lettre (PDF)</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </Paper>
  );
}

export function CertificatCard({ x, a }: Pick<P, 'x' | 'a'>) {
  const { colors } = useTheme();
  const open = x.certificate === 'available';
  const remaining = Math.max(TOTAL_SESSIONS - x.completed, 0);
  return (
    <Pressable
      onPress={() => a.onRow('certificat')}
      accessibilityRole="button"
      accessibilityLabel="Voir le détail : Certificat THRIVE"
      style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.label4, borderRadius: 26, padding: CARD_PAD }}
    >
      <ToolHead title="Certificat THRIVE" badge={open ? 'disponible' : 'à venir · S13'} done={open} pad={14} />
      <ThemedText variant="sub" color="label2" style={{ marginBottom: 16 }}>Reconnaissance officielle de fin de parcours — débloquée à la dernière séance.</ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <ThemedText variant="sub" color="label2">{`${x.completed}/${TOTAL_SESSIONS} séances`}</ThemedText>
        <ThemedText variant="callout" weight={600} color="label2">{`${remaining} restante${remaining > 1 ? 's' : ''}`}</ThemedText>
      </View>
      <ProgressBar value={x.completed / TOTAL_SESSIONS} color="sage" accessibilityLabel="Séances validées" valueText={`${x.completed} sur ${TOTAL_SESSIONS}`} style={{ height: 7, borderRadius: 3.5 }} />
      {open && x.docIds.certificate ? (
        <View style={{ marginTop: 16 }}>
          <Button label="Télécharger le certificat" variant="gray" glyph="document" onPress={() => a.onOpenDoc?.(x.docIds.certificate!)} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: colors.tintSoft }}>
          <Icon name="lock" size={16} color={colors.tintText} />
          <ThemedText variant="foot" color="label2" style={{ flex: 1 }}>Disponible en téléchargement dès la validation de la séance 13.</ThemedText>
        </View>
      )}
    </Pressable>
  );
}
