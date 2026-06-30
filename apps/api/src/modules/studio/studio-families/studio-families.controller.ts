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
import { StudioFamiliesService } from './studio-families.service';
import { CreateStudioFamilyDto } from './dto/create-studio-family.dto';
import { UpdateStudioFamilyDto } from './dto/update-studio-family.dto';
import { ListStudioFamiliesQuery } from './dto/list-studio-families.query';

@ApiTags('studio-families')
@Controller({ path: 'studio/families', version: '1' })
export class StudioFamiliesController {
  constructor(private readonly families: StudioFamiliesService) {}

  // ── Public ──────────────────────────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({
    summary:
      'List active fabric families with their active fabrics + garments + photos (one round trip for the storefront).',
  })
  list(@Query() query: ListStudioFamiliesQuery) {
    return this.families.listPublic(query);
  }

  @Get('by-slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.families.findBySlug(slug);
  }

  // ── Admin ──────────────────────────────────────────────────────────

  @Get('admin')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  listAdmin(@Query() query: ListStudioFamiliesQuery) {
    return this.families.listForAdmin(query);
  }

  @Get('admin/:id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.families.findByIdForAdmin(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'StudioFabricFamily', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateStudioFamilyDto) {
    return this.families.create(dto);
  }

  @Patch('admin/:id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'StudioFabricFamily', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudioFamilyDto) {
    return this.families.update(id, dto);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'StudioFabricFamily', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.families.remove(id);
  }
}
