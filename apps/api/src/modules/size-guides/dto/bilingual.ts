import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Bilingual name — short single-line label, required in both locales. */
export class BilingualNameDto {
  @ApiProperty({ example: 'Robes & hauts' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  fr!: string;

  @ApiProperty({ example: 'Dresses & tops' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  en!: string;
}

/** Bilingual markdown body (size tables etc.), up to ~50KB per locale. */
export class BilingualContentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  fr!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  en!: string;
}
