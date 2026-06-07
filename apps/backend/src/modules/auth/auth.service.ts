import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async login(email: string, password: string) {
    return {
      message: 'Le login se fait côté client avec Supabase Auth.',
      strategy: 'client-direct-supabase',
      email,
    };
  }

  async register(data: any) {
    return {
      message: 'Le register se fait côté client avec Supabase Auth.',
      strategy: 'client-direct-supabase',
      data,
    };
  }

  async refreshToken(refreshToken: string) {
    return {
      message: 'Le refresh se fait côté client avec Supabase Auth.',
      strategy: 'client-direct-supabase',
      refreshToken,
    };
  }
}
