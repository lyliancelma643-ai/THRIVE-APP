import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  async login(email: string, password: string) {
    // TODO: Implémenter avec Supabase Auth
    throw new UnauthorizedException('Not implemented yet');
  }

  async register(data: any) {
    // TODO: Implémenter avec Supabase Auth
    throw new Error('Not implemented yet');
  }

  async refreshToken(refreshToken: string) {
    // TODO: Implémenter avec Supabase Auth
    throw new UnauthorizedException('Not implemented yet');
  }

  async logout(refreshToken: string) {
    // TODO: Implémenter avec Supabase Auth
    return { success: true };
  }
}
