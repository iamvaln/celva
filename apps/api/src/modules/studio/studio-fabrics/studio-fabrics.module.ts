import { Module } from '@nestjs/common';
import { StudioFabricsController } from './studio-fabrics.controller';
import { StudioFabricsService } from './studio-fabrics.service';

@Module({
  controllers: [StudioFabricsController],
  providers: [StudioFabricsService],
  exports: [StudioFabricsService],
})
export class StudioFabricsModule {}
