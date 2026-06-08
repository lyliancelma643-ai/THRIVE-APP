// Type complet d'un enfant — aligné sur la table `children` Supabase
export interface IChild {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;   // ISO 8601 YYYY-MM-DD
  gender?: string;
  sport?: string;          // ex: 'Football', 'Tennis', 'Natation'
  notes?: string;          // infos libres pour le coach/admin
  avatar_url?: string;
  is_active: boolean;
  created_at?: string;
}

export interface ICreateChildDTO {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string;
  sport?: string;
  notes?: string;
}

export interface IChildProgress {
  childId: string;
  programId: string;
  sessionsCompleted: number;
  totalSessions: number;
  progressPercentage: number;
  lastSessionAt?: Date;
  badges: IBadge[];
}

export interface IBadge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: Date;
}

export interface IQuestionnaire {
  id: string;
  childId: string;
  sessionId: string;
  answers: IAnswer[];
  completedAt?: Date;
  createdAt: Date;
}

export interface IAnswer {
  questionId: string;
  value: string | number | boolean;
}
