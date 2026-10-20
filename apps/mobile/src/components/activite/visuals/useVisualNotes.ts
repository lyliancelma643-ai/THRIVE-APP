import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { TOOLS, notesFromMoments, type NoteMoment } from './content';

/** Les fiches où l'enfant a pu noter un outil dans ses mots (union des `from` de TOOLS). */
const TOOL_ACTIVITY_IDS = [...new Set(TOOLS.flatMap((t) => t.from))];

/**
 * Ce que l'enfant a noté dans ses mots, par fiche, pour « Dans ses mots » (visuel « Ses outils »). Chargé UNE fois, la première
 * fois que `enabled` passe à vrai (ouverture du visuel « Ses outils ») : aucune requête tant qu'il n'est pas montré. En cas
 * d'échec, on affiche les outils sans « Dans ses mots » plutôt que d'empêcher de montrer le visuel.
 */
export function useVisualNotes(childId: string | undefined, enabled: boolean): Record<string, string> {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!enabled || loaded || !childId) return;
    setLoaded(true);
    (async () => {
      const { data, error } = await supabase
        .from('p3_moments')
        .select('activity_id, created_at, kept_phrase, capture')
        .eq('child_id', childId)
        .in('activity_id', TOOL_ACTIVITY_IDS)
        .order('created_at', { ascending: false });
      if (!error) setNotes(notesFromMoments((data as NoteMoment[] | null) ?? []));
    })().catch(() => undefined);
  }, [enabled, loaded, childId]);
  return notes;
}
