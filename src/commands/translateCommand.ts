import * as vscode from 'vscode';
import { DiagnosticsProvider } from '../providers/diagnosticsProvider.js';
import { TranslationService } from '../services/translationService.js';

export function registerTranslateCommand(
  context: vscode.ExtensionContext,
  diagnosticsProvider: DiagnosticsProvider,
  translationService: TranslationService
): void {
  const translateAllCommand = vscode.commands.registerCommand(
    'problemTranslator.translateAll',
    async () => {
      const isConnected = await translationService.checkOllamaConnection();

      if (!isConnected) {
        vscode.window.showErrorMessage(
          'Problem Translator: Cannot connect to Ollama. Please ensure Ollama is running.',
          'Open Settings'
        ).then(selection => {
          if (selection === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'problemTranslator.ollamaUrl');
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

          progress.report({ message: 'Translating diagnostics...' });

          try {
            await diagnosticsProvider.translateAllDiagnostics();
            vscode.window.showInformationMessage('Problem Translator: All diagnostics translated successfully.');
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
