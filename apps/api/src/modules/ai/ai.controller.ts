import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { AiUsageService, type AiMetrics } from './ai-usage.service';
import { TranslateDto } from './dto/translate.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';

const ASSIST_ROLES = [
  USER_ROLE.SUPER_ADMIN,
  USER_ROLE.ADMIN,
  USER_ROLE.MANAGER,
  USER_ROLE.CATALOG_MANAGER,
] as const;

@ApiTags('ai')
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly usage: AiUsageService,
  ) {}

  @Post('translate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Roles(...ASSIST_ROLES)
  @ApiOperation({
    summary: 'Translate a bilingual content field between FR and EN (admin AI assist).',
  })
  async translate(
    @Body() dto: TranslateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ text: string }> {
    return { text: await this.ai.translate(dto, user.id) };
  }

  @Post('generate-description')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Roles(...ASSIST_ROLES)
  @ApiOperation({
    summary: 'Generate or improve a product description in the requested locale (admin AI assist).',
  })
  async generateDescription(
    @Body() dto: GenerateDescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ text: string }> {
    return { text: await this.ai.generateDescription(dto, user.id) };
  }

  @Get('usage/metrics')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({ summary: 'Aggregated AI usage metrics for the back office.' })
  metrics(): Promise<AiMetrics> {
    return this.usage.metrics();
  }
}
