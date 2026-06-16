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
import { StudioGalleryService } from './studio-gallery.service';
import { CreateStudioGalleryItemDto } from './dto/create-studio-gallery-item.dto';
import { UpdateStudioGalleryItemDto } from './dto/update-studio-gallery-item.dto';
import { ListStudioGalleryQuery } from './dto/list-studio-gallery.query';

@ApiTags('studio-gallery')
@ApiBearerAuth('access-token')
@Controller({ path: 'studio/gallery', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class StudioGalleryController {
  constructor(private readonly gallery: StudioGalleryService) {}

  @Get('admin')
  @ApiOperation({ summary: 'List "Déjà portées" gallery items (admin).' })
  listAdmin(@Query() query: ListStudioGalleryQuery) {
    return this.gallery.listForAdmin(query);
  }

  @Get('admin/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gallery.findByIdForAdmin(id);
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'StudioGalleryItem', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateStudioGalleryItemDto) {
    return this.gallery.create(dto);
  }

  @Patch('admin/:id')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'StudioGalleryItem', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudioGalleryItemDto) {
    return this.gallery.update(id, dto);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'StudioGalleryItem', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.gallery.remove(id);
  }
}
