import { Module } from '@nestjs/common';
import { StudioGalleryController } from './studio-gallery.controller';
import { StudioGalleryService } from './studio-gallery.service';

@Module({
  controllers: [StudioGalleryController],
  providers: [StudioGalleryService],
  exports: [StudioGalleryService],
})
export class StudioGalleryModule {}
