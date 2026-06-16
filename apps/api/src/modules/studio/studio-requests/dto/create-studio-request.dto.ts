import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PHONE_CAMEROON_PATTERN,
  STUDIO_APPT_SLOTS,
  STUDIO_HEIGHT_RANGE,
  STUDIO_SIZES,
  STUDIO_SIZE_REFS,
} from '@celva/shared';

export enum StudioRequestTypeDto {
  ORDER = 'ORDER',
  APPOINTMENT = 'APPOINTMENT',
}

export enum StudioGenderDto {
  FEMME = 'FEMME',
  HOMME = 'HOMME',
}

export enum StudioMeasureModeDto {
  ATELIER = 'ATELIER',
  WHATSAPP = 'WHATSAPP',
}

export enum StudioAppointmentModeDto {
  ATELIER = 'ATELIER',
  VISIO = 'VISIO',
}

const phonePattern = new RegExp(PHONE_CAMEROON_PATTERN);

export class CreateStudioRequestDto {
  @ApiProperty({ enum: StudioRequestTypeDto })
  @IsEnum(StudioRequestTypeDto)
  type!: StudioRequestTypeDto;

  // ── Coordonnées (always required) ─────────────────────────────────
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

  // ── Silhouette persona (captured for both flows) ──────────────────
  @ApiPropertyOptional({ enum: StudioGenderDto })
  @IsOptional()
  @IsEnum(StudioGenderDto)
  gender?: StudioGenderDto;

  @ApiPropertyOptional({ minimum: 0, maximum: 7, description: 'Index in STUDIO_TEINTS' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7)
  skinToneIndex?: number;

  @ApiPropertyOptional({ enum: STUDIO_SIZES })
  @IsOptional()
  @IsIn(STUDIO_SIZES as unknown as string[])
  silhouetteSize?: string;

  @ApiPropertyOptional({
    minimum: STUDIO_HEIGHT_RANGE.min,
    maximum: STUDIO_HEIGHT_RANGE.max,
    description: 'cm',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(STUDIO_HEIGHT_RANGE.min)
  @Max(STUDIO_HEIGHT_RANGE.max)
  silhouetteHeight?: number;

  // ── Composition ───────────────────────────────────────────────────
  // ORDER → modelId + fabricId required ; APPOINTMENT → optional.
  // Note: `@IsOptional()` would short-circuit `@ValidateIf` (returns true on
  // undefined and skips every other decorator), so we drop it on the
  // conditionally-required fields. `@ValidateIf` is the only gate.
  @ApiPropertyOptional()
  @ValidateIf((o: CreateStudioRequestDto) => o.type === StudioRequestTypeDto.ORDER)
  @IsUUID()
  modelId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: CreateStudioRequestDto) => o.type === StudioRequestTypeDto.ORDER)
  @IsUUID()
  fabricId?: string;

  // ── ORDER only ────────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: STUDIO_SIZE_REFS })
  @ValidateIf((o: CreateStudioRequestDto) => o.type === StudioRequestTypeDto.ORDER)
  @IsIn(STUDIO_SIZE_REFS as unknown as string[])
  sizeRef?: string;

  @ApiPropertyOptional({ enum: StudioMeasureModeDto })
  @ValidateIf((o: CreateStudioRequestDto) => o.type === StudioRequestTypeDto.ORDER)
  @IsEnum(StudioMeasureModeDto)
  measurementMode?: StudioMeasureModeDto;

  // ── APPOINTMENT only ──────────────────────────────────────────────
  @ApiPropertyOptional({ enum: StudioAppointmentModeDto })
  @ValidateIf((o: CreateStudioRequestDto) => o.type === StudioRequestTypeDto.APPOINTMENT)
  @IsEnum(StudioAppointmentModeDto)
  appointmentMode?: StudioAppointmentModeDto;

  @ApiPropertyOptional({ description: 'ISO date string (YYYY-MM-DD).' })
  @ValidateIf((o: CreateStudioRequestDto) => o.type === StudioRequestTypeDto.APPOINTMENT)
  @IsDateString()
  appointmentDate?: string;

  @ApiPropertyOptional({ enum: STUDIO_APPT_SLOTS })
  @ValidateIf((o: CreateStudioRequestDto) => o.type === StudioRequestTypeDto.APPOINTMENT)
  @IsIn(STUDIO_APPT_SLOTS as unknown as string[])
  appointmentSlot?: string;

  // ── Open text ─────────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
