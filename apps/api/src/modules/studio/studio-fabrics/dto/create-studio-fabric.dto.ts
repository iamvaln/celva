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
import { BilingualTextDto } from '../../../../common/dto/bilingual-text.dto';

export class CreateStudioFabricDto {
  @ApiProperty({ description: 'Parent fabric family id.' })
  @IsUUID()
  familyId!: string;

  @ApiProperty({ type: BilingualTextDto })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  name!: BilingualTextDto;

  @ApiPropertyOptional({ description: 'Swatch image URL (palette tile).' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  swatchImage?: string;

  @ApiPropertyOptional({ description: 'Full-frame photo of the fabric.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoImage?: string;

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
