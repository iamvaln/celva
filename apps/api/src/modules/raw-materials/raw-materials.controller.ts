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
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { RawMaterialsService } from './raw-materials.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { ListRawMaterialsQuery } from './dto/list-raw-materials.query';

@ApiTags('raw-materials')
@ApiBearerAuth('access-token')
@Controller({ path: 'raw-materials', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class RawMaterialsController {
  constructor(private readonly rawMaterials: RawMaterialsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List raw materials (admin/manager). Filters: type, supplierId, lowStock=true, search. Each row carries an isLowStock flag.',
  })
  list(@Query() query: ListRawMaterialsQuery) {
    return this.rawMaterials.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rawMaterials.findById(id);
  }

  @Post()
  @AuditLog({ action: 'CREATE', entity: 'RawMaterial', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateRawMaterialDto) {
    return this.rawMaterials.create(dto);
  }

  @Patch(':id')
  @AuditLog({ action: 'UPDATE', entity: 'RawMaterial', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRawMaterialDto) {
    return this.rawMaterials.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'RawMaterial', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.rawMaterials.remove(id);
  }
}
