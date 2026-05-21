import { Module } from '@nestjs/common';
import { RelatedProductsController } from './related-products.controller';
import { RelatedProductsService } from './related-products.service';

@Module({
  controllers: [RelatedProductsController],
  providers: [RelatedProductsService],
  exports: [RelatedProductsService],
})
export class RelatedProductsModule {}
