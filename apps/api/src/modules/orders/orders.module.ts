import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersService } from './orders.service';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [DeliveryZonesModule, PromoCodesModule, PaymentsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
