import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BilingualContentDto, BilingualNameDto } from './bilingual';

export class UpdateSizeGuideDto {
  @ApiPropertyOptional({ type: BilingualNameDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BilingualNameDto)
  name?: BilingualNameDto;

  @ApiPropertyOptional({ type: BilingualContentDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BilingualContentDto)
  content?: BilingualContentDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
