import * as vscode from 'vscode';
import { TranslationService } from './services/translationService.js';
import { DiagnosticsProvider } from './providers/diagnosticsProvider.js';
import { TranslatedHoverProvider } from './providers/hoverProvider.js';
import { registerTranslateCommand } from './commands/translateCommand.js';
import { registerToggleCommand, registerClearCacheCommand, registerShowStatusCommand } from './commands/toggleCommand.js';
import { getSettings, onSettingsChanged } from './config/settings.js';

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
  const settingsDisposable = onSettingsChanged(settings => {
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

  // Check Ollama connection on startup
  const settings = getSettings();
  if (settings.enabled) {
    const isConnected = await translationService.checkOllamaConnection();
    if (!isConnected) {
      vscode.window.showWarningMessage(
        'Problem Translator: Cannot connect to Ollama. Please ensure Ollama is running.',
        'Open Settings',
        'Dismiss'
      ).then(selection => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'problemTranslator.ollamaUrl');
        }
      });
    } else {
      // Translate existing diagnostics on startup
      await diagnosticsProvider.translateAllDiagnostics();
    }
  }
}

async function updateStatusBar(): Promise<void> {
  const settings = getSettings();

  if (!settings.enabled) {
    statusBarItem.text = '$(circle-slash) PT: Off';
    statusBarItem.tooltip = 'Problem Translator is disabled';
    statusBarItem.backgroundColor = undefined;
  } else {
    const isConnected = await translationService.checkOllamaConnection();
    const hitRate = translationService.getCacheHitRate();

    if (isConnected) {
      statusBarItem.text = `$(globe) PT: ${hitRate.toFixed(0)}%`;
      statusBarItem.tooltip = `Problem Translator - Cache hit rate: ${hitRate.toFixed(1)}%\nClick for status`;
      statusBarItem.backgroundColor = undefined;
    } else {
      statusBarItem.text = '$(warning) PT: Offline';
      statusBarItem.tooltip = 'Problem Translator - Ollama not connected';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
  }

  statusBarItem.show();
}

export function deactivate(): void {
  console.log('Problem Translator is now deactivated');
}
