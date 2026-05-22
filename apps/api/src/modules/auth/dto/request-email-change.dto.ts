import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestEmailChangeDto {
  @ApiProperty({ description: 'Existing password — required to authorise the change.' })
  @IsString()
  currentPassword!: string;

  @ApiProperty()
  @IsEmail({}, { message: 'errors.invalid_email' })
  newEmail!: string;
}
