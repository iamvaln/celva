import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PHONE_CAMEROON_PATTERN } from '@celva/shared';

export class CreateAddressDto {
  @ApiProperty({ description: 'Personal label (e.g. "Maison", "Bureau").' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '+237698123456' })
  @IsString()
  @Matches(PHONE_CAMEROON_PATTERN, { message: 'errors.invalid_phone' })
  phone!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiProperty({ example: 'Douala' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  city!: string;

  @ApiPropertyOptional({ description: 'Matches DeliveryZone keys when checkout is wired (Phase 3 / Q).' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  zone?: string;

  @ApiPropertyOptional({ default: 'CM', description: 'ISO country code; default CM.' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Setting true unsets isDefault on every other address of the user.',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
