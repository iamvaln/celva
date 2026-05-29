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
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { ListSubscribersQuery } from './dto/list-subscribers.query';

@ApiTags('newsletter')
@Controller({ path: 'newsletter', version: '1' })
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  // ── Public ──────────────────────────────────────────────────────────

  @Post('subscribe')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  // Opt-in is cheap but a tempting spam target; cap it per IP. Kept loose
  // enough that several users behind one NAT/public IP aren't locked out.
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @ApiOperation({
    summary:
      'Subscribe an email to the newsletter (storefront). Idempotent — always 204, never reveals prior membership.',
  })
  async subscribe(@Body() dto: SubscribeNewsletterDto): Promise<void> {
    await this.newsletter.subscribe(dto);
  }

  // ── Admin ───────────────────────────────────────────────────────────

  @Get('admin')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({ summary: 'List subscribers (admin). Filters: isActive, search, sort.' })
  listAdmin(@Query() query: ListSubscribersQuery) {
    return this.newsletter.listForAdmin(query);
  }

  @Get('admin/:id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsletter.findByIdForAdmin(id);
  }

  @Post('admin/:id/unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'NewsletterSubscriber', entityIdFrom: 'params.id' })
  unsubscribe(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsletter.unsubscribe(id);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'NewsletterSubscriber', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.newsletter.remove(id);
  }
}
