/**
 * Provider-agnostic AI completion contract. Lets us plug different models /
 * vendors behind a single interface — the AiService and usage tracking never
 * reference a specific SDK. Pick the active provider via AI_PROVIDER (and the
 * model via AI_MODEL); see AiModule's factory.
 */

export type AiCompletionRequest = {
  system: string;
  content: string;
  maxTokens?: number;
};

export type AiCompletionResult = {
  text: string;
  /** Provider name, e.g. "anthropic". */
  provider: string;
  /** Resolved model id, e.g. "claude-opus-4-8". */
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  /** True when credentials are present and the provider can serve requests. */
  isConfigured(): boolean;
  complete(req: AiCompletionRequest): Promise<AiCompletionResult>;
}

/** DI token for the active Ai provider. */
export const AI_PROVIDER = Symbol('AI_PROVIDER');
