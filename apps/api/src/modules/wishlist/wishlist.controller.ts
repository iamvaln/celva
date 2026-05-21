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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { WishlistService } from './wishlist.service';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';

/**
 * Self-service wishlist. One row per (user, variant) — the schema's
 * @@unique([userId, variantId]) keeps adds idempotent (409 if already
 * present; the storefront uses DELETE for un-wishlisting).
 */
@ApiTags('wishlist')
@ApiBearerAuth('access-token')
@Controller({ path: 'me/wishlist', version: '1' })
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'List my wishlist (newest first).' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlist.listForUser(user.id);
  }

  @Post()
  @AuditLog({ action: 'CREATE', entity: 'WishlistItem', entityIdFrom: 'response.id' })
  add(
    @Body() dto: AddWishlistItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.wishlist.add(user.id, dto.variantId);
  }

  @Delete(':variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'WishlistItem' })
  async remove(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.wishlist.remove(user.id, variantId);
  }
}
