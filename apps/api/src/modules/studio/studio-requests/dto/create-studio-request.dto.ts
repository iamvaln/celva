import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PHONE_CAMEROON_PATTERN, STUDIO_APPT_SLOTS } from '@celva/shared';

export enum StudioAppointmentModeDto {
  ATELIER = 'ATELIER',
  VISIO = 'VISIO',
}

const phonePattern = new RegExp(PHONE_CAMEROON_PATTERN);

/**
 * Storefront-facing studio request — a rendez-vous booking with an
 * optional multi-select of fabrics the customer is curious about.
 * Garments are inspiration only and are not picked here.
 */
export class CreateStudioRequestDto {
  // ── Coordonnées ───────────────────────────────────────────────────
  @ApiProperty({ example: 'Amara N.' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  customerName!: string;

  @ApiProperty({ example: '+237600000000' })
  @IsString()
  @Matches(phonePattern, { message: 'errors.invalid_phone' })
  customerPhone!: string;

  @ApiPropertyOptional({ example: 'amara@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'errors.invalid_email' })
  @MaxLength(254)
  customerEmail?: string;

  @ApiPropertyOptional({ example: 'Douala' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerCity?: string;

  // ── Appointment ───────────────────────────────────────────────────
  @ApiProperty({ enum: StudioAppointmentModeDto })
  @IsEnum(StudioAppointmentModeDto)
  appointmentMode!: StudioAppointmentModeDto;

  @ApiProperty({ description: 'ISO date string (YYYY-MM-DD).' })
  @IsDateString()
  appointmentDate!: string;

  @ApiProperty({ enum: STUDIO_APPT_SLOTS })
  @IsIn(STUDIO_APPT_SLOTS as unknown as string[])
  appointmentSlot!: string;

  // ── Fabric selection (optional, multi) ────────────────────────────
  @ApiPropertyOptional({
    description: 'Fabric ids the customer expressed interest in. Empty array means no preselection.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  selectedFabricIds?: string[];

  // ── Open text ─────────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
