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
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { SizeGuidesService } from './size-guides.service';
import { CreateSizeGuideDto } from './dto/create-size-guide.dto';
import { UpdateSizeGuideDto } from './dto/update-size-guide.dto';
import { ListSizeGuidesQuery } from './dto/list-size-guides.query';

@ApiTags('size-guides')
@Controller({ path: 'size-guides', version: '1' })
export class SizeGuidesController {
  constructor(private readonly sizeGuides: SizeGuidesService) {}

  // ── Public ──────────────────────────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all size guides with their category (storefront).' })
  list() {
    return this.sizeGuides.listPublic();
  }

  @Get('by-category/:categoryId')
  @Public()
  @ApiOperation({ summary: 'Size guides for a given category (storefront product page).' })
  byCategory(@Param('categoryId', ParseUUIDPipe) categoryId: string) {
    return this.sizeGuides.listByCategory(categoryId);
  }

  // ── Admin ───────────────────────────────────────────────────────────

  @Get('admin')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({ summary: 'List size guides (admin, paginated). Filters: categoryId, search.' })
  listAdmin(@Query() query: ListSizeGuidesQuery) {
    return this.sizeGuides.listForAdmin(query);
  }

  @Get('admin/:id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sizeGuides.findByIdForAdmin(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'CREATE', entity: 'SizeGuide', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateSizeGuideDto) {
    return this.sizeGuides.create(dto);
  }

  @Patch('admin/:id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'UPDATE', entity: 'SizeGuide', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSizeGuideDto) {
    return this.sizeGuides.update(id, dto);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'SizeGuide', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.sizeGuides.remove(id);
  }
}
