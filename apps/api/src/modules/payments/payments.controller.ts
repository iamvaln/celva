import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { PaymentsService } from './payments.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@ApiTags('payments')
@ApiBearerAuth('access-token')
@Controller({ path: 'payments', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all payments (admin/manager).' })
  list() {
    return this.payments.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.findById(id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Mark a payment COMPLETED. Used for cash-on-delivery receipt confirmation by a manager, and as the OM/MoMo callback target. Atomic: Order CONFIRMED + Transaction INCOME + Invoice row.',
  })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'Payment', entityIdFrom: 'params.id' })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payments.markCompleted(id, user.id, {
      transactionRef: dto.transactionRef,
      method: dto.method,
      paymentAccountId: dto.paymentAccountId,
      actualAmount: dto.actualAmount,
    });
  }

  @Post(':id/mark-failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a payment FAILED. Order stays PENDING — customer can retry.' })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'Payment', entityIdFrom: 'params.id' })
  markFailed(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.markFailed(id);
  }
}
