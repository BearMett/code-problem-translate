import { BaseLLMProvider } from './baseLLMProvider.js';
import {
  CustomConfig,
  GenerateOptions,
  ProviderCapabilities,
  LLMProviderError,
  ProviderConfigMap,
  LLMProviderType,
} from './types.js';

export class CustomProvider extends BaseLLMProvider {
  readonly name: LLMProviderType = 'custom';
  readonly displayName = 'Custom Endpoint';
  readonly capabilities: ProviderCapabilities = {
    supportsModelListing: false,
    supportsStreaming: false,
    requiresApiKey: false,
  };

  private config: CustomConfig;

  constructor(config: CustomConfig) {
    super();
    this.config = {
      url: config.url || '',
      apiKey: config.apiKey,
      model: config.model || 'default',
      headers: config.headers || {},
      requestFormat: config.requestFormat || 'openai',
    };
  }

  isConfigured(): boolean {
    return !!this.config.url && !!this.config.model;
  }

  updateConfig(config: ProviderConfigMap[LLMProviderType]): void {
    const customConfig = config as CustomConfig;
    this.config = { ...this.config, ...customConfig };
  }

  async checkConnection(): Promise<boolean> {
    if (!this.config.url) {
      return false;
    }

    try {
      const response = await fetch(this.config.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      // 405 = method not allowed but server is up
      return response.ok || response.status === 405;
    } catch {
      return false;
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.config.url) {
      throw new LLMProviderError(
        'Custom endpoint URL is not configured',
        'custom',
        'CONFIG_MISSING'
      );
    }

    const controller = this.createAbortController();
    const body = this.buildRequestBody(prompt, options);

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: options?.signal || controller.signal,
      });

      if (!response.ok) {
        throw new LLMProviderError(
          `Custom endpoint request failed: ${response.statusText}`,
          'custom',
          'CONNECTION_FAILED'
        );
      }

      const data = await response.json();
      return this.extractResponse(data);
    } finally {
      this.abortController = null;
    }
  }

  private buildRequestBody(prompt: string, options?: GenerateOptions): unknown {
    if (this.config.requestFormat === 'ollama') {
      return {
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.3,
          num_predict: options?.maxTokens ?? 500,
        },
      };
    }

    // Default: OpenAI format
    return {
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 500,
    };
  }

  private extractResponse(data: unknown): string {
    const d = data as Record<string, unknown>;

    // Try OpenAI format
    if (d.choices && Array.isArray(d.choices)) {
      const choice = d.choices[0] as Record<string, unknown>;
      const message = choice?.message as Record<string, unknown>;
      if (message?.content) {
        return String(message.content).trim();
      }
    }

    // Try Ollama format
    if (d.response) {
      return String(d.response).trim();
    }

    // Try generic text field
    if (d.text) {
      return String(d.text).trim();
    }
    if (d.content) {
      return String(d.content).trim();
    }

    throw new LLMProviderError(
      'Could not parse response from custom endpoint',
      'custom',
      'INVALID_RESPONSE'
    );
  }
}
