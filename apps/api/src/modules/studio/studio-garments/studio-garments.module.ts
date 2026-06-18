import { Module } from '@nestjs/common';
import { StudioGarmentsController } from './studio-garments.controller';
import { StudioGarmentsService } from './studio-garments.service';

@Module({
  controllers: [StudioGarmentsController],
  providers: [StudioGarmentsService],
  exports: [StudioGarmentsService],
})
export class StudioGarmentsModule {}
