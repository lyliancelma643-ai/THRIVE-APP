import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChildrenService } from './children.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@thrive/shared';
import { CreateChildDto } from './dto/CreateChild.dto';

@ApiTags('children')
@ApiBearerAuth()
@Controller('children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Get()
  @ApiOperation({ summary: "Enfants d'une famille" })
  findByFamily(@Query('familyId') familyId: string) {
    return this.childrenService.findByFamily(familyId);
  }

  @Post()
  @Roles(UserRole.PARENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ajouter un enfant' })
  create(@Body() body: CreateChildDto) {
    return this.childrenService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: "Profil complet d'un enfant avec badges" })
  findOne(@Param('id') id: string) {
    return this.childrenService.findOne(id);
  }
}
