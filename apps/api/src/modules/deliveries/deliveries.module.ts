import { Module } from '@nestjs/common';
import {
  DeliveriesController,
  MyDeliveryController,
} from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

@Module({
  controllers: [DeliveriesController, MyDeliveryController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
