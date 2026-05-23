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
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { ListTransactionsQuery } from './dto/list-transactions.query';

@ApiTags('transactions')
@ApiBearerAuth('access-token')
@Controller({ path: 'transactions', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Paginated transactions ledger (admin/manager). Filters: type, category, date range, search.',
  })
  list(@Query() query: ListTransactionsQuery) {
    return this.transactions.list(query);
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'Aggregates total income / expense / net for an optional date window, plus per-category breakdown. Feeds the finance dashboard (Phase 6).',
  })
  summary(@Query() query: { from?: string; to?: string }) {
    return this.transactions.summary(query);
  }

  @Get('export.csv')
  @ApiOperation({
    summary:
      'Export every transaction in the optional date window as CSV (UTF-8 + BOM, RFC 4180 quoting). Designed for the accountant — column names match the admin UI.',
  })
  async exportCsv(
    @Query() query: { from?: string; to?: string },
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.transactions.exportCsv(query);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="celva-transactions-${stamp}.csv"`,
    );
    res.end(csv);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactions.findById(id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Manual entry — expenses, refunds, one-off incomes. Auto-generated SALE rows from payment completion can\'t be created here.',
  })
  @AuditLog({ action: 'CREATE', entity: 'Transaction', entityIdFrom: 'response.id' })
  create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transactions.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Edit a manual transaction. Auto-generated (order-linked) rows refuse edits.',
  })
  @AuditLog({ action: 'UPDATE', entity: 'Transaction', entityIdFrom: 'params.id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactions.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'Transaction', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.transactions.remove(id);
  }
}
