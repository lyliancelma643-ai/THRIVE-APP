import type { IconName } from '../../../design/icons';
import type { VisualId } from '../../../lib/p3';

// Correspondances identifiant → icône du jeu d'icônes de l'app (aucun emoji). Fichier pur, pour pouvoir le tester.

export const VISUAL_ICON: Record<VisualId, IconName> = {
  emotions: 'sparkles',
  thermometre: 'pulse',
  colonnes: 'hand',
  escalier: 'arrowUp',
  carte: 'people',
  sens: 'eye',
  endroits: 'home',
  outils: 'toolbox',
};

export const TOOL_ICON: Record<string, IconName> = {
  forces: 'medal',
  depend: 'hand',
  escalier: 'arrowUp',
  cran: 'target',
  mot: 'chat',
  ballon: 'pulse',
  phrase: 'quote',
  spaghetti: 'leaf',
  personnes: 'people',
  monmot: 'compass',
  film: 'video',
};

export const LIST_ICON: Record<string, IconName> = {
  voir: 'eye',
  entendre: 'pulse',
  sentir: 'hand',
  ecole: 'book',
  amis: 'people',
  maison: 'home',
};

/** Visages propres aux visuels ; joie, frustration et nervosité viennent du check-in (CheckinGlyph). */
export const EXTRA_FACE_IDS = ['peur', 'colere', 'fierte'] as const;
export const CHECKIN_FACE_IDS = ['joie', 'frustration', 'nervosite'] as const;
