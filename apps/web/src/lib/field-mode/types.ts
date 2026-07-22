// Modèle de données du Mode Terrain.
//
// Le Mode Terrain ne crée AUCUNE donnée : il sélectionne et hiérarchise ce que
// contient déjà la fiche de séance (`session-scripts.json`). Les clés de saisie
// (`key`) sont donc strictement identiques à celles du mode standard, afin que
// les deux vues écrivent dans le même brouillon et le même bilan.
import type { ScriptBlock } from '../session-scripts';

/** D'où vient la phrase-clé — utile pour les tests et le débogage. */
export type KeyPhraseSource = 'verbatim' | 'megaphone' | 'intent' | 'shortest';

export type FieldModeKeyPhrase = {
  /** Texte affiché, verbatim (hors nettoyage des échappements markdown). */
  text: string;
  source: KeyPhraseSource;
};

export type FieldModeCheckItem = {
  /** `${blockIndex}-${itemIndex}` — clé du mode standard. */
  key: string;
  label: string;
};

export type FieldModeIndicator = {
  /** `${blockIndex}|${libellé brut}` — clé du mode standard. */
  key: string;
  label: string;
};

export type FieldModeNote = {
  /** Libellé brut du champ = clé du mode standard. */
  key: string;
  label: string;
  hint?: string;
};

/** Un temps de séance = une page. */
export type FieldModePage = {
  /** Identifiant stable, dérivé de l'index du bloc section. */
  id: string;
  /** Index de la page dans la séance (0-based). */
  index: number;
  /** Index du bloc `section` dans `script.blocks` — ancre de retour au mode standard. */
  blockIndex: number;
  /** Titre sans la plage horaire ni les échappements markdown. */
  title: string;
  /** Titre d'origine, intact. */
  rawTitle: string;
  /** Plage horaire en minutes depuis le début de séance, si le contenu la porte. */
  timeRange: [number, number] | null;
  /** Durée cible en minutes — jamais inventée : `null` si absente de la source. */
  durationMin: number | null;
  keyPhrase: FieldModeKeyPhrase | null;
  checklist: FieldModeCheckItem[];
  indicators: FieldModeIndicator[];
  notes: FieldModeNote[];
  /** Règles spéciales / vigilance de la section, verbatim. */
  important: string[];
  /** Tous les blocs de la section — rien n'est perdu, seulement replié. */
  detail: ScriptBlock[];
};

export type FieldModeSession = {
  title: string;
  pages: FieldModePage[];
};
