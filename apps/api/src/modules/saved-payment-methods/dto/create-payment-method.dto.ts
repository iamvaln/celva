import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PAYMENT_METHOD, PHONE_CAMEROON_PATTERN } from '@celva/shared';

const SAVEABLE_METHODS = [
  PAYMENT_METHOD.ORANGE_MONEY,
  PAYMENT_METHOD.MTN_MOMO,
] as const;

export class CreatePaymentMethodDto {
  @ApiProperty({
    enum: SAVEABLE_METHODS,
    description: 'Only Mobile Money methods can be saved. Cash-on-delivery has no saved state.',
  })
  @IsEnum(SAVEABLE_METHODS, { message: 'errors.payment_method_not_saveable' })
  method!: (typeof SAVEABLE_METHODS)[number];

  @ApiProperty({ description: 'Personal label (e.g. "OM perso", "MTN bureau").' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label!: string;

  @ApiProperty({ example: '+237698123489' })
  @IsString()
  @Matches(PHONE_CAMEROON_PATTERN, { message: 'errors.invalid_phone' })
  phoneNumber!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Setting true unsets isDefault on every other saved method of the user.',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
