import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PHONE_CAMEROON_PATTERN } from '@celva/shared';
import { CreateOrderDto } from './create-order.dto';

/** One line of the client-side (localStorage) cart sent at guest checkout. */
export class GuestOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1, maximum: 99 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

/**
 * Guest checkout payload. Same delivery/payment shape as the authenticated
 * order (it extends CreateOrderDto), plus the contact identity used to
 * find-or-create a passwordless account, and the explicit cart items (the
 * guest cart is client-side, there is no server cart to read).
 */
export class CreateGuestOrderDto extends CreateOrderDto {
  @ApiProperty({ example: 'cliente@example.com' })
  @IsEmail({}, { message: 'errors.invalid_email' })
  email!: string;

  @ApiProperty({ example: 'Awa Mbeng' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: '+237698123456' })
  @IsOptional()
  @IsString()
  @Matches(PHONE_CAMEROON_PATTERN, { message: 'errors.invalid_phone' })
  phone?: string;

  @ApiProperty({ type: [GuestOrderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => GuestOrderItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  items!: GuestOrderItemDto[];
}
