import { IUser } from './user.types';

export interface IFamily {
  id: string;
  name: string;
  parentId: string;
  parent?: IUser;
  children?: IChild[];
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChild {
  id: string;
  familyId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender?: string;
  avatarUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TCreateFamily = Omit<IFamily, 'id' | 'createdAt' | 'updatedAt' | 'parent' | 'children'>;
export type TCreateChild = Omit<IChild, 'id' | 'createdAt' | 'updatedAt'>;
