import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PHONE_CAMEROON_PATTERN, USER_ROLE } from '@celva/shared';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, enum: Object.values(USER_ROLE) })
  @IsOptional()
  @IsEnum(USER_ROLE, { message: 'errors.invalid_role' })
  role?: keyof typeof USER_ROLE;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(PHONE_CAMEROON_PATTERN, { message: 'errors.invalid_phone' })
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
