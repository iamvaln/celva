import { Type } from 'class-transformer';
import { IsObject, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BilingualContentDto, BilingualNameDto } from './bilingual';

export class CreateSizeGuideDto {
  @ApiProperty({ type: BilingualNameDto })
  @IsObject()
  @ValidateNested()
  @Type(() => BilingualNameDto)
  name!: BilingualNameDto;

  @ApiProperty({ type: BilingualContentDto, description: 'Markdown body (size tables, fit notes).' })
  @IsObject()
  @ValidateNested()
  @Type(() => BilingualContentDto)
  content!: BilingualContentDto;

  @ApiProperty({ description: 'Category this guide applies to.' })
  @IsUUID()
  categoryId!: string;
}
