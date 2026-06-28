import { BadGatewayException, Inject, Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { TranslateDto } from './dto/translate.dto';
import type { GenerateDescriptionDto } from './dto/generate-description.dto';
import { AI_PROVIDER, type AiProvider } from './providers/ai-provider';
import { AiUsageService } from './ai-usage.service';

const LOCALE_NAME: Record<'fr' | 'en', string> = {
  fr: 'French',
  en: 'English',
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly usage: AiUsageService,
  ) {}

  async translate(dto: TranslateDto, userId?: string): Promise<string> {
    const source = LOCALE_NAME[dto.sourceLocale];
    const target = LOCALE_NAME[dto.targetLocale];
    const kindHint =
      dto.kind === 'name'
        ? ' This is a product/category/collection name, so keep it short and punchy.'
        : dto.kind === 'description'
          ? ' This is a marketing product description, so preserve its persuasive tone.'
          : '';

    const system =
      'You are a professional translator for a fashion e-commerce brand, fluent in ' +
      'French and English. Translate the text faithfully from ' +
      `${source} to ${target}, preserving the original tone, register and brand voice.` +
      kindHint +
      ' Do not localise proper nouns or the brand name "Celva". Output ONLY the ' +
      'translation, with no preamble, no quotes, and no explanations.';

    return this.run('translate', system, dto.text, userId);
  }

  async generateDescription(dto: GenerateDescriptionDto, userId?: string): Promise<string> {
    const target = LOCALE_NAME[dto.locale];

    const system =
      'You write product descriptions for Celva, a Cameroonian women\'s fashion ' +
      `brand. Write a concise, appealing description of 2-3 sentences in ${target}, ` +
      'evoking craftsmanship, elegance and the vibrant spirit of the brand. Avoid ' +
      'clichés and hype. Output ONLY the description, with no preamble, no quotes, ' +
      'and no headings.';

    const hints = dto.hints?.trim()
      ? `\n\nAdditional details to weave in (or an existing draft to improve):\n${dto.hints.trim()}`
      : '';
    const user = `Product name: ${dto.productName}${hints}`;

    return this.run('generate_description', system, user, userId);
  }

  /**
   * Run a completion through the active provider, recording usage (tokens,
   * latency, success) for the back-office metrics — on both success and failure.
   */
  private async run(
    feature: string,
    system: string,
    content: string,
    userId?: string,
  ): Promise<string> {
    const startedAt = Date.now();
    try {
      const result = await this.provider.complete({ system, content });
      await this.usage.record({
        feature,
        provider: result.provider,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: Date.now() - startedAt,
        success: true,
        createdById: userId ?? null,
      });
      if (!result.text) {
        throw new BadGatewayException('AI returned an empty response.');
      }
      return result.text;
    } catch (err) {
      // Don't double-log the empty-response BadGateway we just recorded above.
      if (!(err instanceof BadGatewayException)) {
        await this.usage.record({
          feature,
          provider: this.provider.name,
          model: this.provider.model,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - startedAt,
          success: false,
          errorType: err instanceof Error ? err.name : 'unknown',
          createdById: userId ?? null,
        });
      }
      if (err instanceof Anthropic.APIError) {
        this.logger.error(`AI provider error (${err.status ?? '?'}): ${err.message}`);
        throw new BadGatewayException('The AI provider returned an error. Please try again.');
      }
      throw err;
    }
  }
}
