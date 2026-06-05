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
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { PaymentAccountsService } from './payment-accounts.service';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import { UpdatePaymentAccountDto } from './dto/update-payment-account.dto';

@ApiTags('payment-accounts')
@ApiBearerAuth('access-token')
@Controller({ path: 'payment-accounts', version: '1' })
export class PaymentAccountsController {
  constructor(private readonly accounts: PaymentAccountsService) {}

  @Get()
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({ summary: 'List all encashment accounts (treasury config).' })
  list() {
    return this.accounts.listAll();
  }

  @Get('balances')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({ summary: 'Live balance per account (Finance > Trésorerie).' })
  balances() {
    return this.accounts.balances();
  }

  @Get(':id')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.findById(id);
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'PaymentAccount', entityIdFrom: 'response.id' })
  create(@Body() dto: CreatePaymentAccountDto) {
    return this.accounts.create(dto);
  }

  @Patch(':id')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'PaymentAccount', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePaymentAccountDto) {
    return this.accounts.update(id, dto);
  }

  @Delete(':id')
  @Roles(USER_ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'PaymentAccount', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.accounts.remove(id);
  }
}
