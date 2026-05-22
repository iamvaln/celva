import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MIN_LENGTH } from '@celva/shared';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Existing password — required to authorise the change.' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'errors.password_too_short' })
  newPassword!: string;
}
