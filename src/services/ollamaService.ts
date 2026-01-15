export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

export class OllamaService {
  private baseUrl: string;
  private model: string;
  private abortController: AbortController | null = null;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'qwen2.5:3b') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.model = model;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }

  setModel(model: string): void {
    this.model = model;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaTagsResponse;
      return data.models || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async generate(prompt: string): Promise<string> {
    this.abortController = new AbortController();

    try {
      const request: OllamaGenerateRequest = {
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more consistent translations
          num_predict: 500, // Limit response length
        },
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response.trim();
    } finally {
      this.abortController = null;
    }
  }

  async translate(message: string, targetLanguage: string = 'Korean'): Promise<string> {
    const prompt = this.buildTranslationPrompt(message, targetLanguage);
    return this.generate(prompt);
  }

  private buildTranslationPrompt(message: string, targetLanguage: string): string {
    return `You are a programming error message translator. Translate the following programming error/warning message to ${targetLanguage}.

Rules:
1. Keep technical terms (variable names, type names, file paths) in English
2. Keep error codes (like TS2322, no-unused-vars) unchanged
3. Be concise and natural
4. Only output the translation, nothing else

Error message: "${message}"

Translation:`;
  }

  cancelPendingRequests(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
