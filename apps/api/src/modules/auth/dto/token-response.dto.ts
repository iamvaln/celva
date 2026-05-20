import { ApiProperty } from '@nestjs/swagger';

export class UserPublicDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ required: false }) phone?: string | null;
  @ApiProperty({ enum: ['ADMIN', 'MANAGER', 'DELIVERER', 'CLIENT', 'SALES_REP'] }) role!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
}

export class TokenResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ type: UserPublicDto }) user!: UserPublicDto;
}
