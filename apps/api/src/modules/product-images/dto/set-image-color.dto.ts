import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetImageColorDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "Attribute value (typically a colour) this image depicts. Send null to clear the link.",
  })
  // Accept an explicit null (clears the link) or a UUID.
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsUUID()
  attributeValueId!: string | null;
}
