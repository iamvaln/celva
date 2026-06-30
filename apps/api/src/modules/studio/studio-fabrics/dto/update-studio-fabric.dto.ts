import { PartialType } from '@nestjs/swagger';
import { CreateStudioFabricDto } from './create-studio-fabric.dto';

export class UpdateStudioFabricDto extends PartialType(CreateStudioFabricDto) {}
