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
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AuditLog } from '../../../common/interceptors/audit-log.interceptor';
import { StudioModelsService } from './studio-models.service';
import { CreateStudioModelDto } from './dto/create-studio-model.dto';
import { UpdateStudioModelDto } from './dto/update-studio-model.dto';
import { ListStudioModelsQuery } from './dto/list-studio-models.query';

@ApiTags('studio-models')
@Controller({ path: 'studio/models', version: '1' })
export class StudioModelsController {
  constructor(private readonly models: StudioModelsService) {}

  // ── Public ──────────────────────────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({
    summary:
      'List active Studio models with their active fabrics + gallery items (one round-trip for the configurator).',
  })
  list(@Query() query: ListStudioModelsQuery) {
    return this.models.listPublic(query);
  }

  @Get('by-slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.models.findBySlug(slug);
  }

  // ── Admin ──────────────────────────────────────────────────────────

  @Get('admin')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  listAdmin(@Query() query: ListStudioModelsQuery) {
    return this.models.listForAdmin(query);
  }

  @Get('admin/:id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.models.findByIdForAdmin(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'StudioModel', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateStudioModelDto) {
    return this.models.create(dto);
  }

  @Patch('admin/:id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'StudioModel', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudioModelDto) {
    return this.models.update(id, dto);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'StudioModel', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.models.remove(id);
  }
}
