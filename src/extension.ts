import * as vscode from 'vscode';
import { TranslationService } from './services/translationService';
import { DiagnosticsProvider } from './providers/diagnosticsProvider';
import { TranslatedHoverProvider } from './providers/hoverProvider';
import { registerTranslateCommand } from './commands/translateCommand';
import {
  registerToggleCommand,
  registerClearCacheCommand,
  registerShowStatusCommand,
} from './commands/toggleCommand';
import { getSettings, onSettingsChanged } from './config/settings';

let translationService: TranslationService;
let diagnosticsProvider: DiagnosticsProvider;
let hoverProvider: TranslatedHoverProvider;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Problem Translator is now active');

  // Initialize services
  translationService = new TranslationService();
  translationService.initialize(context.globalState);

  diagnosticsProvider = new DiagnosticsProvider(translationService);
  hoverProvider = new TranslatedHoverProvider(translationService);

  // Register hover provider for all languages
  const hoverDisposable = vscode.languages.registerHoverProvider(
    { scheme: 'file', pattern: '**/*' },
    hoverProvider
  );
  context.subscriptions.push(hoverDisposable);

  // Register commands
  registerTranslateCommand(context, diagnosticsProvider, translationService);
  registerToggleCommand(context, diagnosticsProvider);
  registerClearCacheCommand(context, translationService);
  registerShowStatusCommand(context, translationService);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'problemTranslator.showStatus';
  context.subscriptions.push(statusBarItem);

  // Update status bar
  await updateStatusBar();

  // Listen for settings changes
  const settingsDisposable = onSettingsChanged((settings) => {
    translationService.updateSettings(settings);
    diagnosticsProvider.updateSettings(settings);
    hoverProvider.updateSettings(settings);
    updateStatusBar();
  });
  context.subscriptions.push(settingsDisposable);

  // Listen for translation completions to update status bar
  const translationDisposable = translationService.onTranslationComplete(() => {
    updateStatusBar();
  });
  context.subscriptions.push(translationDisposable);

  // Add disposables
  context.subscriptions.push({
    dispose: () => {
      translationService.dispose();
      diagnosticsProvider.dispose();
    },
  });

  // Check provider connection on startup
  const settings = getSettings();
  if (settings.enabled) {
    const providerInfo = translationService.getProviderInfo();

    if (!providerInfo.isConfigured) {
      showProviderConfigWarning(providerInfo.name, providerInfo.displayName);
    } else {
      const isConnected = await translationService.checkConnection();
      if (!isConnected) {
        showConnectionWarning(providerInfo.name, providerInfo.displayName);
      } else {
        // Translate existing diagnostics on startup
        await diagnosticsProvider.translateAllDiagnostics();
      }
    }
  }
}

function showProviderConfigWarning(providerName: string, displayName: string): void {
  const requiresApiKey = ['openai', 'claude', 'gemini'].includes(providerName);

  if (requiresApiKey) {
    vscode.window
      .showWarningMessage(
        `Problem Translator: ${displayName} API key is not configured.`,
        'Open Settings',
        'Dismiss'
      )
      .then((selection) => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            `problemTranslator.${providerName}.apiKey`
          );
        }
      });
  } else if (providerName === 'custom') {
    vscode.window
      .showWarningMessage(
        'Problem Translator: Custom endpoint URL is not configured.',
        'Open Settings',
        'Dismiss'
      )
      .then((selection) => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'problemTranslator.custom.url'
          );
        }
      });
  }
}

function showConnectionWarning(providerName: string, displayName: string): void {
  let message: string;
  let settingsKey: string;

  if (providerName === 'ollama') {
    message = `Problem Translator: Cannot connect to Ollama. Please ensure Ollama is running.`;
    settingsKey = 'problemTranslator.ollama.url';
  } else if (providerName === 'custom') {
    message = `Problem Translator: Cannot connect to custom endpoint.`;
    settingsKey = 'problemTranslator.custom.url';
  } else {
    message = `Problem Translator: Cannot connect to ${displayName}. Please check your API key.`;
    settingsKey = `problemTranslator.${providerName}.apiKey`;
  }

  vscode.window.showWarningMessage(message, 'Open Settings', 'Dismiss').then((selection) => {
    if (selection === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', settingsKey);
    }
  });
}

async function updateStatusBar(): Promise<void> {
  const settings = getSettings();

  if (!settings.enabled) {
    statusBarItem.text = '$(circle-slash) PT: Off';
    statusBarItem.tooltip = 'Problem Translator is disabled';
    statusBarItem.backgroundColor = undefined;
  } else {
    const providerInfo = translationService.getProviderInfo();
    const hitRate = translationService.getCacheHitRate();

    // Short provider name for status bar
    const providerShort = getProviderShortName(providerInfo.name);

    if (!providerInfo.isConfigured) {
      statusBarItem.text = `$(warning) PT: ${providerShort} Not Configured`;
      statusBarItem.tooltip = `Problem Translator - ${providerInfo.displayName} is not configured`;
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      const isConnected = await translationService.checkConnection();

      if (isConnected) {
        statusBarItem.text = `$(globe) PT: ${providerShort} ${hitRate.toFixed(0)}%`;
        statusBarItem.tooltip = `Problem Translator\nProvider: ${providerInfo.displayName}\nCache hit rate: ${hitRate.toFixed(1)}%\nClick for status`;
        statusBarItem.backgroundColor = undefined;
      } else {
        statusBarItem.text = `$(warning) PT: ${providerShort} Offline`;
        statusBarItem.tooltip = `Problem Translator - ${providerInfo.displayName} not connected`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      }
    }
  }

  statusBarItem.show();
}

function getProviderShortName(providerName: string): string {
  const shortNames: Record<string, string> = {
    ollama: 'Ollama',
    openai: 'GPT',
    claude: 'Claude',
    gemini: 'Gemini',
    custom: 'Custom',
  };
  return shortNames[providerName] || providerName;
}

export function deactivate(): void {
  console.log('Problem Translator is now deactivated');
}
