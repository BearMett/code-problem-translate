// LLM Provider Types

export type LLMProviderType = 'ollama' | 'openai' | 'claude' | 'gemini' | 'custom';

// Model information
export interface ModelInfo {
  name: string;
  displayName?: string;
  size?: number;
}

// Generation options
export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

// Provider capability flags
export interface ProviderCapabilities {
  supportsModelListing: boolean;
  supportsStreaming: boolean;
  requiresApiKey: boolean;
}

// Core LLM Provider interface
export interface LLMProvider {
  readonly name: LLMProviderType;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;

  isConfigured(): boolean;
  checkConnection(): Promise<boolean>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  translate(message: string, targetLanguage: string): Promise<string>;
  cancelPendingRequests(): void;
  updateConfig(config: ProviderConfigMap[LLMProviderType]): void;

  // Optional: Model listing (some providers support this)
  listModels?(): Promise<ModelInfo[]>;
}

// Provider-specific configurations
export interface OllamaConfig {
  url: string;
  model: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  organization?: string;
}

export interface ClaudeConfig {
  apiKey: string;
  model: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface CustomConfig {
  url: string;
  apiKey?: string;
  model: string;
  headers?: Record<string, string>;
  requestFormat?: 'openai' | 'ollama';
}

// Map provider types to their configs
export interface ProviderConfigMap {
  ollama: OllamaConfig;
  openai: OpenAIConfig;
  claude: ClaudeConfig;
  gemini: GeminiConfig;
  custom: CustomConfig;
}

// Error types
export type LLMProviderErrorCode =
  | 'CONNECTION_FAILED'
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'INVALID_RESPONSE'
  | 'CANCELLED'
  | 'CONFIG_MISSING';

export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: LLMProviderType,
    public readonly code: LLMProviderErrorCode
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}
