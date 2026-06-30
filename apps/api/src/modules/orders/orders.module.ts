import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { GuestOrdersController } from './guest-orders.controller';
import { OrdersService } from './orders.service';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { PaymentsModule } from '../payments/payments.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DeliveryZonesModule,
    PromoCodesModule,
    PaymentsModule,
    InvoicesModule,
    CommissionsModule,
    AuthModule,
  ],
  controllers: [OrdersController, AdminOrdersController, GuestOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
