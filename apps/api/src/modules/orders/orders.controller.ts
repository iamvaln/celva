import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller({ path: 'me/orders', version: '1' })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

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
}
