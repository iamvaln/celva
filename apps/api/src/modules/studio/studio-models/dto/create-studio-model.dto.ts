import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
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

export enum StudioModelAngleDto {
  FRONT = 'FRONT',
  SIDE = 'SIDE',
  BACK = 'BACK',
  DETAIL = 'DETAIL',
}

export class CreateStudioModelDto {
  @ApiProperty({ description: 'Parent garment id.' })
  @IsUUID()
  garmentId!: string;

  @ApiProperty({ description: 'R2 key or full URL of the photo.' })
  @IsString()
  @MaxLength(500)
  imageKey!: string;

  @ApiPropertyOptional({ type: BilingualLongTextDto, description: 'Optional caption (FR/EN).' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualLongTextDto)
  caption?: BilingualLongTextDto;

  @ApiPropertyOptional({ enum: StudioModelAngleDto })
  @IsOptional()
  @IsEnum(StudioModelAngleDto)
  angle?: StudioModelAngleDto;

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
