import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MIN_LENGTH, PHONE_CAMEROON_PATTERN } from '@celva/shared';

export class SignupDto {
  @ApiProperty({ example: 'amara@example.com' })
  @IsEmail({}, { message: 'errors.invalid_email' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Amara Ngwana' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'StrongP@ss123', minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'errors.password_too_short' })
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: '+237699112233', required: false })
  @IsOptional()
  @Matches(PHONE_CAMEROON_PATTERN, { message: 'errors.invalid_phone' })
  phone?: string;
}
