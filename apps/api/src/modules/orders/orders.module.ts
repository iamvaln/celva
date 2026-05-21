import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';

@Module({
  imports: [DeliveryZonesModule, PromoCodesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
