import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FamiliesService } from './families.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@thrive/shared';

@ApiTags('families')
@ApiBearerAuth()
@Controller('families')
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Get('mine')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Ma famille avec mes enfants' })
  myFamily(@CurrentUser() user: any) {
    return this.familiesService.findByParent(user.id);
  }

  @Post()
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Créer une famille' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.familiesService.create(user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une famille' })
  findOne(@Param('id') id: string) {
    return this.familiesService.findOne(id);
  }
}
