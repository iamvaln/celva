import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MIN_LENGTH } from '@celva/shared';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  token!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'errors.password_too_short' })
  @MaxLength(128)
  newPassword!: string;
}
