import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import {
  AdminInvoicesController,
  InvoicesListController,
  MyInvoicesController,
} from './invoices.controller';

@Module({
  controllers: [MyInvoicesController, AdminInvoicesController, InvoicesListController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
