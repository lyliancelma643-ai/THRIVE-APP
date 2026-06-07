import { z } from 'zod';
import { AgeGroup } from '../enums/age-group.enum';
import { ProgramStatus, SessionStatus } from '../enums/program-status.enum';

export const CreateProgramSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  ageGroup: z.nativeEnum(AgeGroup),
  status: z.nativeEnum(ProgramStatus).default(ProgramStatus.DRAFT),
  totalSessions: z.number().int().min(1).max(50).default(13),
  coachId: z.string().uuid(),
});

export const CreateSessionSchema = z.object({
  programId: z.string().uuid(),
  childId: z.string().uuid(),
  sessionNumber: z.number().int().min(1).max(50),
  title: z.string().min(3).max(200),
  status: z.nativeEnum(SessionStatus).default(SessionStatus.SCHEDULED),
  scheduledAt: z.coerce.date(),
  duration: z.number().int().min(15).max(180).optional(),
});

export type TCreateProgramInput = z.infer<typeof CreateProgramSchema>;
export type TCreateSessionInput = z.infer<typeof CreateSessionSchema>;
