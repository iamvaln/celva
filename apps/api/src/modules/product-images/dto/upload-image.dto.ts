import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BilingualLongTextDto } from '../../../common/dto/bilingual-text.dto';

export class UploadImageDto {
  @ApiPropertyOptional({ type: BilingualLongTextDto, description: 'Alt text per locale.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualLongTextDto)
  altText?: BilingualLongTextDto;
}
