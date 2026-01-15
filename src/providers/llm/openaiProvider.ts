import { BaseLLMProvider } from './baseLLMProvider.js';
import {
  OpenAIConfig,
  GenerateOptions,
  ProviderCapabilities,
  LLMProviderError,
  ProviderConfigMap,
  LLMProviderType,
} from './types.js';

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class OpenAIProvider extends BaseLLMProvider {
  readonly name: LLMProviderType = 'openai';
  readonly displayName = 'OpenAI';
  readonly capabilities: ProviderCapabilities = {
    supportsModelListing: false,
    supportsStreaming: true,
    requiresApiKey: true,
  };

  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    super();
    this.config = {
      apiKey: config.apiKey || '',
      model: config.model || 'gpt-4o-mini',
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      organization: config.organization,
    };
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && !!this.config.model;
  }

  updateConfig(config: ProviderConfigMap[LLMProviderType]): void {
    const openaiConfig = config as OpenAIConfig;
    this.config = { ...this.config, ...openaiConfig };
  }

  async checkConnection(): Promise<boolean> {
    if (!this.config.apiKey) return false;

    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };
    if (this.config.organization) {
      headers['OpenAI-Organization'] = this.config.organization;
    }
    return headers;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.config.apiKey) {
      throw new LLMProviderError('OpenAI API key is not configured', 'openai', 'CONFIG_MISSING');
    }

    const controller = this.createAbortController();

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 500,
        }),
        signal: options?.signal || controller.signal,
      });

      if (response.status === 401) {
        throw new LLMProviderError('Invalid OpenAI API key', 'openai', 'AUTH_FAILED');
      }
      if (response.status === 429) {
        throw new LLMProviderError('OpenAI rate limit exceeded', 'openai', 'RATE_LIMITED');
      }
      if (!response.ok) {
        throw new LLMProviderError(
          `OpenAI request failed: ${response.statusText}`,
          'openai',
          'CONNECTION_FAILED'
        );
      }

      const data = (await response.json()) as OpenAIChatResponse;
      return data.choices[0]?.message?.content?.trim() || '';
    } finally {
      this.abortController = null;
    }
  }
}
