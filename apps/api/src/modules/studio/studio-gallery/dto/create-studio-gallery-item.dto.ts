import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BilingualLongTextDto } from '../../../../common/dto/bilingual-text.dto';

export class CreateStudioGalleryItemDto {
  @ApiProperty({ description: 'Model this gallery image links to (for the "Composer" CTA).' })
  @IsUUID()
  modelId!: string;

  @ApiProperty({ description: 'Image URL (from POST /uploads/image).' })
  @IsString()
  @MaxLength(500)
  imageKey!: string;

  @ApiPropertyOptional({ type: BilingualLongTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualLongTextDto)
  caption?: BilingualLongTextDto;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether this tile spans 2 grid rows ("tall" 3:5 aspect).',
  })
  @IsOptional()
  @IsBoolean()
  isTall?: boolean;

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
