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
import { StudioModelsService } from './studio-models.service';
import { CreateStudioModelDto } from './dto/create-studio-model.dto';
import { UpdateStudioModelDto } from './dto/update-studio-model.dto';
import { ListStudioModelsQuery } from './dto/list-studio-models.query';

/**
 * A StudioModel is one photo of a garment already cut/sewn (multiple per
 * garment for different angles or clients). Admin-only — the public
 * storefront reads photos through the eager-loaded relation on
 * /studio/families.
 */
@ApiTags('studio-models')
@ApiBearerAuth('access-token')
@Controller({ path: 'studio/models', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class StudioModelsController {
  constructor(private readonly models: StudioModelsService) {}

  @Get('admin')
  @ApiOperation({ summary: 'List Studio model photos (admin). Filter by garmentId.' })
  listAdmin(@Query() query: ListStudioModelsQuery) {
    return this.models.listForAdmin(query);
  }

  @Get('admin/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.models.findByIdForAdmin(id);
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'StudioModel', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateStudioModelDto) {
    return this.models.create(dto);
  }

  @Patch('admin/:id')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'StudioModel', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudioModelDto) {
    return this.models.update(id, dto);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'StudioModel', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.models.remove(id);
  }
}
