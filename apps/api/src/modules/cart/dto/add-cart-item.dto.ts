import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({
    description: 'Adds this much to the line. If the variant is already in the cart, the quantity is incremented.',
    minimum: 1,
    maximum: 100,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;
}
