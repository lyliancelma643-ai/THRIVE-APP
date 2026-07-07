import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClient } from '@supabase/supabase-js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant ou invalide');
    }

    const token = authHeader.replace('Bearer ', '');

    // Valider le JWT directement avec Supabase
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Token expiré ou invalide');
    }

    // Récupérer le profil (identité + is_active uniquement)
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id, email, first_name, last_name, is_active')
      .eq('id', data.user.id)
      .single();

    if (!profile || !profile.is_active) {
      throw new UnauthorizedException('Compte inactif ou introuvable');
    }

    request.user = {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      // Autorité du rôle = app_metadata (posé par les edge functions via la
      // clé service, non modifiable par l'utilisateur) — PAS profiles.role.
      role: data.user.app_metadata?.role,
      token,
    };

    return true;
  }
}
