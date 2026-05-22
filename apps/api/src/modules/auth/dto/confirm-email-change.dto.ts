import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmEmailChangeDto {
  @ApiProperty({ description: 'Token from the verification email.' })
  @IsString()
  @MinLength(10)
  token!: string;
}
