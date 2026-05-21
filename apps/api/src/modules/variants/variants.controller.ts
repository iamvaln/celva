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
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ListVariantsQuery } from './dto/list-variants.query';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@ApiTags('product-variants')
@Controller({ path: 'variants', version: '1' })
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List variants. Filter by productId, isActive, or search the SKU.',
  })
  list(@Query() query: ListVariantsQuery) {
    return this.variants.list(query);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.variants.findById(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'CREATE', entity: 'ProductVariant', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateVariantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.variants.create(dto, user.id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'UPDATE', entity: 'ProductVariant', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVariantDto) {
    return this.variants.update(id, dto);
  }

  @Post(':id/adjust-stock')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({
    summary:
      'Apply a signed manual stock movement (MANUAL_ADJUSTMENT). Audit reason required.',
  })
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'ProductVariant', entityIdFrom: 'params.id' })
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variants.adjustStock(id, dto, user.id);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'ProductVariant', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.variants.remove(id);
  }
}
