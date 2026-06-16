import { PartialType } from '@nestjs/swagger';
import { CreateStudioGalleryItemDto } from './create-studio-gallery-item.dto';

export class UpdateStudioGalleryItemDto extends PartialType(CreateStudioGalleryItemDto) {}
