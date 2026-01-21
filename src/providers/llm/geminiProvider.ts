import { BaseLLMProvider } from './baseLLMProvider';
import {
  GeminiConfig,
  GenerateOptions,
  ProviderCapabilities,
  LLMProviderError,
  ProviderConfigMap,
  LLMProviderType,
} from './types';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export class GeminiProvider extends BaseLLMProvider {
  readonly name: LLMProviderType = 'gemini';
  readonly displayName = 'Gemini (Google)';
  readonly capabilities: ProviderCapabilities = {
    supportsModelListing: false,
    supportsStreaming: true,
    requiresApiKey: true,
  };

  private config: GeminiConfig;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: GeminiConfig) {
    super();
    this.config = {
      apiKey: config.apiKey || '',
      model: config.model || 'gemini-2.5-flash',
    };
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && !!this.config.model;
  }

  updateConfig(config: ProviderConfigMap[LLMProviderType]): void {
    const geminiConfig = config as GeminiConfig;
    this.config = { ...this.config, ...geminiConfig };
  }

  async checkConnection(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'x-goog-api-key': this.config.apiKey },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.config.apiKey) {
      throw new LLMProviderError('Gemini API key is not configured', 'gemini', 'CONFIG_MISSING');
    }

    const controller = this.createAbortController();
    const url = `${this.baseUrl}/models/${this.config.model}:generateContent`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature ?? 0.3,
            maxOutputTokens: options?.maxTokens ?? 500,
          },
        }),
        signal: options?.signal || controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new LLMProviderError('Invalid Gemini API key', 'gemini', 'AUTH_FAILED');
      }
      if (response.status === 429) {
        throw new LLMProviderError('Gemini rate limit exceeded', 'gemini', 'RATE_LIMITED');
      }
      if (!response.ok) {
        throw new LLMProviderError(
          `Gemini request failed: ${response.statusText}`,
          'gemini',
          'CONNECTION_FAILED'
        );
      }

      const data = (await response.json()) as GeminiResponse;
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } finally {
      this.abortController = null;
    }
  }
}
