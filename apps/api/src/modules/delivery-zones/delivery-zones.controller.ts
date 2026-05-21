import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { DeliveryZonesService } from './delivery-zones.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

@ApiTags('delivery-zones')
@Controller({ path: 'delivery-zones', version: '1' })
export class DeliveryZonesController {
  constructor(private readonly zones: DeliveryZonesService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary:
      'Public list of active delivery zones (storefront checkout). actualCost is intentionally omitted.',
  })
  listPublic() {
    return this.zones.listPublic();
  }

  @Get('admin')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({ summary: 'Admin list — includes actualCost.' })
  listAdmin() {
    return this.zones.listAll();
  }

  @Get(':id')
  @Public()
  findOnePublic(@Param('id', ParseUUIDPipe) id: string) {
    return this.zones.findById(id, false);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'DeliveryZone', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateDeliveryZoneDto) {
    return this.zones.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'DeliveryZone', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeliveryZoneDto) {
    return this.zones.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'DeliveryZone', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.zones.remove(id);
  }
}
