import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFamilyDto {
  @ApiProperty({ example: 'Famille Tremblay' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Montréal' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'QC' })
  @IsOptional()
  @IsString()
  province?: string;
}
