import * as vscode from 'vscode';
import type {
  LLMProviderType,
  ProviderConfigMap,
  OllamaConfig,
  OpenAIConfig,
  ClaudeConfig,
  GeminiConfig,
  CustomConfig,
} from '../providers/llm/types.js';

export interface ExtensionSettings {
  enabled: boolean;

  // Provider selection
  provider: LLMProviderType;

  // Provider-specific settings
  ollama: OllamaConfig;
  openai: OpenAIConfig;
  claude: ClaudeConfig;
  gemini: GeminiConfig;
  custom: CustomConfig;

  // Legacy settings (for backward compatibility)
  /** @deprecated Use ollama.url instead */
  ollamaUrl: string;
  /** @deprecated Use the provider-specific model setting instead */
  model: string;

  // Common settings
  targetLanguage: string;
  displayMode: 'original' | 'translated' | 'both';
  enableHover: boolean;
  enableProblemsPanel: boolean;
  cacheEnabled: boolean;
  cacheMaxSize: number;
  debounceDelay: number;
  sources: string[];
  severities: string[];
}

const CONFIG_SECTION = 'problemTranslator';

export function getSettings(): ExtensionSettings {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

  // Read legacy settings for migration
  const legacyOllamaUrl = config.get<string>('ollamaUrl', 'http://localhost:11434');
  const legacyModel = config.get<string>('model', 'qwen2.5:3b');

  return {
    enabled: config.get<boolean>('enabled', true),
    provider: config.get<LLMProviderType>('provider', 'ollama'),

    // Provider configs (with legacy fallback)
    ollama: {
      url: config.get<string>('ollama.url') || legacyOllamaUrl,
      model: config.get<string>('ollama.model') || legacyModel,
    },
    openai: {
      apiKey: config.get<string>('openai.apiKey', ''),
      model: config.get<string>('openai.model', 'gpt-4o-mini'),
      baseUrl: config.get<string>('openai.baseUrl', 'https://api.openai.com/v1'),
      organization: config.get<string>('openai.organization', ''),
    },
    claude: {
      apiKey: config.get<string>('claude.apiKey', ''),
      model: config.get<string>('claude.model', 'claude-3-haiku-20240307'),
    },
    gemini: {
      apiKey: config.get<string>('gemini.apiKey', ''),
      model: config.get<string>('gemini.model', 'gemini-1.5-flash'),
    },
    custom: {
      url: config.get<string>('custom.url', ''),
      apiKey: config.get<string>('custom.apiKey', ''),
      model: config.get<string>('custom.model', ''),
      headers: config.get<Record<string, string>>('custom.headers', {}),
      requestFormat: config.get<'openai' | 'ollama'>('custom.requestFormat', 'openai'),
    },

    // Legacy (deprecated but kept for backward compatibility)
    ollamaUrl: legacyOllamaUrl,
    model: legacyModel,

    // Common
    targetLanguage: config.get<string>('targetLanguage', 'Korean'),
    displayMode: config.get<'original' | 'translated' | 'both'>('displayMode', 'both'),
    enableHover: config.get<boolean>('enableHover', true),
    enableProblemsPanel: config.get<boolean>('enableProblemsPanel', true),
    cacheEnabled: config.get<boolean>('cacheEnabled', true),
    cacheMaxSize: config.get<number>('cacheMaxSize', 1000),
    debounceDelay: config.get<number>('debounceDelay', 500),
    sources: config.get<string[]>('sources', []),
    severities: config.get<string[]>('severities', ['Error', 'Warning', 'Information', 'Hint']),
  };
}

// Helper to get current provider config
export function getCurrentProviderConfig(
  settings: ExtensionSettings
): ProviderConfigMap[LLMProviderType] {
  return settings[settings.provider] as ProviderConfigMap[LLMProviderType];
}

export function onSettingsChanged(
  callback: (settings: ExtensionSettings) => void
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(CONFIG_SECTION)) {
      callback(getSettings());
    }
  });
}
