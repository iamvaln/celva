import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertSettingDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  value!: string;

  @ApiProperty({
    required: false,
    description: 'Bilingual label, e.g. { "fr": "Taux de TVA", "en": "Tax rate" }',
  })
  @IsOptional()
  @IsObject()
  label?: { fr?: string; en?: string };
}
