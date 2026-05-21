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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { SavedPaymentMethodsService } from './saved-payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

/**
 * Self-service controller for saved Mobile Money methods (OM, MTN MoMo).
 * Cash-on-delivery is not saveable — there's no state to remember.
 * Storefront masks phoneNumber for display (spec §0); API returns the
 * full value to the owning user (needed for OM/MoMo callback wiring in
 * Phase 3 / S).
 */
@ApiTags('saved-payment-methods')
@ApiBearerAuth('access-token')
@Controller({ path: 'me/payment-methods', version: '1' })
export class SavedPaymentMethodsController {
  constructor(private readonly methods: SavedPaymentMethodsService) {}

  @Get()
  @ApiOperation({ summary: 'List my saved Mobile Money methods (default first).' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.methods.listForUser(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.methods.findByIdForUser(id, user.id);
  }

  @Post()
  @AuditLog({ action: 'CREATE', entity: 'SavedPaymentMethod', entityIdFrom: 'response.id' })
  create(
    @Body() dto: CreatePaymentMethodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.methods.create(user.id, dto);
  }

  @Patch(':id')
  @AuditLog({ action: 'UPDATE', entity: 'SavedPaymentMethod', entityIdFrom: 'params.id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentMethodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.methods.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'SavedPaymentMethod', entityIdFrom: 'params.id' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.methods.remove(id, user.id);
  }
}
