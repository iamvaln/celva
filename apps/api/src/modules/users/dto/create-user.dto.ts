import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MIN_LENGTH, PHONE_CAMEROON_PATTERN, USER_ROLE } from '@celva/shared';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail({}, { message: 'errors.invalid_email' })
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'errors.password_too_short' })
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: Object.values(USER_ROLE) })
  @IsEnum(USER_ROLE, { message: 'errors.invalid_role' })
  role!: keyof typeof USER_ROLE;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(PHONE_CAMEROON_PATTERN, { message: 'errors.invalid_phone' })
  phone?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
