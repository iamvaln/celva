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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { ListPromoCodesQuery } from './dto/list-promo-codes.query';

@ApiTags('promo-codes')
@ApiBearerAuth('access-token')
@Controller({ path: 'promo-codes', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class PromoCodesController {
  constructor(private readonly promoCodes: PromoCodesService) {}

  @Get()
  @ApiOperation({ summary: 'List promo codes (admin/manager).' })
  list(@Query() query: ListPromoCodesQuery) {
    return this.promoCodes.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.promoCodes.findById(id);
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'PromoCode', entityIdFrom: 'response.id' })
  create(@Body() dto: CreatePromoCodeDto) {
    return this.promoCodes.create(dto);
  }

  @Patch(':id')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'PromoCode', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePromoCodeDto) {
    return this.promoCodes.update(id, dto);
  }

  @Delete(':id')
  @Roles(USER_ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'PromoCode', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.promoCodes.remove(id);
  }
}
