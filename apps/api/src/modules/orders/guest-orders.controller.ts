import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { AuthService } from '../auth/auth.service';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';

/**
 * Public guest checkout (no account required). Find-or-creates a passwordless
 * user from the contact email, then places the order from the explicit
 * (client-side) cart items via the shared OrdersService.createFromItems.
 * Authenticated shoppers keep using POST /me/orders.
 */
@ApiTags('orders')
@Controller({ path: 'checkout', version: '1' })
export class GuestOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly auth: AuthService,
  ) {}

  @Public()
  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Place an order as a guest (no login). Find-or-creates a passwordless account from the email, then runs the same validation/pricing/stock/payment flow as an authenticated checkout from the explicit cart items.',
  })
  async createGuest(
    @Body() dto: CreateGuestOrderDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const user = await this.auth.findOrCreatePasswordlessUser({
      email: dto.email,
      name: dto.name,
      phone: dto.phone,
      locale: acceptLanguage,
    });
    const order = await this.orders.createFromItems(user.id, dto.items, dto);
    // Log the guest into their passwordless account so the storefront can show
    // the confirmation page (which reads /me/orders) and so the order appears
    // under their account. The token is returned in the body; the storefront
    // stashes it in its own httpOnly session cookie.
    const accessToken = await this.auth.issueGuestAccessToken(user.id);
    return { ...order, accessToken };
  }
}
