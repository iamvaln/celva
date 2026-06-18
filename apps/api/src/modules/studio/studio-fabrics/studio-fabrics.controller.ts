import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AuditLog } from '../../../common/interceptors/audit-log.interceptor';
import { StudioFabricsService } from './studio-fabrics.service';
import { CreateStudioFabricDto } from './dto/create-studio-fabric.dto';
import { UpdateStudioFabricDto } from './dto/update-studio-fabric.dto';
import { ListStudioFabricsQuery } from './dto/list-studio-fabrics.query';

/**
 * Fabrics live under each fabric family. Admin-only — the public storefront
 * reads fabrics through the eager-loaded relation on /studio/families.
 */
@ApiTags('studio-fabrics')
@ApiBearerAuth('access-token')
@Controller({ path: 'studio/fabrics', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class StudioFabricsController {
  constructor(private readonly fabrics: StudioFabricsService) {}

  @Get('admin')
  @ApiOperation({ summary: 'List Studio fabrics (admin). Filter by familyId.' })
  listAdmin(@Query() query: ListStudioFabricsQuery) {
    return this.fabrics.listForAdmin(query);
  }

  @Get('admin/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.fabrics.findByIdForAdmin(id);
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'StudioFabric', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateStudioFabricDto) {
    return this.fabrics.create(dto);
  }

  @Patch('admin/:id')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'StudioFabric', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudioFabricDto) {
    return this.fabrics.update(id, dto);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'StudioFabric', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.fabrics.remove(id);
  }
}
