import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

// Liste blanche des champs modifiables par l'utilisateur sur SON profil.
// `role` et `is_active` sont volontairement exclus : le service écrit avec la
// clé service_role (bypass RLS) → sans cette liste blanche, un body arbitraire
// permettrait une escalade de privilèges (ex. { "role": "ADMIN" }).
export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  avatar_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifications_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergency_contact_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergency_contact_phone?: string;
}
