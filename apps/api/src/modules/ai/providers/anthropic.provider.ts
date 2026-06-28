import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../../../config/env';
import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
} from './ai-provider';

/**
 * Anthropic (Claude) provider. Model is configurable via AI_MODEL — defaults to
 * the current Opus generation. `temperature`/`top_p`/`top_k`/`thinking` are
 * intentionally never passed (they return HTTP 400 on this model).
 */
@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic | null;

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('ANTHROPIC_API_KEY', { infer: true });
    this.model = config.get('AI_MODEL', { infer: true }) ?? 'claude-opus-4-8';
    // Feature-gated: without a key the module still boots; calls 503.
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY is not set — AI endpoints will return 503.');
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async complete({ system, content, maxTokens = 2048 }: AiCompletionRequest): Promise<AiCompletionResult> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI is not configured (ANTHROPIC_API_KEY is missing).',
      );
    }
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return {
      text,
      provider: this.name,
      model: this.model,
      inputTokens: msg.usage.input_tokens,
      outputTokens: msg.usage.output_tokens,
    };
  }
}
