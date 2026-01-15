import * as vscode from 'vscode';
import { TranslationService } from '../services/translationService.js';
import { getSettings, ExtensionSettings } from '../config/settings.js';
import { debounce } from '../utils/debounce.js';

interface TranslatedDiagnostic {
  original: vscode.Diagnostic;
  translatedMessage: string;
}

export class DiagnosticsProvider implements vscode.Disposable {
  private translatedCollection: vscode.DiagnosticCollection;
  private translationService: TranslationService;
  private settings: ExtensionSettings;
  private disposables: vscode.Disposable[] = [];
  private translationMap: Map<string, Map<string, TranslatedDiagnostic>> = new Map();
  private debouncedTranslate: (uri: vscode.Uri) => void;

  constructor(translationService: TranslationService) {
    this.translationService = translationService;
    this.settings = getSettings();

    this.translatedCollection = vscode.languages.createDiagnosticCollection('problem-translator');

    this.debouncedTranslate = debounce(
      (uri: vscode.Uri) => this.translateDiagnosticsForUri(uri),
      this.settings.debounceDelay
    );

    // Listen for diagnostic changes
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(e => {
        if (!this.settings.enabled || !this.settings.enableProblemsPanel) {
          return;
        }
        for (const uri of e.uris) {
          this.debouncedTranslate(uri);
        }
      })
    );
  }

  updateSettings(settings: ExtensionSettings): void {
    this.settings = settings;
    this.debouncedTranslate = debounce(
      (uri: vscode.Uri) => this.translateDiagnosticsForUri(uri),
      settings.debounceDelay
    );

    if (!settings.enabled || !settings.enableProblemsPanel) {
      this.translatedCollection.clear();
      this.translationMap.clear();
    }
  }

  async translateAllDiagnostics(): Promise<void> {
    const allDiagnostics = vscode.languages.getDiagnostics();

    for (const [uri] of allDiagnostics) {
      await this.translateDiagnosticsForUri(uri);
    }
  }

  private async translateDiagnosticsForUri(uri: vscode.Uri): Promise<void> {
    if (!this.settings.enabled || !this.settings.enableProblemsPanel) {
      return;
    }

    const diagnostics = vscode.languages.getDiagnostics(uri);
    const filteredDiagnostics = this.filterDiagnostics(diagnostics);

    if (filteredDiagnostics.length === 0) {
      this.translatedCollection.delete(uri);
      this.translationMap.delete(uri.toString());
      return;
    }

    const uriMap = new Map<string, TranslatedDiagnostic>();
    const translatedDiagnostics: vscode.Diagnostic[] = [];

    for (const diagnostic of filteredDiagnostics) {
      try {
        const result = await this.translationService.translate(diagnostic.message);

        const translatedDiagnostic = this.createTranslatedDiagnostic(diagnostic, result.translated);
        translatedDiagnostics.push(translatedDiagnostic);

        uriMap.set(this.getDiagnosticKey(diagnostic), {
          original: diagnostic,
          translatedMessage: result.translated,
        });
      } catch (error) {
        console.error('Failed to translate diagnostic:', error);
        // Keep original if translation fails
        translatedDiagnostics.push(diagnostic);
      }
    }

    this.translationMap.set(uri.toString(), uriMap);
    this.translatedCollection.set(uri, translatedDiagnostics);
  }

  private filterDiagnostics(diagnostics: readonly vscode.Diagnostic[]): vscode.Diagnostic[] {
    return diagnostics.filter(d => {
      // Filter by source
      if (this.settings.sources.length > 0 && d.source) {
        if (!this.settings.sources.some(s => d.source?.toLowerCase().includes(s.toLowerCase()))) {
          return false;
        }
      }

      // Filter by severity
      const severityName = this.getSeverityName(d.severity);
      if (!this.settings.severities.includes(severityName)) {
        return false;
      }

      return true;
    });
  }

  private getSeverityName(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'Error';
      case vscode.DiagnosticSeverity.Warning:
        return 'Warning';
      case vscode.DiagnosticSeverity.Information:
        return 'Information';
      case vscode.DiagnosticSeverity.Hint:
        return 'Hint';
      default:
        return 'Information';
    }
  }

  private createTranslatedDiagnostic(
    original: vscode.Diagnostic,
    translatedMessage: string
  ): vscode.Diagnostic {
    let message: string;

    switch (this.settings.displayMode) {
      case 'original':
        message = original.message;
        break;
      case 'translated':
        message = translatedMessage;
        break;
      case 'both':
      default:
        message = `${original.message}\n🌐 ${translatedMessage}`;
        break;
    }

    const translated = new vscode.Diagnostic(
      original.range,
      message,
      original.severity
    );

    translated.source = original.source ? `${original.source} (translated)` : 'translated';
    translated.code = original.code;
    translated.relatedInformation = original.relatedInformation;
    translated.tags = original.tags;

    return translated;
  }

  private getDiagnosticKey(diagnostic: vscode.Diagnostic): string {
    return `${diagnostic.range.start.line}:${diagnostic.range.start.character}:${diagnostic.message}`;
  }

  getTranslation(uri: vscode.Uri, diagnostic: vscode.Diagnostic): string | undefined {
    const uriMap = this.translationMap.get(uri.toString());
    if (!uriMap) return undefined;

    const key = this.getDiagnosticKey(diagnostic);
    return uriMap.get(key)?.translatedMessage;
  }

  clear(): void {
    this.translatedCollection.clear();
    this.translationMap.clear();
  }

  dispose(): void {
    this.translatedCollection.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
