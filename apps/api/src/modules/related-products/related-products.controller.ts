import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { RelatedProductsService } from './related-products.service';
import { SetRelatedProductsDto } from './dto/set-related-products.dto';

@ApiTags('related-products')
@Controller({ path: 'products/:productId/related', version: '1' })
export class RelatedProductsController {
  constructor(private readonly related: RelatedProductsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List the product’s cross-sell items in sortOrder. Public (storefront).',
  })
  list(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.related.list(productId);
  }

  @Put()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({ summary: 'Full replacement of the cross-sell list (max 6).' })
  @AuditLog({ action: 'UPDATE', entity: 'Product' })
  setRelated(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetRelatedProductsDto,
  ) {
    return this.related.setRelated(productId, dto);
  }
}
