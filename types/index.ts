export type AgeGroup = '8-11' | '12-14' | '15-17';
export type Sport = 'hockey' | 'soccer' | 'basketball' | 'other';
export type UserRole = 'parent' | 'child';
export type SubscriptionTier = 'free' | 'standard' | 'premium';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  age_group: AgeGroup | null;
  sport: Sport | null;
  parent_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface InteractiveQuestion {
  timestamp: number;
  question: string;
  choices: string[];
  emoji: string[];
}

export interface ParentScript {
  what_to_say: string;
  what_to_avoid: string;
  compliment_template: string;
  life_skill_summary: string;
}

export interface Session {
  id: string;
  session_number: number;
  age_group: AgeGroup;
  sport: Sport;
  title: string;
  subtitle: string;
  life_skill: string;
  mux_playback_id: string;
  duration_seconds: number;
  thumbnail_url: string;
  is_free: boolean;
  questions: InteractiveQuestion[];
  parent_script: ParentScript;
  created_at: string;
}

export interface SessionResponse {
  id: string;
  child_id: string;
  session_id: string;
  responses: { timestamp: number; question: string; choice: string }[];
  watch_percentage: number;
  completed_at: string;
}
