import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LOCALES, type Locale } from './translate.dto';

/**
 * Generate (or improve) a short product description for the storefront, in the
 * requested locale, from the product name plus optional free-text hints.
 */
export class GenerateDescriptionDto {
  @ApiProperty({ example: 'Robe Aïssa' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  productName!: string;

  @ApiProperty({ enum: LOCALES })
  @IsEnum(LOCALES)
  locale!: Locale;

  @ApiPropertyOptional({
    description: 'Optional free-text hints: fabric, occasion, existing draft to improve, etc.',
    example: 'wax bleu, coupe ajustée, pour les cérémonies',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  hints?: string;
}
