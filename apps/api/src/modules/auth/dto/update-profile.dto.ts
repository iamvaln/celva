import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Self-service profile update. Email is intentionally absent — email
 * change is a sensitive op that needs a verification flow (out of scope
 * for this batch). Role / isActive stay admin-only.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ description: 'Cameroon phone (+237…). Pass empty string to unset.' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+237[26]\d{8})?$/, { message: 'errors.invalid_phone' })
  phone?: string;
}
