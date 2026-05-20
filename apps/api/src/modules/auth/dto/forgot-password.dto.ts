import { IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'amara@example.com' })
  @IsEmail({}, { message: 'errors.invalid_email' })
  @MaxLength(254)
  email!: string;
}
