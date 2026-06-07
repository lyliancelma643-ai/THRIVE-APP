import { UserRole } from '../enums/roles.enum';

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: IUser;
}

export type TCreateUser = Omit<IUser, 'id' | 'createdAt' | 'updatedAt' | 'isEmailVerified'>;
export type TUpdateUser = Partial<Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>>;
