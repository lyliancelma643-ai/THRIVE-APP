// Types et helpers du catalogue de séances 20 minutes THRIVE

export type AgeGroup = '8-11' | '12-14' | '15-17';
export type Phase = 'ANCRER' | 'DEVELOPPER' | 'INTEGRER';

export interface VideoSession {
  id: string;
  session_number: number;
  phase: Phase;
  title: string;
  subtitle: string | null;
  description: string | null;
  age_group: AgeGroup;
  theme: string;
  life_skill: string | null;
  thrive_action: string | null;
  duration_minutes: number;
  video_url: string | null;
  thumbnail_url: string | null;
  lang: string;
  is_free: boolean;
  is_active: boolean;
}

export interface InteractionAnswer {
  key: 'A' | 'B' | 'C' | 'D';
  label: string;
  tag?: string;
  score?: number;
}

export interface InteractionPoint {
  id: string;
  video_session_id: string;
  timecode_seconds: number;
  question_text: string;
  answers: InteractionAnswer[];
}

export interface VideoRun {
  id: string;
  video_session_id: string;
  child_id: string;
  parent_id: string;
  started_at: string;
  completed_at: string | null;
  progress_seconds: number;
  answers_log: { interaction_id: string; answer_key: string; answered_at: string }[];
  rpe: number | null;
}

export interface ChildProfile {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  nickname: string | null;
  jersey_number: number | null;
  accent_color: string | null;
}

export const PHASE_LABELS: Record<Phase, string> = {
  ANCRER: 'Phase 1 — Ancrer',
  DEVELOPPER: 'Phase 2 — Développer',
  INTEGRER: 'Phase 3 — Intégrer',
};

// Accent par thème (sur fond navy, brand board THRIVE)
export const THEME_ACCENTS: Record<string, { chip: string; glow: string }> = {
  'Identité': { chip: 'bg-sun text-navy-900', glow: 'from-navy-600 to-navy-900' },
  'Objectifs': { chip: 'bg-sage text-navy-900', glow: 'from-navy-500 to-navy-800' },
  'Confiance': { chip: 'bg-sun text-navy-900', glow: 'from-navy-400 to-navy-700' },
  'Émotions': { chip: 'bg-sage-light text-navy-900', glow: 'from-navy-600 to-sage-dark' },
  'Gestion du stress': { chip: 'bg-sage text-navy-900', glow: 'from-navy-700 to-navy-900' },
  'Bilan': { chip: 'bg-cream text-navy-900', glow: 'from-navy-800 to-navy-900' },
  'Connexion': { chip: 'bg-sun text-navy-900', glow: 'from-navy-500 to-sage-dark' },
  'Concentration': { chip: 'bg-sage-light text-navy-900', glow: 'from-navy-600 to-navy-800' },
  'Préparation mentale': { chip: 'bg-sun text-navy-900', glow: 'from-navy-700 to-navy-900' },
  'Transfert': { chip: 'bg-sage text-navy-900', glow: 'from-navy-600 to-navy-900' },
  'Leadership': { chip: 'bg-sun text-navy-900', glow: 'from-navy-500 to-navy-800' },
};

export function themeAccent(theme: string) {
  return THEME_ACCENTS[theme] ?? { chip: 'bg-cream text-navy-900', glow: 'from-navy-600 to-navy-900' };
}

export function ageGroupFromBirthDate(dateOfBirth: string | null): AgeGroup | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  if (age <= 11) return '8-11';
  if (age <= 14) return '12-14';
  return '15-17';
}

export function formatDuration(minutes: number) {
  return `${minutes} min`;
}
