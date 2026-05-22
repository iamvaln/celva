import {
  Body,
  Controller,
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
import { DeliveriesService } from './deliveries.service';
import { ListDeliveriesQuery } from './dto/list-deliveries.query';
import { TransitionDeliveryDto } from './dto/transition-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

/**
 * Admin endpoints: paginated list with filters, detail, lifecycle
 * transitions, and metadata edits (actualCost + trackingNote).
 * Customer endpoint lives under /me/orders/by-number/:orderNumber/delivery.
 */
@ApiTags('deliveries')
@ApiBearerAuth('access-token')
@Controller({ path: 'deliveries', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Get()
  @ApiOperation({ summary: 'List deliveries with filters (admin/manager).' })
  list(@Query() query: ListDeliveriesQuery) {
    return this.deliveries.listForAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveries.findByIdForAdmin(id);
  }

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Move the delivery forward in its lifecycle (spec §12.4). PICKED_UP / DELIVERED auto-sync the matching Order status (SHIPPED / DELIVERED) so the customer-facing surface stays current.',
  })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'Delivery', entityIdFrom: 'params.id' })
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionDeliveryDto,
  ) {
    return this.deliveries.transitionStatus(id, dto.status, dto.trackingNote);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Edit operational fields: actualCost (admin-internal, not exposed to customer) and trackingNote.',
  })
  @AuditLog({ action: 'UPDATE', entity: 'Delivery', entityIdFrom: 'params.id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryDto,
  ) {
    return this.deliveries.updateMetadata(id, dto);
  }
}

/**
 * Customer-facing read-only view of their own delivery. Mounted on the
 * /me/orders namespace so the storefront can fetch it server-side
 * alongside the existing order detail call.
 */
@ApiTags('me-deliveries')
@ApiBearerAuth('access-token')
@Controller({ path: 'me/orders', version: '1' })
export class MyDeliveryController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Get('by-number/:orderNumber/delivery')
  @ApiOperation({
    summary:
      'Read the delivery for one of my orders. Strips admin-internal fields (actualCost).',
  })
  findMine(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveries.findForUserByOrderNumber(orderNumber, user.id);
  }
}
