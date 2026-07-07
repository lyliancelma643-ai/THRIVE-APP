import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateChildDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  family_id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @ApiProperty({ example: '2015-04-23' })
  @IsDateString()
  date_of_birth!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;
}
