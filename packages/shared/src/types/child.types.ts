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
