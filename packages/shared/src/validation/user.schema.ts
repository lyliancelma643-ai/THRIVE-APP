import { z } from 'zod';
import { UserRole } from '../enums/roles.enum';

export const CreateUserSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(2, 'Prénom requis (min 2 caractères)').max(50),
  lastName: z.string().min(2, 'Nom requis (min 2 caractères)').max(50),
  role: z.nativeEnum(UserRole),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Numéro de téléphone invalide').optional(),
  avatarUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ role: true });

export const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe requis (min 8 caractères)'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Mot de passe trop court')
    .regex(/[A-Z]/, 'Doit contenir une majuscule')
    .regex(/[0-9]/, 'Doit contenir un chiffre'),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  role: z.nativeEnum(UserRole),
});

export type TCreateUserInput = z.infer<typeof CreateUserSchema>;
export type TLoginInput = z.infer<typeof LoginSchema>;
export type TRegisterInput = z.infer<typeof RegisterSchema>;
