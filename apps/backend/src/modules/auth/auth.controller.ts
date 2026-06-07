import { Controller, Get, Put, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Info: login géré côté client Supabase' })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Info: register géré côté client Supabase' })
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Profil de l\'utilisateur connecté (validé par JWT Supabase)' })
  async me(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @ApiBearerAuth()
  @Put('me')
  @ApiOperation({ summary: 'Mettre à jour son propre profil' })
  async updateMe(@CurrentUser() user: any, @Body() body: any) {
    return this.authService.updateProfile(user.id, body);
  }
}
