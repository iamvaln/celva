import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Required bilingual text: both FR and EN must be present.
 * Use for Category.name, Product.name, Collection.name, etc.
 */
export class BilingualTextDto {
  @ApiProperty({ example: 'Robes' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fr!: string;

  @ApiProperty({ example: 'Dresses' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  en!: string;
}

/**
 * Optional bilingual long-form text (descriptions). Each side optional,
 * unbounded up to a reasonable cap.
 */
export class BilingualLongTextDto {
  @ApiPropertyOptional({ example: 'Description en français…' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  fr?: string;

  @ApiPropertyOptional({ example: 'English description…' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  en?: string;
}
