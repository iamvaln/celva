import { PartialType } from '@nestjs/swagger';
import { CreateStudioModelDto } from './create-studio-model.dto';

export class UpdateStudioModelDto extends PartialType(CreateStudioModelDto) {}
