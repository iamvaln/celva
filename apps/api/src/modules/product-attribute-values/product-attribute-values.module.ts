import { Module } from '@nestjs/common';
import { ProductAttributeValuesController } from './product-attribute-values.controller';
import { ProductAttributeValuesService } from './product-attribute-values.service';

@Module({
  controllers: [ProductAttributeValuesController],
  providers: [ProductAttributeValuesService],
  exports: [ProductAttributeValuesService],
})
export class ProductAttributeValuesModule {}
