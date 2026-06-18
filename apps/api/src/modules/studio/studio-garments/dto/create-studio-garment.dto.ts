import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BilingualLongTextDto,
  BilingualTextDto,
} from '../../../../common/dto/bilingual-text.dto';

export class CreateStudioGarmentDto {
  @ApiProperty({ description: 'Parent fabric family id.' })
  @IsUUID()
  familyId!: string;

  @ApiProperty({ type: BilingualTextDto })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  name!: BilingualTextDto;

  @ApiPropertyOptional({ type: BilingualLongTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualLongTextDto)
  description?: BilingualLongTextDto;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
