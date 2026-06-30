import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { FinanceService } from './finance.service';
import { DashboardQuery } from './dto/dashboard.query';

@ApiTags('finance')
@ApiBearerAuth('access-token')
@Controller({ path: 'finance', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Composite dashboard payload: KPIs + 12-month timeseries + revenue-by-channel + expenses-by-category. Date window defaults to the current calendar month for the KPIs / channel / category breakdowns; the timeseries always returns the trailing 12 months.',
  })
  dashboard(@Query() query: DashboardQuery) {
    return this.finance.getDashboard(query);
  }

  @Get('orders/:orderId/margin')
  @ApiOperation({
    summary:
      'Per-order net margin breakdown (spec §12.7): HT revenue minus product, packaging, real delivery and commission costs.',
  })
  orderMargin(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.finance.computeOrderMargin(orderId);
  }
}
