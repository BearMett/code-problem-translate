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

  // Fingerprint of last processed diagnostics per URI (to detect actual changes)
  private lastDiagnosticsFingerprint: Map<string, string> = new Map();

  // Track which original messages we've already translated for each URI
  private translatedMessages: Map<string, Set<string>> = new Map();

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
      this.lastDiagnosticsFingerprint.clear();
      this.translatedMessages.clear();
    }
  }

  async translateAllDiagnostics(): Promise<void> {
    const allDiagnostics = vscode.languages.getDiagnostics();

    for (const [uri] of allDiagnostics) {
      await this.translateDiagnosticsForUri(uri, true); // force=true
    }
  }

  private async translateDiagnosticsForUri(uri: vscode.Uri, force: boolean = false): Promise<void> {
    if (!this.settings.enabled || !this.settings.enableProblemsPanel) {
      return;
    }

    const uriString = uri.toString();

    // Get ALL diagnostics for this URI
    const allDiagnostics = vscode.languages.getDiagnostics(uri);

    // Filter to only original (non-translated) diagnostics
    const originalDiagnostics = this.filterOriginalDiagnostics(allDiagnostics);

    // Create fingerprint of original diagnostics
    const fingerprint = this.createFingerprint(originalDiagnostics);

    // Skip if nothing changed (unless forced)
    if (!force && this.lastDiagnosticsFingerprint.get(uriString) === fingerprint) {
      return;
    }

    // Update fingerprint
    this.lastDiagnosticsFingerprint.set(uriString, fingerprint);

    if (originalDiagnostics.length === 0) {
      this.translatedCollection.delete(uri);
      this.translationMap.delete(uriString);
      this.translatedMessages.delete(uriString);
      return;
    }

    const uriMap = new Map<string, TranslatedDiagnostic>();
    const translatedDiagnostics: vscode.Diagnostic[] = [];
    const newTranslatedMessages = new Set<string>();

    for (const diagnostic of originalDiagnostics) {
      try {
        const result = await this.translationService.translate(diagnostic.message);

        const translatedDiagnostic = this.createTranslatedDiagnostic(diagnostic, result.translated);
        translatedDiagnostics.push(translatedDiagnostic);

        uriMap.set(this.getDiagnosticKey(diagnostic), {
          original: diagnostic,
          translatedMessage: result.translated,
        });

        newTranslatedMessages.add(diagnostic.message);
      } catch (error) {
        console.error('Failed to translate diagnostic:', error);
        // Keep original if translation fails
        translatedDiagnostics.push(diagnostic);
      }
    }

    this.translationMap.set(uriString, uriMap);
    this.translatedMessages.set(uriString, newTranslatedMessages);
    this.translatedCollection.set(uri, translatedDiagnostics);
  }

  /**
   * Filter to get only original (non-translated) diagnostics
   */
  private filterOriginalDiagnostics(diagnostics: readonly vscode.Diagnostic[]): vscode.Diagnostic[] {
    return diagnostics.filter(d => {
      // Skip diagnostics from our own collection
      if (this.isOurDiagnostic(d)) {
        return false;
      }

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

  /**
   * Check if a diagnostic was created by this extension
   */
  private isOurDiagnostic(diagnostic: vscode.Diagnostic): boolean {
    // Primary check: source marker
    if (diagnostic.source?.includes('(translated)')) {
      return true;
    }
    if (diagnostic.source === 'translated') {
      return true;
    }
    if (diagnostic.source === 'problem-translator') {
      return true;
    }

    // Secondary check: message contains our marker
    if (diagnostic.message.includes('🌐 ')) {
      return true;
    }

    return false;
  }

  /**
   * Create a fingerprint of diagnostics to detect changes
   */
  private createFingerprint(diagnostics: vscode.Diagnostic[]): string {
    const parts = diagnostics.map(d =>
      `${d.range.start.line}:${d.range.start.character}:${d.severity}:${d.source}:${d.message}`
    ).sort();
    return parts.join('|||');
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
    this.lastDiagnosticsFingerprint.clear();
    this.translatedMessages.clear();
  }

  dispose(): void {
    this.translatedCollection.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
