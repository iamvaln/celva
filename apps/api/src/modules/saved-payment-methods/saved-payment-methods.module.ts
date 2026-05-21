import { Module } from '@nestjs/common';
import { SavedPaymentMethodsController } from './saved-payment-methods.controller';
import { SavedPaymentMethodsService } from './saved-payment-methods.service';

@Module({
  controllers: [SavedPaymentMethodsController],
  providers: [SavedPaymentMethodsService],
  exports: [SavedPaymentMethodsService],
})
export class SavedPaymentMethodsModule {}
