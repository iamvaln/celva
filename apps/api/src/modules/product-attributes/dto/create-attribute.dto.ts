import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BilingualTextDto } from '../../../common/dto/bilingual-text.dto';

export class CreateAttributeDto {
  @ApiProperty({ type: BilingualTextDto, description: 'Axis name, e.g. {fr:"Taille",en:"Size"}' })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  name!: BilingualTextDto;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({
    description: 'Position in the attribute list. Unique per product. Auto-assigned if omitted.',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
