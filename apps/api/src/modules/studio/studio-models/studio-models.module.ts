import { Module } from '@nestjs/common';
import { StudioModelsController } from './studio-models.controller';
import { StudioModelsService } from './studio-models.service';

@Module({
  controllers: [StudioModelsController],
  providers: [StudioModelsService],
  exports: [StudioModelsService],
})
export class StudioModelsModule {}
