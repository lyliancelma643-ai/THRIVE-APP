import { AgeGroup } from '../enums/age-group.enum';
import { ProgramStatus, SessionStatus } from '../enums/program-status.enum';

export interface IProgram {
  id: string;
  title: string;
  description: string;
  ageGroup: AgeGroup;
  status: ProgramStatus;
  totalSessions: number;
  coachId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISession {
  id: string;
  programId: string;
  childId: string;
  sessionNumber: number;
  title: string;
  status: SessionStatus;
  scheduledAt: Date;
  completedAt?: Date;
  coachNotes?: string;
  duration?: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}

export type TCreateProgram = Omit<IProgram, 'id' | 'createdAt' | 'updatedAt'>;
export type TCreateSession = Omit<ISession, 'id' | 'createdAt' | 'updatedAt'>;
