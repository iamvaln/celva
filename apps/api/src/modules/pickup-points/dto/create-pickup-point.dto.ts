import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PHONE_CAMEROON_PATTERN } from '@celva/shared';
import {
  BilingualLongTextDto,
  BilingualTextDto,
} from '../../../common/dto/bilingual-text.dto';

export class CreatePickupPointDto {
  @ApiProperty({ type: BilingualTextDto })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  name!: BilingualTextDto;

  @ApiProperty({ description: 'Street address.' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  address!: string;

  @ApiProperty({ example: 'Douala' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  city!: string;

  @ApiPropertyOptional({ description: 'Cameroon phone number.' })
  @IsOptional()
  @IsString()
  @Matches(PHONE_CAMEROON_PATTERN, { message: 'errors.invalid_phone' })
  phone?: string;

  @ApiPropertyOptional({
    type: BilingualLongTextDto,
    description: 'Opening hours in plain text (bilingual), e.g. "Mon-Sat 9am-6pm".',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualLongTextDto)
  hours?: BilingualLongTextDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
