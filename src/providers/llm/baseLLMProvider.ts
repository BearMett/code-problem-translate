import {
  LLMProvider,
  LLMProviderType,
  GenerateOptions,
  ProviderCapabilities,
  ProviderConfigMap,
} from './types';

export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: LLMProviderType;
  abstract readonly displayName: string;
  abstract readonly capabilities: ProviderCapabilities;

  protected abortController: AbortController | null = null;

  abstract isConfigured(): boolean;
  abstract checkConnection(): Promise<boolean>;
  abstract generate(prompt: string, options?: GenerateOptions): Promise<string>;
  abstract updateConfig(config: ProviderConfigMap[LLMProviderType]): void;

  async translate(message: string, targetLanguage: string = 'Korean'): Promise<string> {
    const prompt = this.buildTranslationPrompt(message, targetLanguage);
    return this.generate(prompt);
  }

  protected buildTranslationPrompt(message: string, targetLanguage: string): string {
    return `You are a programming error message translator. Translate the following programming error/warning message to ${targetLanguage}.

Rules:
1. Keep technical terms (variable names, type names, file paths) in English
2. Keep error codes (like TS2322, no-unused-vars) unchanged
3. Be concise and natural
4. Only output the translation, nothing else

Error message: "${message}"

Translation:`;
  }

  cancelPendingRequests(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  protected createAbortController(): AbortController {
    this.cancelPendingRequests();
    this.abortController = new AbortController();
    return this.abortController;
  }
}
