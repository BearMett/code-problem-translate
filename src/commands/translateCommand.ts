import * as vscode from 'vscode';
import { DiagnosticsProvider } from '../providers/diagnosticsProvider';
import { TranslationService } from '../services/translationService';

export function registerTranslateCommand(
  context: vscode.ExtensionContext,
  diagnosticsProvider: DiagnosticsProvider,
  translationService: TranslationService
): void {
  const translateAllCommand = vscode.commands.registerCommand(
    'problemTranslator.translateAll',
    async () => {
      const providerInfo = translationService.getProviderInfo();

      if (!providerInfo.isConfigured) {
        const settingsKey =
          providerInfo.name === 'custom'
            ? 'problemTranslator.custom.url'
            : `problemTranslator.${providerInfo.name}.apiKey`;

        vscode.window
          .showErrorMessage(
            `Problem Translator: ${providerInfo.displayName} is not configured.`,
            'Open Settings'
          )
          .then((selection) => {
            if (selection === 'Open Settings') {
              vscode.commands.executeCommand('workbench.action.openSettings', settingsKey);
            }
          });
        return;
      }

      const isConnected = await translationService.checkConnection();

      if (!isConnected) {
        const settingsKey =
          providerInfo.name === 'ollama'
            ? 'problemTranslator.ollama.url'
            : providerInfo.name === 'custom'
              ? 'problemTranslator.custom.url'
              : `problemTranslator.${providerInfo.name}.apiKey`;

        vscode.window
          .showErrorMessage(
            `Problem Translator: Cannot connect to ${providerInfo.displayName}.`,
            'Open Settings'
          )
          .then((selection) => {
            if (selection === 'Open Settings') {
              vscode.commands.executeCommand('workbench.action.openSettings', settingsKey);
            }
          });
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Problem Translator',
          cancellable: true,
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            translationService.cancelPendingTranslations();
          });

          progress.report({
            message: `Translating diagnostics with ${providerInfo.displayName}...`,
          });

          try {
            await diagnosticsProvider.translateAllDiagnostics();
            vscode.window.showInformationMessage(
              'Problem Translator: All diagnostics translated successfully.'
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Problem Translator: Translation failed - ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      );
    }
  );

  context.subscriptions.push(translateAllCommand);
}
