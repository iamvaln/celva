import { PartialType } from '@nestjs/swagger';
import { CreateStudioFamilyDto } from './create-studio-family.dto';

export class UpdateStudioFamilyDto extends PartialType(CreateStudioFamilyDto) {}
