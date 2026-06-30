import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiUsageService } from './ai-usage.service';
import { AI_PROVIDER, type AiProvider } from './providers/ai-provider';
import { AnthropicProvider } from './providers/anthropic.provider';

/**
 * Active AI provider, selected by the AI_PROVIDER env var (default "anthropic").
 * Add a new provider class and a case here to plug a different model/vendor —
 * nothing else (AiService, usage tracking, controller) changes.
 */
const aiProviderFactory = {
  provide: AI_PROVIDER,
  inject: [ConfigService, AnthropicProvider],
  useFactory: (config: ConfigService<Env, true>, anthropic: AnthropicProvider): AiProvider => {
    const name = config.get('AI_PROVIDER', { infer: true }) ?? 'anthropic';
    switch (name) {
      case 'anthropic':
      default:
        return anthropic;
    }
  },
};

@Module({
  controllers: [AiController],
  providers: [AiService, AiUsageService, AnthropicProvider, aiProviderFactory],
  exports: [AiService, AiUsageService],
})
export class AiModule {}
