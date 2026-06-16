import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StudioTransitionStatusDto {
  PENDING = 'PENDING',
  CONTACTED = 'CONTACTED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export class TransitionStudioRequestDto {
  @ApiProperty({ enum: StudioTransitionStatusDto })
  @IsEnum(StudioTransitionStatusDto)
  status!: StudioTransitionStatusDto;

  @ApiPropertyOptional({ description: 'Optional internal note appended to the audit trail.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string;
}
