import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'amara@example.com' })
  @IsEmail({}, { message: 'errors.invalid_email' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'StrongP@ss123' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
