import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Icon, ListRow, List, Paper, ProgressBar, Sheet, ThemedText, Velvet, useTheme, type IconName } from '../../design';
import { InfoSheet } from './InfoSheet';
import {
  LetterLines, RoutineSteps, SmartChips, StepIcon,
} from './BilanCards';
import { TOTAL_SESSIONS } from './bilanData';
import type { BilanExtras } from './bilanPage';

// Fiches détaillées du Bilan, en grand détent : G3 Identité Athlète, G4 Objectif, G5 Focus Word, G6 Routine pré-tir,
// G7 Boîte à outils, G8 Prochaines étapes, G9 Lettre à moi-même (papier vergé, scellée), G10 Certificat (verrouillé
// jusqu'à la séance 13), plus « Documents ». Lecture seule : le coach écrit, le parent lit. Le texte de la lettre n'est
// JAMAIS affiché ici. « Comprendre cette carte » (I) s'ouvre par-dessus, imbriquée dans cette feuille.

export type CoachDetailKind = 'identite' | 'objectif' | 'focus' | 'routine' | 'boite' | 'etapes' | 'lettre' | 'certificat' | 'docs';

const META: Record<CoachDetailKind, { icon: IconName; title: string; session: string }> = {
  identite: { icon: 'idCard', title: 'Fiche Identité Athlète', session: 'Séance S1' },
  objectif: { icon: 'target', title: 'Fiche Objectif THRIVE', session: 'Séance S2' },
  focus: { icon: 'sparkles', title: 'Focus Word', session: 'Séance S9' },
  routine: { icon: 'timer', title: 'Routine pré-tir', session: 'Séance S6' },
  boite: { icon: 'toolbox', title: 'Boîte à outils', session: 'Construite au fil des séances' },
  etapes: { icon: 'check', title: 'Prochaines étapes', session: 'Définies avec le coach' },
  lettre: { icon: 'mail', title: 'Lettre à moi-même dans 1 an', session: 'Séance S13' },
  certificat: { icon: 'medal', title: 'Certificat THRIVE', session: 'Fin de parcours' },
  docs: { icon: 'document', title: 'Documents', session: 'Partagés par le coach' },
};

const STEP_LABEL = { todo: 'À venir', doing: 'En cours', done: 'Terminé' } as const;

type Props = {
  kind: CoachDetailKind | null;
  onClose: () => void;
  firstName: string;
  x: BilanExtras;
  onOpenDoc: (docId: string) => void;
};

function Label({ children }: { children: string }) {
  return <ThemedText variant="eyebrow" color="label2" style={{ marginBottom: 8, fontSize: 11 }}>{children}</ThemedText>;
}

function Body({ kind, firstName, x, onOpenDoc }: { kind: CoachDetailKind; firstName: string; x: BilanExtras; onOpenDoc: (id: string) => void }) {
  const { colors } = useTheme();
  const c = x.card;
  const empty = (t: string) => <ThemedText variant="sub" color="label2">{t}</ThemedText>;

  if (kind === 'boite') {
    const tools = c?.toolbox ?? [];
    return (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <ThemedText variant="numeralHero" style={{ fontSize: 44, lineHeight: 54 }}>{String(tools.length)}</ThemedText>
          <ThemedText variant="sub" color="label2">/6 outils collectés</ThemedText>
        </View>
        {tools.length ? (
          <View style={{ gap: 10 }}>
            {tools.map((t) => (
              <View key={t.tool} style={{ padding: 14, borderRadius: 15, backgroundColor: colors.badgeBg }}>
                <ThemedText variant="headline">{t.tool}</ThemedText>
                {t.context ? <ThemedText variant="sub" color="label2" style={{ marginTop: 3 }}>{t.context}</ThemedText> : null}
              </View>
            ))}
          </View>
        ) : empty('Les outils apparaîtront ici au fil des séances.')}
        {c?.focusWord ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 14, borderRadius: 15, backgroundColor: colors.tintSoft }}>
            <ThemedText variant="foot" color="label2">Focus word</ThemedText>
            <ThemedText variant="title3" color="tintText" style={{ marginLeft: 'auto', flexShrink: 1 }}>{c.focusWord}</ThemedText>
          </View>
        ) : null}
      </>
    );
  }
  if (kind === 'etapes') {
    return x.steps.length ? (
      <View style={{ gap: 10 }}>
        {x.steps.map((s) => (
          <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 15, backgroundColor: s.status === 'done' ? colors.badgeBg : colors.fill4 }}>
            <StepIcon status={s.status} size={40} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="headline">{s.label}</ThemedText>
              <ThemedText variant="foot" color="label2" style={{ marginTop: 2 }}>
                {STEP_LABEL[s.status]}
                {s.due_date ? ` · ${new Date(s.due_date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}` : ''}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    ) : empty('Le coach précisera bientôt les prochaines étapes.');
  }
  if (kind === 'identite') {
    const cells: [string, string][] = [['Sport', c?.sport ?? '—'], ['Poste', c?.position ?? '—'], ['Club', c?.club ?? '—']];
    return (
      <>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          {cells.map(([l, v]) => (
            <View key={l} style={{ flex: 1, padding: 11, borderRadius: 14, backgroundColor: colors.fill4 }}>
              <ThemedText variant="cap2" color="label3" style={{ textTransform: 'uppercase', marginBottom: 3, fontSize: 10, letterSpacing: 1 }}>{l}</ThemedText>
              <ThemedText variant="sub" weight={700} numberOfLines={2}>{v}</ThemedText>
            </View>
          ))}
        </View>
        <Label>Histoire sportive</Label>
        <View style={{ marginBottom: 18 }}>{x.sportStory ? <ThemedText variant="title3" weight={400} style={{ fontSize: 16, lineHeight: 24 }}>{x.sportStory}</ThemedText> : empty('À renseigner avec le coach.')}</View>
        <Label>Forces (VIA)</Label>
        <View style={{ marginBottom: 18 }}>
          {c && c.strengths.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {c.strengths.map((s) => (
                <View key={s} style={{ paddingVertical: 9, paddingHorizontal: 15, borderRadius: 12, backgroundColor: colors.badgeBg }}>
                  <ThemedText variant="sub" weight={500} style={{ color: colors.badgeInk }}>{s}</ThemedText>
                </View>
              ))}
            </View>
          ) : empty('Forces à identifier ensemble.')}
        </View>
        {c?.seasonDream ? (
          <View style={{ padding: 16, borderRadius: 16, backgroundColor: colors.tintSoft }}>
            <ThemedText variant="eyebrow" color="tintText" style={{ marginBottom: 4 }}>Rêve de saison</ThemedText>
            <ThemedText variant="title3" weight={400} style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 25 }}>{`« ${c.seasonDream} »`}</ThemedText>
          </View>
        ) : null}
      </>
    );
  }
  if (kind === 'objectif') {
    return (
      <>
        <View style={{ padding: 18, borderRadius: 16, backgroundColor: colors.badgeBg, marginBottom: 18 }}>
          <Label>Objectif SMART</Label>
          <ThemedText variant="title3" weight={500} style={{ fontSize: 19, lineHeight: 26 }}>{c?.smartGoal ?? 'Objectif SMART à co-construire avec le coach.'}</ThemedText>
        </View>
        {c?.lifeSkillGoal ? (
          <View style={{ marginBottom: 18 }}><Label>Objectif life skill</Label><ThemedText variant="body">{c.lifeSkillGoal}</ThemedText></View>
        ) : null}
        {x.myActions.length ? (
          <View style={{ marginBottom: 18 }}>
            <Label>Ce qui dépend de moi</Label>
            <View style={{ gap: 9 }}>
              {x.myActions.map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <View style={{ marginTop: 3 }}><Icon name="check" size={15} color={colors.tintText} strokeWidth={2.6} /></View>
                  <ThemedText variant="body" weight={500} style={{ flex: 1 }}>{t}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <View style={{ marginBottom: 18 }}><SmartChips /></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
          <ThemedText variant="sub" color="label2">Progression du parcours</ThemedText>
          <ThemedText variant="title3" weight={600} color="tintText" style={{ fontSize: 16, lineHeight: 18 }}>{`${x.pct} %`}</ThemedText>
        </View>
        <ProgressBar value={x.pct / 100} color="tint" accessibilityLabel="Progression du parcours" valueText={`${x.pct} %`} style={{ height: 10, borderRadius: 5 }} />
      </>
    );
  }
  if (kind === 'focus') {
    const w = c?.focusWord;
    return w ? (
      <View style={{ alignItems: 'center', paddingTop: 20, gap: 18 }}>
        <Velvet radius={26} style={{ alignSelf: 'stretch' }}>
          <View style={{ paddingVertical: 34, paddingHorizontal: 20, alignItems: 'center', gap: 14 }}>
            <ThemedText variant="largeTitle" weight={600} style={{ fontSize: 52, lineHeight: 58, letterSpacing: 3, textAlign: 'center' }}>{w.toUpperCase()}</ThemedText>
            <ThemedText variant="eyebrow" color="label2">{`Mot-ancre actif de ${firstName}`}</ThemedText>
          </View>
        </Velvet>
        <ThemedText variant="sub" color="label2" style={{ textAlign: 'center', maxWidth: 340 }}>
          Choisi à la séance S9, ce mot ramène l’attention au bon endroit dans les moments importants — avant un match, un examen, un moment de pression.
        </ThemedText>
      </View>
    ) : empty('Le mot-ancre sera choisi à la séance S9.');
  }
  if (kind === 'routine') {
    return (
      <>
        <RoutineSteps focusWord={c?.focusWord ?? null} big />
        <ThemedText variant="foot" color="label2" style={{ marginTop: 22 }}>
          Travaillée à la séance S6, cette routine se répète à l’identique avant chaque geste important pour installer calme et constance.
        </ThemedText>
      </>
    );
  }
  if (kind === 'lettre') {
    const sealed = x.letter === 'sealed';
    const doc = x.docIds.letter;
    return (
      <>
        <Paper laid radius={22}>
          <View style={{ padding: 22 }}>
            <ThemedText variant="title3" weight={400} color="label2" style={{ fontStyle: 'italic', marginBottom: 14, fontSize: 16, lineHeight: 20 }}>{`Chère ${firstName},`}</ThemedText>
            <LetterLines lines={[92, 100, 84, 96, 60]} gap={11} />
            {sealed ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
                <Icon name="lock" size={16} color="#46695F" />
                <ThemedText variant="foot" weight={600} color="sageText">Scellée</ThemedText>
              </View>
            ) : null}
          </View>
        </Paper>
        <ThemedText variant="sub" color="label2" style={{ marginTop: 16 }}>
          {sealed ? 'La lettre est scellée : elle s’ouvrira dans un an.' : 'La lettre sera écrite lors de la séance bilan (S13), puis scellée ici pendant un an.'}
        </ThemedText>
        {sealed && doc ? <View style={{ marginTop: 14 }}><Button label="Télécharger la lettre (PDF)" variant="gray" glyph="document" onPress={() => onOpenDoc(doc)} /></View> : null}
      </>
    );
  }
  if (kind === 'certificat') {
    const remaining = Math.max(TOTAL_SESSIONS - x.completed, 0);
    const open = x.certificate === 'available' && !!x.docIds.certificate;
    return (
      <>
        <ThemedText variant="body" color="label2" style={{ marginBottom: 20 }}>{`Reconnaissance officielle de fin de parcours de ${firstName} — débloquée à la dernière séance.`}</ThemedText>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
          <ThemedText variant="sub" color="label2">{`${x.completed}/${TOTAL_SESSIONS} séances`}</ThemedText>
          <ThemedText variant="callout" weight={600} color="label2">{remaining ? `${remaining} restante${remaining > 1 ? 's' : ''}` : 'Parcours complété'}</ThemedText>
        </View>
        <ProgressBar value={x.completed / TOTAL_SESSIONS} color="sage" accessibilityLabel="Séances validées" valueText={`${x.completed} sur ${TOTAL_SESSIONS}`} style={{ height: 11, borderRadius: 5.5 }} />
        {open ? (
          <View style={{ marginTop: 18 }}><Button label="Télécharger le certificat" variant="gray" glyph="document" onPress={() => onOpenDoc(x.docIds.certificate!)} /></View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, padding: 14, borderRadius: 15, backgroundColor: colors.tintSoft }}>
            <Icon name="lock" size={17} color={colors.tintText} />
            <ThemedText variant="sub" color="label2" style={{ flex: 1 }}>Disponible en téléchargement dès la validation de la séance 13.</ThemedText>
          </View>
        )}
      </>
    );
  }
  // docs
  return x.docs.length ? (
    <List>
      {x.docs.map((d) => <ListRow key={d.id} glyph="document" iconColor="sysIndigo" title={d.title} onPress={() => onOpenDoc(d.id)} />)}
    </List>
  ) : empty('Votre coach le complétera.');
}

export function CoachDetailSheet({ kind, onClose, firstName, x, onOpenDoc }: Props) {
  const { colors } = useTheme();
  const [info, setInfo] = useState(false);
  const meta = kind ? META[kind] : null;
  const explain = kind && kind !== 'docs' ? kind : null;
  return (
    <Sheet visible={!!kind} onClose={() => { setInfo(false); onClose(); }} title={meta?.title ?? ''} detent="large">
      {kind && meta ? (
        <View style={{ paddingTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.fill, borderWidth: 1, borderColor: colors.separator, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={meta.icon} size={22} color={colors.sageText} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="title2" weight={600} accessibilityRole="header" style={{ fontSize: 22, lineHeight: 26 }}>{meta.title}</ThemedText>
              <ThemedText variant="foot" color="label2">{`${firstName} · ${meta.session}`}</ThemedText>
            </View>
          </View>
          <Body kind={kind} firstName={firstName} x={x} onOpenDoc={onOpenDoc} />
          {explain ? (
            <View style={{ alignItems: 'flex-end', marginTop: 28 }}>
              <Button
                label="Comprendre cette carte" glyph="arrowRight" size="md" variant={kind === 'focus' ? 'gray' : 'accent'}
                onPress={() => setInfo(true)} accessibilityLabel={`Comprendre cette carte : ${meta.title}`}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      <InfoSheet visible={info} onClose={() => setInfo(false)} cardKey={explain} />
    </Sheet>
  );
}

