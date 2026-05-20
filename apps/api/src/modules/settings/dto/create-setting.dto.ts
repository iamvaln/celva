import { IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSettingDto {
  @ApiProperty({ description: 'Unique key in UPPER_SNAKE_CASE' })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/, { message: 'errors.invalid_setting_key' })
  key!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  value!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  label?: { fr?: string; en?: string };
}
