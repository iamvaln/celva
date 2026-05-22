import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import {
  AdminInvoicesController,
  MyInvoicesController,
} from './invoices.controller';

@Module({
  controllers: [MyInvoicesController, AdminInvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
