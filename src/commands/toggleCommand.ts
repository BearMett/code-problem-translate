import * as vscode from 'vscode';
import { DiagnosticsProvider } from '../providers/diagnosticsProvider.js';
import { TranslationService } from '../services/translationService.js';
import { getSettings } from '../config/settings.js';

export function registerToggleCommand(
  context: vscode.ExtensionContext,
  diagnosticsProvider: DiagnosticsProvider
): void {
  const toggleCommand = vscode.commands.registerCommand('problemTranslator.toggle', async () => {
    const config = vscode.workspace.getConfiguration('problemTranslator');
    const currentEnabled = config.get<boolean>('enabled', true);

    await config.update('enabled', !currentEnabled, vscode.ConfigurationTarget.Global);

    const newState = !currentEnabled ? 'enabled' : 'disabled';
    vscode.window.showInformationMessage(`Problem Translator: Translation ${newState}`);

    if (!currentEnabled) {
      // If enabling, translate all current diagnostics
      await diagnosticsProvider.translateAllDiagnostics();
    } else {
      // If disabling, clear translations
      diagnosticsProvider.clear();
    }
  });

  context.subscriptions.push(toggleCommand);
}

export function registerClearCacheCommand(
  context: vscode.ExtensionContext,
  translationService: TranslationService
): void {
  const clearCacheCommand = vscode.commands.registerCommand(
    'problemTranslator.clearCache',
    async () => {
      await translationService.clearCache();
      vscode.window.showInformationMessage('Problem Translator: Cache cleared successfully.');
    }
  );

  context.subscriptions.push(clearCacheCommand);
}

export function registerShowStatusCommand(
  context: vscode.ExtensionContext,
  translationService: TranslationService
): void {
  const showStatusCommand = vscode.commands.registerCommand(
    'problemTranslator.showStatus',
    async () => {
      const providerInfo = translationService.getProviderInfo();
      const isConnected = await translationService.checkConnection();
      const settings = getSettings();
      const cacheStats = translationService.getCacheStats();
      const hitRate = translationService.getCacheHitRate();

      // Get provider-specific config
      const providerConfig = settings[settings.provider];
      const modelName =
        'model' in providerConfig ? (providerConfig as { model: string }).model : 'N/A';

      const statusItems = [
        `Provider: ${providerInfo.displayName}`,
        `Connection: ${isConnected ? '✅ Connected' : '❌ Disconnected'}`,
        `Configured: ${providerInfo.isConfigured ? 'Yes' : 'No'}`,
        `Model: ${modelName}`,
        `Target Language: ${settings.targetLanguage}`,
        `Translation Enabled: ${settings.enabled ? 'Yes' : 'No'}`,
        `Hover Enabled: ${settings.enableHover ? 'Yes' : 'No'}`,
        `Problems Panel Enabled: ${settings.enableProblemsPanel ? 'Yes' : 'No'}`,
        `Cache: ${cacheStats.size} items`,
        `Cache Hit Rate: ${hitRate.toFixed(1)}%`,
      ];

      const panel = vscode.window.createOutputChannel('Problem Translator Status');
      panel.clear();
      panel.appendLine('=== Problem Translator Status ===\n');
      statusItems.forEach((item) => panel.appendLine(item));
      panel.show();
    }
  );

  context.subscriptions.push(showStatusCommand);
}
