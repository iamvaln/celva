import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DELIVERY_MODE, PAYMENT_METHOD, PHONE_CAMEROON_PATTERN } from '@celva/shared';

const STOREFRONT_DELIVERY_MODES = [
  DELIVERY_MODE.HOME_DELIVERY,
  DELIVERY_MODE.STORE_PICKUP,
  DELIVERY_MODE.RELAY_PICKUP,
] as const;

const STOREFRONT_PAYMENT_METHODS = [
  PAYMENT_METHOD.ORANGE_MONEY,
  PAYMENT_METHOD.MTN_MOMO,
  PAYMENT_METHOD.CASH_ON_DELIVERY,
] as const;

export class CreateOrderDto {
  @ApiProperty({ enum: STOREFRONT_DELIVERY_MODES })
  @IsEnum(STOREFRONT_DELIVERY_MODES, { message: 'errors.invalid_delivery_mode' })
  deliveryMode!: (typeof STOREFRONT_DELIVERY_MODES)[number];

  // HOME_DELIVERY branch ----------------------------------------------------

  @ApiPropertyOptional({
    description: 'Required when deliveryMode=HOME_DELIVERY.',
    format: 'uuid',
  })
  @ValidateIf((o: CreateOrderDto) => o.deliveryMode === DELIVERY_MODE.HOME_DELIVERY)
  @IsUUID()
  deliveryZoneId?: string;

  @ApiPropertyOptional({
    description:
      'Either pass shippingAddressId to pick one of the user\'s saved addresses, or pass the three shipping fields explicitly. HOME_DELIVERY only.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  shippingAddressId?: string;

  @ApiPropertyOptional({
    description: 'Inline shipping address line. Required if no shippingAddressId. HOME_DELIVERY only.',
  })
  @ValidateIf(
    (o: CreateOrderDto) =>
      o.deliveryMode === DELIVERY_MODE.HOME_DELIVERY && !o.shippingAddressId,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  shippingAddress?: string;

  @ApiPropertyOptional()
  @ValidateIf(
    (o: CreateOrderDto) =>
      o.deliveryMode === DELIVERY_MODE.HOME_DELIVERY && !o.shippingAddressId,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  shippingCity?: string;

  @ApiPropertyOptional({ example: '+237698123456' })
  @ValidateIf(
    (o: CreateOrderDto) =>
      o.deliveryMode === DELIVERY_MODE.HOME_DELIVERY && !o.shippingAddressId,
  )
  @IsString()
  @Matches(PHONE_CAMEROON_PATTERN, { message: 'errors.invalid_phone' })
  shippingPhone?: string;

  // Pickup branch -----------------------------------------------------------

  @ApiPropertyOptional({
    description: 'Required when deliveryMode=STORE_PICKUP or RELAY_PICKUP.',
    format: 'uuid',
  })
  @ValidateIf(
    (o: CreateOrderDto) =>
      o.deliveryMode === DELIVERY_MODE.STORE_PICKUP ||
      o.deliveryMode === DELIVERY_MODE.RELAY_PICKUP,
  )
  @IsUUID()
  pickupPointId?: string;

  // Payment -----------------------------------------------------------------

  @ApiProperty({ enum: STOREFRONT_PAYMENT_METHODS })
  @IsEnum(STOREFRONT_PAYMENT_METHODS)
  paymentMethod!: (typeof STOREFRONT_PAYMENT_METHODS)[number];

  @ApiPropertyOptional({
    description:
      'For OM/MoMo: pick one of the user\'s saved methods, OR pass paymentPhoneNumber for a new one. Not used for CASH_ON_DELIVERY.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  savedPaymentMethodId?: string;

  @ApiPropertyOptional({
    description: 'New OM/MoMo number when no saved method is picked.',
    example: '+237698123456',
  })
  @ValidateIf(
    (o: CreateOrderDto) =>
      (o.paymentMethod === PAYMENT_METHOD.ORANGE_MONEY ||
        o.paymentMethod === PAYMENT_METHOD.MTN_MOMO) &&
      !o.savedPaymentMethodId,
  )
  @IsString()
  @Matches(PHONE_CAMEROON_PATTERN, { message: 'errors.invalid_phone' })
  paymentPhoneNumber?: string;

  // Optional extras ---------------------------------------------------------

  @ApiPropertyOptional({ description: 'Promo code to re-apply at order creation (server re-validates).' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  promoCode?: string;

  @ApiPropertyOptional({ description: 'Customer note for the order.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
