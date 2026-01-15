import * as vscode from 'vscode';

export interface ExtensionSettings {
  enabled: boolean;
  ollamaUrl: string;
  model: string;
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

  return {
    enabled: config.get<boolean>('enabled', true),
    ollamaUrl: config.get<string>('ollamaUrl', 'http://localhost:11434'),
    model: config.get<string>('model', 'qwen2.5:3b'),
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

export function onSettingsChanged(callback: (settings: ExtensionSettings) => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration(CONFIG_SECTION)) {
      callback(getSettings());
    }
  });
}
