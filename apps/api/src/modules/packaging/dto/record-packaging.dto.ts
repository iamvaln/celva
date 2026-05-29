import { IsNumber, IsPositive, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordPackagingDto {
  @ApiProperty({ description: 'A RawMaterial of type PACKAGING.' })
  @IsUUID()
  rawMaterialId!: string;

  @ApiProperty({ example: 2, description: 'Units consumed (up to 2 decimals).' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantity!: number;
}
