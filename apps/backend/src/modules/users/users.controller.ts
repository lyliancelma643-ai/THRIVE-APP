import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les utilisateurs' })
  findAll() { return this.usersService.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir un utilisateur par ID' })
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Créer un utilisateur' })
  create(@Body() body: any) { return this.usersService.create(body); }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  update(@Param('id') id: string, @Body() body: any) { return this.usersService.update(id, body); }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  remove(@Param('id') id: string) { return this.usersService.remove(id); }
}
