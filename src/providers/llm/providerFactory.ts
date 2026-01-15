import { LLMProvider, LLMProviderType, ProviderConfigMap } from './types.js';
import { OllamaProvider } from './ollamaProvider.js';
import { OpenAIProvider } from './openaiProvider.js';
import { ClaudeProvider } from './claudeProvider.js';
import { GeminiProvider } from './geminiProvider.js';
import { CustomProvider } from './customProvider.js';

export class LLMProviderFactory {
  private static providers: Map<LLMProviderType, LLMProvider> = new Map();

  static createProvider<T extends LLMProviderType>(
    type: T,
    config: ProviderConfigMap[T]
  ): LLMProvider {
    // Check if we already have an instance
    const existing = this.providers.get(type);
    if (existing) {
      existing.updateConfig(config);
      return existing;
    }

    // Create new instance
    let provider: LLMProvider;

    switch (type) {
      case 'ollama':
        provider = new OllamaProvider(config as ProviderConfigMap['ollama']);
        break;
      case 'openai':
        provider = new OpenAIProvider(config as ProviderConfigMap['openai']);
        break;
      case 'claude':
        provider = new ClaudeProvider(config as ProviderConfigMap['claude']);
        break;
      case 'gemini':
        provider = new GeminiProvider(config as ProviderConfigMap['gemini']);
        break;
      case 'custom':
        provider = new CustomProvider(config as ProviderConfigMap['custom']);
        break;
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }

    this.providers.set(type, provider);
    return provider;
  }

  static getProvider(type: LLMProviderType): LLMProvider | undefined {
    return this.providers.get(type);
  }

  static clearProviders(): void {
    this.providers.forEach((p) => p.cancelPendingRequests());
    this.providers.clear();
  }
}
