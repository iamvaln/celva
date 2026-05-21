import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@ApiBearerAuth('access-token')
@Controller({ path: 'me/cart', version: '1' })
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch my cart with hydrated line items + total.' })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.cart.getForUser(user.id);
  }

  @Post('items')
  @ApiOperation({
    summary: 'Add a quantity to the cart. If the variant is already there, quantities accumulate.',
  })
  @AuditLog({ action: 'UPDATE', entity: 'Cart' })
  addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cart.addItem(user.id, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({
    summary: 'Set the absolute quantity of a line. Sending 0 removes the line.',
  })
  @AuditLog({ action: 'UPDATE', entity: 'Cart' })
  updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cart.updateItem(user.id, itemId, dto);
  }

  @Delete('items/:itemId')
  @AuditLog({ action: 'UPDATE', entity: 'Cart' })
  removeItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cart.removeItem(user.id, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Empty the whole cart in one go.' })
  @AuditLog({ action: 'UPDATE', entity: 'Cart' })
  clear(@CurrentUser() user: AuthenticatedUser) {
    return this.cart.clear(user.id);
  }
}
