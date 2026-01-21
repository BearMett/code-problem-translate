import * as vscode from 'vscode';
import { TranslationService } from '../services/translationService';
import { getSettings, ExtensionSettings } from '../config/settings';

export class TranslatedHoverProvider implements vscode.HoverProvider {
  private translationService: TranslationService;
  private settings: ExtensionSettings;
  private translationCache: Map<string, string> = new Map();

  constructor(translationService: TranslationService) {
    this.translationService = translationService;
    this.settings = getSettings();
  }

  updateSettings(settings: ExtensionSettings): void {
    this.settings = settings;
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    if (!this.settings.enabled || !this.settings.enableHover) {
      return undefined;
    }

    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    const diagnosticAtPosition = diagnostics.find(
      (d) => d.range.contains(position) && !this.isTranslatedDiagnostic(d)
    );

    if (!diagnosticAtPosition) {
      return undefined;
    }

    try {
      const translation = await this.getOrTranslate(diagnosticAtPosition.message);

      const content = new vscode.MarkdownString();
      content.isTrusted = true;

      // Add severity icon
      const severityIcon = this.getSeverityIcon(diagnosticAtPosition.severity);

      content.appendMarkdown(`### ${severityIcon} Diagnostic Translation\n\n`);

      // Original message
      content.appendMarkdown(`**Original:**\n\`\`\`\n${diagnosticAtPosition.message}\n\`\`\`\n\n`);

      // Translated message
      content.appendMarkdown(
        `**${this.settings.targetLanguage}:**\n\`\`\`\n${translation}\n\`\`\`\n\n`
      );

      // Add source and code info
      if (diagnosticAtPosition.source || diagnosticAtPosition.code) {
        content.appendMarkdown('---\n');
        if (diagnosticAtPosition.source) {
          content.appendMarkdown(`*Source: ${diagnosticAtPosition.source}*`);
        }
        if (diagnosticAtPosition.code) {
          const codeStr =
            typeof diagnosticAtPosition.code === 'object'
              ? diagnosticAtPosition.code.value
              : diagnosticAtPosition.code;
          content.appendMarkdown(` | *Code: ${codeStr}*`);
        }
      }

      return new vscode.Hover(content, diagnosticAtPosition.range);
    } catch (error) {
      console.error('Failed to provide hover translation:', error);
      return undefined;
    }
  }

  private async getOrTranslate(message: string): Promise<string> {
    // Check local hover cache first
    const cached = this.translationCache.get(message);
    if (cached) {
      return cached;
    }

    // Use translation service (which has its own cache)
    const result = await this.translationService.translate(message);
    this.translationCache.set(message, result.translated);

    return result.translated;
  }

  private getSeverityIcon(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return '🔴';
      case vscode.DiagnosticSeverity.Warning:
        return '🟡';
      case vscode.DiagnosticSeverity.Information:
        return '🔵';
      case vscode.DiagnosticSeverity.Hint:
        return '💡';
      default:
        return 'ℹ️';
    }
  }

  clearCache(): void {
    this.translationCache.clear();
  }

  /**
   * Check if a diagnostic was created by the translator (circular reference prevention)
   */
  private isTranslatedDiagnostic(diagnostic: vscode.Diagnostic): boolean {
    if (diagnostic.source?.includes('(translated)')) {
      return true;
    }
    if (diagnostic.source === 'translated') {
      return true;
    }
    if (diagnostic.message.includes('🌐 ')) {
      return true;
    }
    return false;
  }
}
