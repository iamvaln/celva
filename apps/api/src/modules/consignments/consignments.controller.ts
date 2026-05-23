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
import { ConsignmentsService } from './consignments.service';
import { ReleaseConsignmentDto } from './dto/release-consignment.dto';
import { ReconcileConsignmentDto } from './dto/reconcile-consignment.dto';
import { ListConsignmentsQuery } from './dto/list-consignments.query';

@ApiTags('consignments')
@ApiBearerAuth('access-token')
@Controller({ path: 'consignments', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class ConsignmentsController {
  constructor(private readonly consignments: ConsignmentsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Paginated consignments list (admin/manager). Filters: status, salesRepId, date range, search across notes + rep name/email.',
  })
  list(@Query() query: ListConsignmentsQuery) {
    return this.consignments.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.consignments.findById(id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Release stock to a sales rep (spec §14.1). Decrements variant.stock + bumps variant.consignedStock via CONSIGNMENT_OUT movements. Refuses if any line lacks stock — all-or-nothing.',
  })
  @AuditLog({ action: 'CREATE', entity: 'Consignment', entityIdFrom: 'response.id' })
  release(
    @Body() dto: ReleaseConsignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consignments.release(dto, user.id);
  }

  @Post(':id/reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reconcile an ACTIVE consignment (spec §14.2). Per item: sold + returned ≤ taken. Returns restock the inventory; variance (lost / damaged) is audited via paired stock movements. Off-site revenue is recorded as one INCOME/SALE Transaction. Status → RECONCILED.',
  })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'Consignment', entityIdFrom: 'params.id' })
  reconcile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReconcileConsignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consignments.reconcile(id, dto, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cancel an ACTIVE consignment — full return, no revenue recorded. Status → CANCELLED.',
  })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'Consignment', entityIdFrom: 'params.id' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consignments.cancel(id, user.id);
  }
}
