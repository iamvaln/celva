import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddWishlistItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;
}
