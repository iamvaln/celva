import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CODE_INPUT_PATTERN = /^[A-Za-z0-9_-]{2,32}$/;

export class ApplyPromoCodeDto {
  @ApiProperty({
    description: 'Code typed by the customer. The server upper-cases it before lookup.',
    example: 'welcome10',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(CODE_INPUT_PATTERN, { message: 'errors.invalid_promo_code_format' })
  code!: string;
}
