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
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { CommissionsService } from './commissions.service';
import { ListCommissionsQuery } from './dto/list-commissions.query';
import { MarkPaidDto } from './dto/mark-paid.dto';

@ApiTags('sales-commissions')
@ApiBearerAuth('access-token')
@Controller({ path: 'sales-commissions', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Paginated commission ledger (admin/manager). Filters: status, salesRepId, date range, search across order# + rep email/name.',
  })
  list(@Query() query: ListCommissionsQuery) {
    return this.commissions.list(query);
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'Per-sales-rep totals: pending (owed) + paid amounts. Optional date window scoped via order.createdAt.',
  })
  summary(@Query() query: { from?: string; to?: string }) {
    return this.commissions.summaryBySalesRep(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.commissions.findById(id);
  }

  @Post('mark-paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Mark a batch of PENDING commissions PAID. Atomic — all-or-nothing. Records one EXPENSE Transaction per sales rep (category COMMISSION).',
  })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'SalesCommission' })
  markPaid(@Body() dto: MarkPaidDto, @CurrentUser() user: AuthenticatedUser) {
    return this.commissions.markPaid(dto.ids, user.id);
  }
}
