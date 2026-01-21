import { BaseLLMProvider } from './baseLLMProvider';
import {
  OllamaConfig,
  ModelInfo,
  GenerateOptions,
  ProviderCapabilities,
  LLMProviderError,
  ProviderConfigMap,
  LLMProviderType,
} from './types';

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

interface OllamaTagsResponse {
  models: Array<{ name: string; size: number }>;
}

export class OllamaProvider extends BaseLLMProvider {
  readonly name: LLMProviderType = 'ollama';
  readonly displayName = 'Ollama (Local)';
  readonly capabilities: ProviderCapabilities = {
    supportsModelListing: true,
    supportsStreaming: true,
    requiresApiKey: false,
  };

  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    super();
    this.config = {
      url: config.url?.replace(/\/$/, '') || 'http://localhost:11434',
      model: config.model || 'qwen2.5:3b',
    };
  }

  isConfigured(): boolean {
    return !!this.config.url && !!this.config.model;
  }

  updateConfig(config: ProviderConfigMap[LLMProviderType]): void {
    const ollamaConfig = config as OllamaConfig;
    this.config = {
      url: ollamaConfig.url?.replace(/\/$/, '') || this.config.url,
      model: ollamaConfig.model || this.config.model,
    };
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.config.url}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new LLMProviderError(
          `Failed to list models: ${response.statusText}`,
          'ollama',
          'CONNECTION_FAILED'
        );
      }

      const data = (await response.json()) as OllamaTagsResponse;
      return (data.models || []).map((m) => ({
        name: m.name,
        displayName: m.name,
        size: m.size,
      }));
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const controller = this.createAbortController();

    try {
      const response = await fetch(`${this.config.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.3,
            num_predict: options?.maxTokens ?? 500,
          },
        }),
        signal: options?.signal || controller.signal,
      });

      if (!response.ok) {
        throw new LLMProviderError(
          `Ollama request failed: ${response.statusText}`,
          'ollama',
          'CONNECTION_FAILED'
        );
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response.trim();
    } finally {
      this.abortController = null;
    }
  }
}
