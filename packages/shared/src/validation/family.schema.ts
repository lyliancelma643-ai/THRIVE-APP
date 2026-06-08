import { z } from 'zod';

export const CreateFamilySchema = z.object({
  name: z.string().min(2, 'Nom de famille requis').max(100),
  parentId: z.string().uuid('ID parent invalide'),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(50).optional(),
  postalCode: z.string().regex(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/, 'Code postal canadien invalide').optional(),
});

export const CreateChildSchema = z.object({
  familyId: z.string().uuid('ID famille invalide'),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  dateOfBirth: z.coerce.date(),
  gender: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
});

export type TCreateFamilyInput = z.infer<typeof CreateFamilySchema>;
export type TCreateChildInput = z.infer<typeof CreateChildSchema>;
