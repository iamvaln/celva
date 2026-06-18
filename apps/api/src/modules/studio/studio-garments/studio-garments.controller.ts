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
import { StudioGarmentsService } from './studio-garments.service';
import { CreateStudioGarmentDto } from './dto/create-studio-garment.dto';
import { UpdateStudioGarmentDto } from './dto/update-studio-garment.dto';
import { ListStudioGarmentsQuery } from './dto/list-studio-garments.query';

/**
 * Garments are vêtements déjà cousus, attached to a fabric family. The
 * public storefront reads them via the eager-loaded /studio/families
 * response, so this controller is admin-only.
 */
@ApiTags('studio-garments')
@ApiBearerAuth('access-token')
@Controller({ path: 'studio/garments', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class StudioGarmentsController {
  constructor(private readonly garments: StudioGarmentsService) {}

  @Get('admin')
  @ApiOperation({ summary: 'List Studio garments (admin). Filter by familyId.' })
  listAdmin(@Query() query: ListStudioGarmentsQuery) {
    return this.garments.listForAdmin(query);
  }

  @Get('admin/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.garments.findByIdForAdmin(id);
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'StudioGarment', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateStudioGarmentDto) {
    return this.garments.create(dto);
  }

  @Patch('admin/:id')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'StudioGarment', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudioGarmentDto) {
    return this.garments.update(id, dto);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'StudioGarment', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.garments.remove(id);
  }
}
