import { PartialType } from '@nestjs/swagger';
import { CreateStudioGarmentDto } from './create-studio-garment.dto';

export class UpdateStudioGarmentDto extends PartialType(CreateStudioGarmentDto) {}
