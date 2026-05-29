import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscribeNewsletterDto {
  @ApiProperty({ example: 'amara@example.com' })
  @IsEmail({}, { message: 'errors.invalid_email' })
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ example: 'Amara N.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
