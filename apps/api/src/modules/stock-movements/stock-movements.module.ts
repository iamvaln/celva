import { Global, Module } from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service';

@Global()
@Module({
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
