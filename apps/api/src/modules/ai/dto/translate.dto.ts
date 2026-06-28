import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const LOCALES = ['fr', 'en'] as const;
type Locale = (typeof LOCALES)[number];

const KINDS = ['name', 'description', 'text'] as const;
type Kind = (typeof KINDS)[number];

/**
 * Translate a single bilingual content field between FR and EN. The source
 * text is the already-filled locale; the result fills the empty locale.
 */
export class TranslateDto {
  @ApiProperty({ example: 'Robe en wax aux couleurs vives' })
  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  text!: string;

  @ApiProperty({ enum: LOCALES })
  @IsEnum(LOCALES)
  sourceLocale!: Locale;

  @ApiProperty({ enum: LOCALES })
  @IsEnum(LOCALES)
  targetLocale!: Locale;

  @ApiPropertyOptional({
    enum: KINDS,
    description: 'Hint about the field being translated (tunes the prompt).',
  })
  @IsOptional()
  @IsIn(KINDS)
  kind?: Kind;
}

export { LOCALES, KINDS };
export type { Locale, Kind };
