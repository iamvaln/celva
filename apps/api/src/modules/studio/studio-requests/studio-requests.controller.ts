import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { APP_SOURCE, USER_ROLE, type AppSource } from '@celva/shared';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AuditLog } from '../../../common/interceptors/audit-log.interceptor';
import { StudioRequestsService } from './studio-requests.service';
import { CreateStudioRequestDto } from './dto/create-studio-request.dto';
import { ListStudioRequestsQuery } from './dto/list-studio-requests.query';
import { TransitionStudioRequestDto } from './dto/transition-studio-request.dto';

const APP_SOURCES = new Set<string>(Object.values(APP_SOURCE));

function readAppSource(header?: string): AppSource {
  if (header && APP_SOURCES.has(header)) return header as AppSource;
  return APP_SOURCE.API;
}

@ApiTags('studio-requests')
@Controller({ path: 'studio/requests', version: '1' })
export class StudioRequestsController {
  constructor(private readonly requests: StudioRequestsService) {}

  // ── Public ──────────────────────────────────────────────────────────

  @Post()
  @Public()
  // Spam guard. 10 / IP / hour is loose enough for a small atelier and
  // mirrors the newsletter throttle.
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @ApiOperation({
    summary:
      'Submit a Studio request (ORDER or APPOINTMENT). 201 with { id } on success. Fires a confirmation email to the customer and an internal notification to CONTACT_EMAIL.',
  })
  create(
    @Body() dto: CreateStudioRequestDto,
    @Headers('x-app-source') appSourceHeader?: string,
  ) {
    return this.requests.create(dto, readAppSource(appSourceHeader));
  }

  // ── Admin ──────────────────────────────────────────────────────────

  @Get('admin')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  listAdmin(@Query() query: ListStudioRequestsQuery) {
    return this.requests.listForAdmin(query);
  }

  @Get('admin/:id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.requests.findByIdForAdmin(id);
  }

  @Post('admin/:id/transition')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'StudioRequest', entityIdFrom: 'params.id' })
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionStudioRequestDto,
  ) {
    return this.requests.transition(id, dto.status, dto.internalNote);
  }
}
