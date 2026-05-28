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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ListSuppliersQuery } from './dto/list-suppliers.query';

@ApiTags('suppliers')
@ApiBearerAuth('access-token')
@Controller({ path: 'suppliers', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'List suppliers with search (admin/manager).' })
  list(@Query() query: ListSuppliersQuery) {
    return this.suppliers.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.findById(id);
  }

  @Post()
  @AuditLog({ action: 'CREATE', entity: 'Supplier', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto);
  }

  @Patch(':id')
  @AuditLog({ action: 'UPDATE', entity: 'Supplier', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'Supplier', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.suppliers.remove(id);
  }
}
