import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './CreateUser.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
