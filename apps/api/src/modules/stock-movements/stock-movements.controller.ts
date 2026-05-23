import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { StockMovementsService } from './stock-movements.service';
import { ListStockMovementsQuery } from './dto/list-stock-movements.query';

@ApiTags('stock-movements')
@ApiBearerAuth('access-token')
@Controller({ path: 'stock-movements', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class StockMovementsController {
  constructor(private readonly stockMovements: StockMovementsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Paginated stock movement audit log (admin/manager). Filters: type, variantId, date range, search across variant SKU + product name.fr.',
  })
  list(@Query() query: ListStockMovementsQuery) {
    return this.stockMovements.listForAdmin(query);
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'Per-type signed totals + counts for the optional date window. Quick inventory health pulse.',
  })
  summary(@Query() query: { from?: string; to?: string }) {
    return this.stockMovements.summaryByType(query);
  }

}
