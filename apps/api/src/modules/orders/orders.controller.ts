import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { OrdersService } from './orders.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller({ path: 'me/orders', version: '1' })
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my orders (most recent first).' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.listForUser(user.id);
  }

  @Get('by-number/:orderNumber')
  @ApiOperation({ summary: 'Lookup my order by its display number (CLV-YYYYMMDD-XXXX).' })
  findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.findByOrderNumberForUser(orderNumber, user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.findByIdForUser(id, user.id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Place an order from the current cart (spec §7.3). Atomic: validates cart + stock + promo + zone, freezes prices/tax, decrements stock via StockMovementsService, creates Order+Items+Delivery+Payment, clears cart.',
  })
  @AuditLog({ action: 'CREATE', entity: 'Order', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.createFromCart(user.id, dto);
  }

  @Post(':id/retry-payment')
  @ApiOperation({
    summary:
      'Retry a PENDING or FAILED OM/MoMo payment for one of my orders. DEV: stub auto-completes immediately. PROD (Batch S+): re-initiates the OM/MoMo SDK call and waits for the callback. Cash-on-delivery payments cannot be retried (settle offline).',
  })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'Order', entityIdFrom: 'params.id' })
  async retryPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payments.retryPayment(id, user.id);
  }
}
