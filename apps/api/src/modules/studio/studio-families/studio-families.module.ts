import { Module } from '@nestjs/common';
import { StudioFamiliesController } from './studio-families.controller';
import { StudioFamiliesService } from './studio-families.service';

@Module({
  controllers: [StudioFamiliesController],
  providers: [StudioFamiliesService],
  exports: [StudioFamiliesService],
})
export class StudioFamiliesModule {}
