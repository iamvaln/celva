import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { CommissionsModule } from '../commissions/commissions.module';

@Module({
  imports: [InvoicesModule, CommissionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
