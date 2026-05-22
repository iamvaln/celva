import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BilingualExcerptDto,
  BilingualLongDto,
  BilingualShortDto,
} from './bilingual';

/** Spec §16: STYLE / BEHIND_THE_SCENES / EVENTS / GUIDES. */
const ARTICLE_CATEGORIES = ['STYLE', 'BEHIND_THE_SCENES', 'EVENTS', 'GUIDES'] as const;
type ArticleCategoryLiteral = (typeof ARTICLE_CATEGORIES)[number];

export class CreateArticleDto {
  @ApiProperty({ type: BilingualShortDto })
  @IsObject()
  @ValidateNested()
  @Type(() => BilingualShortDto)
  title!: BilingualShortDto;

  @ApiProperty({
    description: 'URL slug. Lowercase letters, digits, and dashes. Must be unique.',
    example: 'tendances-printemps-2026',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'errors.invalid_slug' })
  @MaxLength(160)
  slug!: string;

  @ApiProperty({ type: BilingualLongDto, description: 'Markdown body.' })
  @IsObject()
  @ValidateNested()
  @Type(() => BilingualLongDto)
  content!: BilingualLongDto;

  @ApiPropertyOptional({ type: BilingualExcerptDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BilingualExcerptDto)
  excerpt?: BilingualExcerptDto;

  @ApiPropertyOptional({ description: 'Cover image URL.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @ApiProperty({ enum: ARTICLE_CATEGORIES })
  @IsEnum(ARTICLE_CATEGORIES)
  category!: ArticleCategoryLiteral;
}

export { ARTICLE_CATEGORIES };
export type { ArticleCategoryLiteral };
