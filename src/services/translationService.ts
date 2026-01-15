import * as vscode from 'vscode';
import { LLMProvider } from '../providers/llm/types.js';
import { LLMProviderFactory } from '../providers/llm/providerFactory.js';
import { CacheService } from './cacheService.js';
import { getSettings, getCurrentProviderConfig, ExtensionSettings } from '../config/settings.js';

export interface TranslationResult {
  original: string;
  translated: string;
  fromCache: boolean;
}

export class TranslationService {
  private provider: LLMProvider;
  private cacheService: CacheService;
  private settings: ExtensionSettings;
  private pendingTranslations: Map<string, Promise<string>> = new Map();
  private _onTranslationComplete = new vscode.EventEmitter<TranslationResult>();

  readonly onTranslationComplete = this._onTranslationComplete.event;

  constructor() {
    this.settings = getSettings();
    this.provider = LLMProviderFactory.createProvider(
      this.settings.provider,
      getCurrentProviderConfig(this.settings)
    );
    this.cacheService = new CacheService(this.settings.cacheMaxSize);
  }

  initialize(globalState: vscode.Memento): void {
    this.cacheService.initialize(globalState);
  }

  updateSettings(settings: ExtensionSettings): void {
    this.settings = settings;

    // Update or create provider
    this.provider = LLMProviderFactory.createProvider(
      settings.provider,
      getCurrentProviderConfig(settings)
    );

    this.cacheService.setMaxSize(settings.cacheMaxSize);
  }

  async checkConnection(): Promise<boolean> {
    return this.provider.checkConnection();
  }

  getProviderInfo(): { name: string; displayName: string; isConfigured: boolean } {
    return {
      name: this.provider.name,
      displayName: this.provider.displayName,
      isConfigured: this.provider.isConfigured(),
    };
  }

  async translate(message: string): Promise<TranslationResult> {
    // Check cache first
    if (this.settings.cacheEnabled) {
      const cached = this.cacheService.get(message);
      if (cached) {
        const result: TranslationResult = {
          original: message,
          translated: cached,
          fromCache: true,
        };
        this._onTranslationComplete.fire(result);
        return result;
      }
    }

    // Check if translation is already in progress for this message
    const pending = this.pendingTranslations.get(message);
    if (pending) {
      const translated = await pending;
      return {
        original: message,
        translated,
        fromCache: false,
      };
    }

    // Start new translation
    const translationPromise = this.performTranslation(message);
    this.pendingTranslations.set(message, translationPromise);

    try {
      const translated = await translationPromise;
      const result: TranslationResult = {
        original: message,
        translated,
        fromCache: false,
      };
      this._onTranslationComplete.fire(result);
      return result;
    } finally {
      this.pendingTranslations.delete(message);
    }
  }

  private async performTranslation(message: string): Promise<string> {
    try {
      const translated = await this.provider.translate(message, this.settings.targetLanguage);

      // Cache the result
      if (this.settings.cacheEnabled) {
        await this.cacheService.set(message, translated);
      }

      return translated;
    } catch (error) {
      console.error('Translation failed:', error);
      throw error;
    }
  }

  async translateBatch(messages: string[]): Promise<TranslationResult[]> {
    const results: TranslationResult[] = [];

    // Process in parallel with concurrency limit
    const concurrencyLimit = 3;
    const chunks: string[][] = [];

    for (let i = 0; i < messages.length; i += concurrencyLimit) {
      chunks.push(messages.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((msg) =>
          this.translate(msg).catch((error) => ({
            original: msg,
            translated: `[Translation failed: ${error.message}]`,
            fromCache: false,
          }))
        )
      );
      results.push(...chunkResults);
    }

    return results;
  }

  getCacheStats() {
    return this.cacheService.getStats();
  }

  getCacheHitRate(): number {
    return this.cacheService.getHitRate();
  }

  async clearCache(): Promise<void> {
    await this.cacheService.clear();
  }

  cancelPendingTranslations(): void {
    this.provider.cancelPendingRequests();
    this.pendingTranslations.clear();
  }

  dispose(): void {
    this.cancelPendingTranslations();
    this._onTranslationComplete.dispose();
  }
}
