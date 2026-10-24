import { Pressable, View } from 'react-native';
import { Button, GlassButton, Icon, ThemedText, useTheme } from '../../design';
import type { P3Activity, StepTimer, VisualId } from '../../lib/p3';
import { TONE_BG } from './PlayTimer';
import {
  EXT_LABELS, allRevealed, extensionPlanned, extensionVisible, frTypo, nextIsNewStep, revealedBeatsOfStep, timerSummary, secondsLabel,
  visibleStepIndex, type ExtState, type FlatBeat,
} from './flow';
import { Disclosure, Display, Eyebrow, Frame, InlineMd, type Chrome } from './parts';
import { VisualButton } from './visuals/VisualButton';
import { PlusMenu, type PlusAction } from './PlusMenu';

type Props = {
  chrome: Chrome;
  /** Titres des étapes pour l'écran (screen_steps). */
  steps: string[];
  guide: P3Activity['guide'];
  flat: FlatBeat[];
  /** Nombre de « temps » déjà affichés : un tap sur « Suivant » en ajoute UN. */
  revealed: number;
  extensions: P3Activity['extensions'];
  ext: ExtState;
  baseDuration: number;
  /** « Noter » ou « La lettre » ; null si la fiche n'a rien à garder. */
  noteLabel: string | null;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  onNote: () => void;
  onOpenExt: (index: number) => void;
  onLaunchTimer: (timer: StepTimer) => void;
  /** MV : ouvre le visuel d'une étape (« Montrer : … »). Absent : le bouton n'est pas affiché. */
  onShowVisual?: (id: VisualId) => void;
  /** Favori / De côté depuis le « + » (mêmes listes que la fiche, réunies dans « Mes favoris »). */
  saved?: { favori: boolean; deCote: boolean; onToggleFavori: () => void; onToggleDeCote: () => void };
};

/** « Dis » : la phrase à dire, en bulle ; la dernière affichée est mise en avant (filet sauge). */
function SayBubble({ text, hot }: { text: string; hot: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingVertical: 16, paddingHorizontal: 20, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomRightRadius: 22, borderBottomLeftRadius: 8,
        borderWidth: 1, borderColor: hot ? colors.sage : colors.separator, backgroundColor: hot ? colors.bgGrouped2 : colors.fill4,
      }}
    >
      <ThemedText variant="eyebrow" color="sageText" style={{ letterSpacing: 1.2 }}>Dis</ThemedText>
      <Display size={22} lineHeight={29} italic style={{ marginTop: 6 }}>{frTypo(text)}</Display>
    </View>
  );
}

/** Minuteur de jeu d'une étape : lancé à la main par le parent, UNE fois (bouton gris : le jaune est pour « Suivant »). */
function StepTimerCard({ timer, onLaunch }: { timer: StepTimer; onLaunch: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 16, padding: 16, borderRadius: 22, backgroundColor: colors.fill4, borderWidth: 1, borderColor: colors.separator }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sage }}>
          <Icon name="play" size={16} color={colors.navy900} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText variant="callout" weight={600}>{`Minuteur · ${timerSummary(timer)}`}</ThemedText>
          <ThemedText variant="foot" color="label2">
            {timer.rounds > 1 ? 'Lance une fois : l’écran enchaîne les tours tout seul.' : 'À lancer quand vous êtes prêts, tous les deux.'}
          </ThemedText>
        </View>
      </View>
      <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }} accessibilityLabel="Les phases">
        {timer.phases.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: TONE_BG[p.tone], borderWidth: 1, borderColor: colors.separator }} />
            <ThemedText variant="foot" color="label2">{`${p.label} · ${secondsLabel(p.seconds)}`}</ThemedText>
          </View>
        ))}
      </View>
      <Button variant="gray" label="Lancer le minuteur" onPress={onLaunch} style={{ marginTop: 14 }} />
    </View>
  );
}

/**
 * DerouleView — M / M5 · Moment en cours : le déroulé se construit SUR LA MÊME PAGE. Chaque « Suivant » ajoute en dessous la chose à
 * faire ou la phrase à dire, une à la fois, jamais automatiquement. Par étape : « Si ça bloque », minuteur de jeu
 * (lancé par le parent). À la fin du déroulé : « Vous avez encore envie, tous les deux ? » (+10 min, pastilles sauge)
 * puis « Terminer l'activité ». Le temps vit dans la barre du haut (anneau) ; vue purement présentationnelle.
 */
export function DerouleView({
  chrome, steps, guide, flat, revealed, extensions, ext, baseDuration, noteLabel, onNext, onPrev, onFinish, onNote, onOpenExt, onLaunchTimer, onShowVisual, saved,
}: Props) {
  const { colors } = useTheme();
  const total = flat.length;
  const done = allRevealed(revealed, total);
  const visible = visibleStepIndex(flat, revealed);
  const extOpened = ext.open.length > 0;
  const newStep = nextIsNewStep(flat, revealed);
  const plus: PlusAction[] = [
    // Avant la fin du déroulé, « Terminer maintenant » vit dans le + : le bouton principal garde toute la largeur.
    ...(!done ? [{ key: 'finish', glyph: 'check' as const, label: 'Terminer l’activité maintenant', onPress: onFinish }] : []),
    ...(noteLabel ? [{ key: 'note', glyph: 'pencil' as const, label: noteLabel, onPress: onNote }] : []),
    ...(saved
      ? [
          { key: 'fav', glyph: 'star' as const, label: saved.favori ? 'Retirer des favoris' : 'Ajouter aux favoris', on: saved.favori, onPress: saved.onToggleFavori },
          { key: 'aside', glyph: 'tray' as const, label: saved.deCote ? 'Ne plus mettre de côté' : 'Mettre de côté', on: saved.deCote, onPress: saved.onToggleDeCote },
        ]
      : []),
  ];

  return (
    <Frame
      chrome={chrome}
      revealKey={`${revealed}|${ext.open.length}`}
      padBottom={230}
      ctaGlass
      cta={
        <>
          {revealed > 1 ? <GlassButton glyph="chevronLeft" accessibilityLabel="Revenir d’un cran" onPress={onPrev} /> : null}
          {done ? (
            <Button size="xl" variant="accent" label="Terminer l’activité" flex onPress={onFinish} />
          ) : (
            <Button size="xl" variant="accent" label={newStep ? 'Étape suivante' : 'Suivant'} flex onPress={onNext} />
          )}
          {/* Le « + » en bas à droite : Noter, Favori, Mettre de côté. */}
          <PlusMenu actions={plus} />
        </>
      }
    >
      {guide.slice(0, visible + 1).map((g, stepIdx) => {
        const current = stepIdx === visible && !(done && extOpened);
        const beats = revealedBeatsOfStep(flat, stepIdx, revealed);
        const lastBeatIndex = revealed - 1;
        return (
          <View
            key={stepIdx}
            style={{ marginTop: stepIdx > 0 ? 36 : 0, paddingTop: stepIdx > 0 ? 30 : 0, borderTopWidth: stepIdx > 0 ? 1 : 0, borderTopColor: colors.separator, opacity: current ? 1 : 0.6 }}
          >
            <Eyebrow>{`Étape ${stepIdx + 1} sur ${guide.length}`}</Eyebrow>
            {steps[stepIdx] ? (
              <InlineMd text={steps[stepIdx]} variant="title1" style={{ marginTop: 8, fontSize: 28, lineHeight: 34, fontWeight: '400' }} />
            ) : null}
            <View style={{ marginTop: 16, gap: 12 }}>
              {beats.map(({ beat, k, step }) => {
                const hot = current && flat.findIndex((f) => f.step === step && f.k === k) === lastBeatIndex;
                return beat.kind === 'dire' ? (
                  <SayBubble key={k} text={beat.text} hot={hot} />
                ) : (
                  <View key={k} style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 4 }}>
                    <View style={{ marginTop: 3 }}><Icon name="arrowRight" size={18} color={colors.sageText} strokeWidth={2.2} /></View>
                    <View style={{ flex: 1 }}>
                      <InlineMd text={beat.text} color={hot ? 'label' : 'label2'} style={hot ? { fontWeight: '600' } : undefined} />
                    </View>
                  </View>
                );
              })}
            </View>
            {g.visual && onShowVisual ? <VisualButton id={g.visual} onOpen={onShowVisual} /> : null}
            {g.help ? (
              <Disclosure title="Si ça bloque">
                <InlineMd text={g.help} variant="callout" color="label2" />
              </Disclosure>
            ) : null}
            {g.timer ? <StepTimerCard timer={g.timer} onLaunch={() => onLaunchTimer(g.timer!)} /> : null}
          </View>
        );
      })}

      {done && extensions.length > 0 ? (
        <View style={{ marginTop: 34, paddingTop: 30, borderTopWidth: 1, borderTopColor: colors.separator, gap: 16 }}>
          <Eyebrow>Vous avez encore envie, tous les deux ?</Eyebrow>
          {extensions.map((x, i) => {
            if (!extensionVisible(ext.open, i)) return null;
            const open = ext.open.includes(i);
            const planned = extensionPlanned(x, baseDuration);
            return open ? (
              <View key={i} style={{ padding: 20, borderRadius: 26, backgroundColor: colors.bgGrouped2, borderWidth: 1, borderColor: colors.sage }}>
                <Eyebrow>{`+10 min — ${EXT_LABELS[x.kind]}`}</Eyebrow>
                <InlineMd text={x.text} style={{ marginTop: 10 }} />
              </View>
            ) : (
              <Pressable
                key={i}
                onPress={() => onOpenExt(i)}
                accessibilityRole="button"
                accessibilityLabel={`${EXT_LABELS[x.kind]}. ${planned ? 'Prévu dans ton temps choisi' : 'Ajoute 10 minutes au minuteur'}`}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, borderWidth: 2, borderColor: colors.sage, opacity: pressed ? 0.8 : 1 })}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sage }}>
                  <ThemedText variant="callout" weight={800} style={{ color: colors.navy900 }}>+10</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="headline" weight={700}>{EXT_LABELS[x.kind]}</ThemedText>
                  <ThemedText variant="sub" color="label2">{planned ? 'Prévu dans ton temps choisi' : 'Ajoute 10 minutes au minuteur'}</ThemedText>
                </View>
                <Icon name="chevronRight" size={20} color={colors.label2} strokeWidth={2.2} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

    </Frame>
  );
}

