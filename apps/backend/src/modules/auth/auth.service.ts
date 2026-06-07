import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new UnauthorizedException('Profil introuvable');
    return data;
  }

  async updateProfile(userId: string, updates: Record<string, any>) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async login(email: string, password: string) {
    return {
      message: 'Login géré côté client via Supabase Auth SDK.',
      hint: 'Utilise supabase.auth.signInWithPassword() côté client.',
    };
  }

  async register(data: any) {
    return {
      message: 'Register géré côté client via Supabase Auth SDK.',
      hint: 'Utilise supabase.auth.signUp() côté client.',
    };
  }

  async refreshToken(refreshToken: string) {
    return {
      message: 'Refresh géré côté client via Supabase Auth SDK.',
      hint: 'Utilise supabase.auth.refreshSession() côté client.',
    };
  }
}
