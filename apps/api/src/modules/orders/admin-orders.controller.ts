import {
  Body,
  Controller,
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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { OrdersService } from './orders.service';
import { ListOrdersQuery } from './dto/list-orders.query';
import {
  CancelOrderDto,
  TransitionOrderDto,
} from './dto/transition-order.dto';

/**
 * Admin/manager-facing order management — separate from /me/orders so the
 * URL space stays clean and the role guard scope is unambiguous.
 *
 * Endpoints (spec §7.4 + §7.5):
 *   GET /orders             — list with filters (status, channel, date, search)
 *   GET /orders/:id         — full detail incl. client info
 *   POST /orders/:id/transition  — forward-only lifecycle step
 *   POST /orders/:id/cancel — cancellation: restores stock, decrements promo
 *
 * Manual order creation (admin creates an order from WhatsApp/IG/etc. with
 * raw payload) is intentionally out of scope for this batch — a separate
 * follow-up that needs a manual-order DTO + commission attribution.
 */
@ApiTags('admin-orders')
@ApiBearerAuth('access-token')
@Controller({ path: 'orders', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders with filters (admin/manager).' })
  list(@Query() query: ListOrdersQuery) {
    return this.orders.listForAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.findByIdForAdmin(id);
  }

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move an order forward in the lifecycle (spec §7.5).' })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'Order', entityIdFrom: 'params.id' })
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.transitionStatus(id, dto.status, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cancel an order before SHIPPED (spec §7.5). Atomic: status → CANCELLED, stock restored via CANCELLATION_RETURN, promo usedCount decremented.',
  })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'Order', entityIdFrom: 'params.id' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.cancel(id, user.id, dto.reason);
  }
}
