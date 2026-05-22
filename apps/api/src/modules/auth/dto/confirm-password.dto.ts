import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Shared DTO for sensitive self-actions that need a re-confirmation of
 * the current password (sign-out-all, delete-account).
 */
export class ConfirmPasswordDto {
  @ApiProperty({ description: 'Existing password — required to authorise the action.' })
  @IsString()
  currentPassword!: string;
}
