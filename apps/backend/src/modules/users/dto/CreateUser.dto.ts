import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@thrive/shared';

export class CreateUserDto {
  @ApiProperty({ example: 'coach@thrive.app' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;

  // Seuls PARENT / COACH / CHILD sont créables via l'API ; ADMIN et
  // SUPER_ADMIN se posent uniquement via les edge functions (app_metadata).
  @ApiPropertyOptional({ enum: [UserRole.PARENT, UserRole.COACH, UserRole.CHILD] })
  @IsOptional()
  @IsEnum([UserRole.PARENT, UserRole.COACH, UserRole.CHILD])
  role?: UserRole;
}
