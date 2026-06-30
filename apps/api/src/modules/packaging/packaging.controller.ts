import {
  Body,
  Controller,
  Delete,
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
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { PackagingService } from './packaging.service';
import { RecordPackagingDto } from './dto/record-packaging.dto';

/**
 * Packaging consumption for a delivery (spec §12.6). Recording a packaging
 * material decrements its raw-material stock; the per-delivery cost is the
 * sum of quantity × unitPrice.
 */
@ApiTags('packaging')
@ApiBearerAuth('access-token')
@Controller({ path: 'deliveries/:deliveryId/packaging', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class PackagingController {
  constructor(private readonly packaging: PackagingService) {}

  @Get()
  @ApiOperation({ summary: 'List packaging consumptions for a delivery + total cost.' })
  list(@Param('deliveryId', ParseUUIDPipe) deliveryId: string) {
    return this.packaging.listForDelivery(deliveryId);
  }

  @Post()
  @ApiOperation({ summary: 'Record a packaging material used on this delivery (decrements stock).' })
  @AuditLog({ action: 'CREATE', entity: 'PackagingConsumption', entityIdFrom: 'response.id' })
  record(
    @Param('deliveryId', ParseUUIDPipe) deliveryId: string,
    @Body() dto: RecordPackagingDto,
  ) {
    return this.packaging.record(deliveryId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'PackagingConsumption', entityIdFrom: 'params.id' })
  async remove(
    @Param('deliveryId', ParseUUIDPipe) deliveryId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.packaging.remove(deliveryId, id);
  }
}
