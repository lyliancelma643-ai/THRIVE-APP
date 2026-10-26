import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THRESH, pickMicrocopy, type MicroContext, type MicroData, type PickedMicro } from '@thrive/shared';
import { Eyebrow, NcCard, WText, useWeb } from '../../design/web';
import { Rise } from './Rise';

const KEPT_KEY = 'thrive.microtips.kept';
const ANSWERS_KEY = 'thrive.microtips.answers';
// Mémoire de session : jamais deux fois le même d'affilée, d'une attente à l'autre.
let lastShownId: string | null = null;

const EYEBROW = { definition: 'Un mot pour comprendre', parent: 'Pour toi, ce soir', reminder: 'Rien à faire', question: 'Une petite question' } as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export type MicroTipProps = {
  context: MicroContext;
  week?: number | null;
  childName?: string | null;
  data?: MicroData;
  /** Famille imposée (ex. 'question' à la fin d'une activité). */
  family?: 'question';
  /** Remplacé après 3 500 ms si l'attente continue (écrans de chargement). */
  rotate?: boolean;
};

/**
 * Un seul petit mot par attente, choisi par contexte (jamais au hasard). « Garder ce mot » et les réponses aux
 * petites questions restent sur l'appareil (phase 1, aucune table).
 */
export function MicroTip({ context, week, childName, data, family, rotate = false }: MicroTipProps) {
  const w = useWeb();
  const [tip, setTip] = useState<PickedMicro | null>(() => pickMicrocopy({ context, week, childName, data, family, lastShownId }));
  const [kept, setKept] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const dataKey = JSON.stringify(data ?? {});
  const ctxRef = useRef({ context, week, childName, data, family });
  ctxRef.current = { context, week, childName, data, family };

  useEffect(() => {
    if (tip) lastShownId = tip.id;
  }, [tip]);
  useEffect(() => {
    void readJson<string[]>(KEPT_KEY, []).then(setKept);
  }, []);
  // Le contexte arrive parfois après le premier rendu (prénom, semaine) : on choisit une fois les données là, sans tourner.
  useEffect(() => {
    if (!tip) setTip(pickMicrocopy({ ...ctxRef.current, lastShownId }));
  }, [tip, childName, week, dataKey]);
  useEffect(() => {
    if (!rotate) return;
    const id = setTimeout(() => setTip(pickMicrocopy({ ...ctxRef.current, lastShownId })), THRESH.tipSwap);
    return () => clearTimeout(id);
  }, [rotate]);

  const isKept = useMemo(() => (tip ? kept.includes(tip.id) : false), [kept, tip]);
  if (!tip) return null;

  const keep = async () => {
    const next = isKept ? kept.filter((k) => k !== tip.id) : [...kept, tip.id];
    setKept(next);
    try {
      await AsyncStorage.setItem(KEPT_KEY, JSON.stringify(next));
    } catch {
      /* local seulement */
    }
  };
  const reply = async (opt: string) => {
    setAnswer(opt);
    const all = await readJson<Record<string, { value: string; at: string }>>(ANSWERS_KEY, {});
    try {
      await AsyncStorage.setItem(ANSWERS_KEY, JSON.stringify({ ...all, [tip.id]: { value: opt, at: new Date().toISOString() } }));
    } catch {
      /* local seulement */
    }
  };

  return (
    <Rise key={tip.id}>
      <NcCard padding={18} style={{ borderRadius: 22, minHeight: 3 * 26 + 18 * 2 + 20 }}>
        <Eyebrow>{EYEBROW[tip.family]}</Eyebrow>
        <View accessibilityLiveRegion="polite">
          <WText display size={20} lh={26} weight={500} tone="ink" style={{ marginTop: 8 }}>
            {tip.resolved}
          </WText>
        </View>
        {tip.family === 'question' && tip.options ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {tip.options.map((o) => (
              <Pressable
                key={o}
                onPress={() => void reply(o)}
                accessibilityRole="button"
                accessibilityState={{ selected: answer === o }}
                style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', backgroundColor: answer === o ? w.accent : w.chip }}
              >
                <WText size={15} weight={600} color={answer === o ? w.onAccent : undefined} tone="ink">
                  {o}
                </WText>
              </Pressable>
            ))}
          </View>
        ) : tip.family !== 'reminder' ? (
          <Pressable
            onPress={() => void keep()}
            accessibilityRole="button"
            accessibilityState={{ selected: isKept }}
            style={{ marginTop: 10, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
          >
            <WText size={14} weight={600} tone={isKept ? 'soft' : 'accent'}>
              {isKept ? 'Gardé dans ton carnet' : 'Garder ce mot'}
            </WText>
          </Pressable>
        ) : null}
      </NcCard>
    </Rise>
  );
}
