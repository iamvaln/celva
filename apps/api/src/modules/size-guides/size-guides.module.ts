import { Module } from '@nestjs/common';
import { SizeGuidesController } from './size-guides.controller';
import { SizeGuidesService } from './size-guides.service';

@Module({
  controllers: [SizeGuidesController],
  providers: [SizeGuidesService],
  exports: [SizeGuidesService],
})
export class SizeGuidesModule {}
