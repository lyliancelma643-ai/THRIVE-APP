import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ThemedText, useTheme } from '../../../design';
import { useTourScroll } from './anchors';
import { PENDANT_ROWS, type TourStep } from './steps';

type Rect = { x: number; y: number; w: number; h: number };

type Props = {
  visible: boolean;
  steps: TourStep[];
  /** `done` : visite terminée jusqu'au bout ; `skip` : « Passer ». Les deux la marquent comme vue. */
  onClose: (reason: 'done' | 'skip') => void;
  /** Dernière étape : « Lancer ce soir » ferme la visite puis lance l'activité recommandée. */
  onLaunch?: () => void;
};

const PAD = 8;
const BUBBLE_GAP = 14;
const SETTLE_MS = 60;

const measure = (node: { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void }) =>
  new Promise<Rect>((resolve) => node.measureInWindow((x, y, w, h) => resolve({ x, y, w, h })));

/** Voile sombre percé d'un trou arrondi autour du repère (un seul chemin, règle evenodd). */
function holePath(W: number, H: number, r: Rect) {
  const x = r.x - PAD;
  const y = r.y - PAD;
  const w = r.w + PAD * 2;
  const h = r.h + PAD * 2;
  const k = Math.min(24, w / 2, h / 2);
  return (
    `M0 0H${W}V${H}H0Z ` +
    `M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}` +
    `H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`
  );
}

/** Illustration « Pendant l'activité » : les vrais libellés des boutons, en petites étiquettes. */
function PendantVisual() {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 14, gap: 10 }}>
      {PENDANT_ROWS.map((r, i) => (
        <View key={r.tag} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 84, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
              backgroundColor: i === 1 ? colors.accent : i === 0 ? colors.bgGrouped : colors.fill3,
              borderWidth: 1, borderColor: i === 0 ? colors.sage : 'transparent',
            }}
          >
            <ThemedText variant="cap" weight={700} style={{ color: i === 1 ? colors.accentInk : i === 0 ? colors.sageText : colors.label }}>
              {r.tag}
            </ThemedText>
          </View>
          <ThemedText variant="sub" color="label2" style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>{r.text}</ThemedText>
        </View>
      ))}
    </View>
  );
}

/**
 * Visite guidée de Maison : voile + projecteur sur le repère, bulle d'explication, « Passer » toujours visible.
 * Plein écran (Modal) pour couvrir aussi la barre d'onglets ; Maison reste dessous, intacte.
 */
export function MaisonTour({ visible, steps, onClose, onLaunch }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const reg = useTourScroll();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const step = steps[index];
  const last = index === steps.length - 1;
  const stepKey = step?.key;
  const anchor = step?.anchor;

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  // À chaque étape : mesurer le repère, le ramener dans le haut de l'écran si besoin, puis afficher la bulle.
  useEffect(() => {
    if (!visible || !stepKey) return;
    let alive = true;
    setReady(false);
    const show = (r: Rect | null) => {
      if (!alive) return;
      setRect(r);
      setReady(true);
    };
    const node = anchor ? reg?.get(anchor) : null;
    if (!node || !reg) {
      show(null);
      return () => { alive = false; };
    }
    (async () => {
      let r = await measure(node);
      const top = insets.top + 76;
      const fits = r.y >= top - 20 && r.y + r.h <= H * 0.52;
      if (!fits) {
        // Saut instantané sous le voile : la mesure qui suit est juste (un défilement animé la fausserait).
        reg.scrollRef.current?.scrollTo({ y: Math.max(0, reg.offset.current + r.y - top), animated: false });
        await new Promise<void>((res) => setTimeout(res, SETTLE_MS));
        if (!alive) return;
        r = await measure(node);
      }
      show(r.w > 0 && r.h > 0 ? r : null);
    })();
    return () => { alive = false; };
    // Clé + repère plutôt que l'objet étape : la liste est recalculée à chaque rendu de Maison.
  }, [visible, stepKey, anchor, reg, insets.top, H]);

  const close = useCallback(
    (reason: 'done' | 'skip') => {
      reg?.scrollRef.current?.scrollTo({ y: 0, animated: true });
      onClose(reason);
    },
    [reg, onClose],
  );

  if (!visible || !step) return null;

  const bubbleW = Math.min(W - 32, 420);
  const left = (W - bubbleW) / 2;
  // Bulle sous le repère s'il est dans la moitié haute, sinon au-dessus ; carte centrée sans repère.
  const below = rect ? rect.y + rect.h / 2 < H / 2 : false;
  const bubblePos = rect
    ? below
      ? { top: rect.y + rect.h + PAD + BUBBLE_GAP }
      : { bottom: H - rect.y + PAD + BUBBLE_GAP }
    : { top: Math.max(insets.top + 40, H * 0.22) };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => close('skip')}>
      <View style={{ flex: 1 }} accessibilityViewIsModal>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}>
          <Svg width={W} height={H}>
            <Path d={rect ? holePath(W, H, rect) : `M0 0H${W}V${H}H0Z`} fill="rgba(2,12,18,0.74)" fillRule="evenodd" />
          </Svg>
          {rect ? (
            <View
              style={{
                position: 'absolute', left: rect.x - PAD, top: rect.y - PAD, width: rect.w + PAD * 2, height: rect.h + PAD * 2,
                borderRadius: 24, borderWidth: 2, borderColor: colors.accent,
              }}
            />
          ) : null}
        </View>


        {ready ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              position: 'absolute', left, width: bubbleW, ...bubblePos,
              padding: 20, borderRadius: 26, backgroundColor: colors.bgGrouped2, borderWidth: 1, borderColor: colors.separator,
              shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <ThemedText variant="eyebrow" color="sageText" style={{ flex: 1 }}>{step.eyebrow}</ThemedText>
              {!last ? (
                <Pressable onPress={() => close('skip')} accessibilityRole="button" accessibilityLabel="Passer la visite" hitSlop={10}>
                  <ThemedText variant="sub" weight={600} color="label2">Passer</ThemedText>
                </Pressable>
              ) : null}
            </View>
            <ThemedText variant="sectionTitle" accessibilityRole="header" style={{ marginTop: 6 }}>{step.title}</ThemedText>
            <ThemedText variant="callout" color="label2" style={{ marginTop: 8, fontSize: 16, lineHeight: 22 }}>{step.body}</ThemedText>
            {step.visual === 'pendant' ? <PendantVisual /> : null}

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 18 }} accessible accessibilityLabel={`Étape ${index + 1} sur ${steps.length}`}>
              {steps.map((s, i) => (
                <View key={s.key} style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? colors.tintText : colors.label4 }} />
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
              {last ? (
                <>
                  <Button variant="plain" size="md" label="Explorer seul" onPress={() => close('done')} />
                  {onLaunch ? (
                    <Button variant="accent" size="md" label="Lancer ce soir" flex onPress={() => { close('done'); onLaunch(); }} />
                  ) : (
                    <Button variant="accent" size="md" label="C’est compris" flex onPress={() => close('done')} />
                  )}
                </>
              ) : (
                <>
                  {index > 0 ? <Button variant="plain" size="md" label="Retour" onPress={() => setIndex((i) => i - 1)} /> : null}
                  <Button variant="accent" size="md" label={index === 0 ? 'C’est parti' : 'Suivant'} flex onPress={() => setIndex((i) => i + 1)} />
                </>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
