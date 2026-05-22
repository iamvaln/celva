import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Bilingual title / excerpt — short single-line strings. Both required
 * on create so neither locale is silently empty.
 */
export class BilingualShortDto {
  @ApiProperty({ example: 'Titre en français' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  fr!: string;

  @ApiProperty({ example: 'English title' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  en!: string;
}

/** Bilingual long content — markdown body, up to ~50KB per locale. */
export class BilingualLongDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50_000)
  fr!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50_000)
  en!: string;
}

/** Optional excerpt (subtitle). Empty strings allowed → treated as null. */
export class BilingualExcerptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  fr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  en?: string;
}
