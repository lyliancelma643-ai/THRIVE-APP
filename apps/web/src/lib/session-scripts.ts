// Fiches de séance interactives — générées depuis les documents officiels
// des 13 séances par tranche d'âge de la méthode THRIVE.
import type { AgeGroup } from './catalog';
import scripts from './session-scripts.json';

export type ScriptBlock =
  | { t: 'section'; title: string; level: number }
  | { t: 'callout'; icon: string; text: string }
  | { t: 'verbatim'; text: string }
  | { t: 'checklist'; items: string[] }
  | { t: 'grid'; items: string[] }
  | { t: 'field'; label: string; hint?: string }
  | { t: 'chips'; items: string[] }
  | { t: 'text'; text: string };

export type SessionScript = {
  title: string;
  blocks: ScriptBlock[];
  parentTemplate: string;
};

const DATA = scripts as unknown as Record<string, Record<string, SessionScript>>;

// « 0:05–0:20 — Bloc 1 » -> plage en minutes depuis le début de séance [5, 20].
// Partagé par le déroulé standard et le Mode Terrain.
export function parseTimeRange(title: string): [number, number] | null {
  const m = title.match(/^(\d+):(\d+)\s*[–-]\s*(\d+):(\d+)/);
  if (!m) return null;
  return [
    parseInt(m[1]) * 60 + parseInt(m[2]),
    parseInt(m[3]) * 60 + parseInt(m[4]),
  ];
}

export function getSessionScript(
  ageGroup: AgeGroup | null,
  sessionNumber: number | null
): SessionScript | null {
  if (!ageGroup || !sessionNumber) return null;
  return DATA[ageGroup]?.[String(sessionNumber)] ?? null;
}

// Remplit le modèle de message parent avec les vraies données
export function fillParentTemplate(
  template: string,
  childName: string,
  coachName: string
): string {
  return template
    .replace(/\[Prénom enfant\]/g, childName)
    .replace(/\[Prénom parent\]/g, '')
    .replace(/Bonjour\s*,/g, 'Bonjour,')
    .replace(/\[Prénom\]/g, childName)
    .replace(/\[Nom du coach\]/g, coachName)
    .replace(/\(copier[^)]*\)/gi, '…')
    .replace(/\(résumer[^)]*\)/gi, '…')
    .replace(/\(décrire[^)]*\)/gi, '…');
}
