import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { ProductionOrdersService } from './production-orders.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { ListProductionOrdersQuery } from './dto/list-production-orders.query';

@ApiTags('production-orders')
@ApiBearerAuth('access-token')
@Controller({ path: 'production-orders', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class ProductionOrdersController {
  constructor(private readonly productionOrders: ProductionOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List production orders with filters (admin/manager).' })
  list(@Query() query: ListProductionOrdersQuery) {
    return this.productionOrders.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionOrders.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a PLANNED production order with consumptions + stages.' })
  @AuditLog({ action: 'CREATE', entity: 'ProductionOrder', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateProductionOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productionOrders.create(dto, user.id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PLANNED → IN_PROGRESS. Consumes raw materials (decrements stock).' })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'ProductionOrder', entityIdFrom: 'params.id' })
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionOrders.start(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'IN_PROGRESS → COMPLETED. Restocks the finished-good variant (single-variant products), recomputes Product.costPrice, books labour/subcontract EXPENSE.',
  })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'ProductionOrder', entityIdFrom: 'params.id' })
  complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productionOrders.complete(id, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a PLANNED / IN_PROGRESS order (restocks materials if started).' })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'ProductionOrder', entityIdFrom: 'params.id' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productionOrders.cancel(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'ProductionOrder', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.productionOrders.remove(id);
  }
}
