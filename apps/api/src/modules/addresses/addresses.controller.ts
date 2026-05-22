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
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

/**
 * Self-service controller: every endpoint operates on the authenticated
 * user's own addresses. Any role can use it (CLIENT in practice, but ADMIN
 * could too if they wanted to manage their own delivery addresses).
 * Admin views of another user's addresses are out of scope for this batch.
 */
@ApiTags('addresses')
@ApiBearerAuth('access-token')
@Controller({ path: 'me/addresses', version: '1' })
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List my saved addresses (default first).' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.addresses.listForUser(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.findByIdForUser(id, user.id);
  }

  @Post()
  @AuditLog({ action: 'CREATE', entity: 'Address', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateAddressDto, @CurrentUser() user: AuthenticatedUser) {
    return this.addresses.create(user.id, dto);
  }

  @Patch(':id')
  @AuditLog({ action: 'UPDATE', entity: 'Address', entityIdFrom: 'params.id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'Address', entityIdFrom: 'params.id' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.addresses.remove(id, user.id);
  }
}
