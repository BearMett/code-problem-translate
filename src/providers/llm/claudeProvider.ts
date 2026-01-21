import { BaseLLMProvider } from './baseLLMProvider';
import {
  ClaudeConfig,
  GenerateOptions,
  ProviderCapabilities,
  LLMProviderError,
  ProviderConfigMap,
  LLMProviderType,
} from './types';

interface ClaudeMessageResponse {
  content: Array<{
    type: string;
    text?: string;
  }>;
}

export class ClaudeProvider extends BaseLLMProvider {
  readonly name: LLMProviderType = 'claude';
  readonly displayName = 'Claude (Anthropic)';
  readonly capabilities: ProviderCapabilities = {
    supportsModelListing: false,
    supportsStreaming: true,
    requiresApiKey: true,
  };

  private config: ClaudeConfig;
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  constructor(config: ClaudeConfig) {
    super();
    this.config = {
      apiKey: config.apiKey || '',
      model: config.model || 'claude-haiku-4-5-20251001',
    };
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && !!this.config.model;
  }

  updateConfig(config: ProviderConfigMap[LLMProviderType]): void {
    const claudeConfig = config as ClaudeConfig;
    this.config = { ...this.config, ...claudeConfig };
  }

  async checkConnection(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      // Claude doesn't have a health check endpoint, so we make a minimal request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
        signal: AbortSignal.timeout(5000),
      });
      // 200 means success, 400 means API key works but request is bad
      return response.ok || response.status === 400;
    } catch {
      return false;
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.config.apiKey) {
      throw new LLMProviderError('Claude API key is not configured', 'claude', 'CONFIG_MISSING');
    }

    const controller = this.createAbortController();

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: options?.maxTokens ?? 500,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: options?.signal || controller.signal,
      });

      if (response.status === 401) {
        throw new LLMProviderError('Invalid Claude API key', 'claude', 'AUTH_FAILED');
      }
      if (response.status === 429) {
        throw new LLMProviderError('Claude rate limit exceeded', 'claude', 'RATE_LIMITED');
      }
      if (!response.ok) {
        throw new LLMProviderError(
          `Claude request failed: ${response.statusText}`,
          'claude',
          'CONNECTION_FAILED'
        );
      }

      const data = (await response.json()) as ClaudeMessageResponse;
      const textContent = data.content?.find((c) => c.type === 'text');
      return textContent?.text?.trim() || '';
    } finally {
      this.abortController = null;
    }
  }
}
