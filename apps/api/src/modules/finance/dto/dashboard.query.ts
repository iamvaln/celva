import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardQuery {
  @ApiPropertyOptional({
    description:
      'ISO 8601 — KPI / channel / category breakdowns include transactions at/after this date. Defaults to the start of the current month.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description:
      'ISO 8601 — KPI / channel / category breakdowns include transactions strictly before this date. Defaults to "now".',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
