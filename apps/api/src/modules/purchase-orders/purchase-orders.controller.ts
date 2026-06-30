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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { ListPurchaseOrdersQuery } from './dto/list-purchase-orders.query';

@ApiTags('purchase-orders')
@ApiBearerAuth('access-token')
@Controller({ path: 'purchase-orders', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrders: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List purchase orders with filters (admin/manager).' })
  list(@Query() query: ListPurchaseOrdersQuery) {
    return this.purchaseOrders.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseOrders.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a DRAFT purchase order. totalAmount = Σ items + Σ costs.' })
  @AuditLog({ action: 'CREATE', entity: 'PurchaseOrder', entityIdFrom: 'response.id' })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseOrders.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a DRAFT purchase order. Items / costs replace wholesale.' })
  @AuditLog({ action: 'UPDATE', entity: 'PurchaseOrder', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseOrders.update(id, dto);
  }

  @Post(':id/order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'DRAFT → ORDERED. Locks the PO for edits.' })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'PurchaseOrder', entityIdFrom: 'params.id' })
  order(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseOrders.order(id);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Receive lines (cumulative quantities). Increments RawMaterial.stockQty by the delta. Full reception → RECEIVED + books one EXPENSE/RAW_MATERIALS Transaction; otherwise PARTIALLY_RECEIVED.',
  })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'PurchaseOrder', entityIdFrom: 'params.id' })
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrders.receive(id, dto, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a DRAFT / ORDERED PO (only if nothing received yet).' })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'PurchaseOrder', entityIdFrom: 'params.id' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseOrders.cancel(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(USER_ROLE.ADMIN)
  @ApiOperation({ summary: 'Delete a DRAFT PO outright (ADMIN only).' })
  @AuditLog({ action: 'DELETE', entity: 'PurchaseOrder', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.purchaseOrders.remove(id);
  }
}
