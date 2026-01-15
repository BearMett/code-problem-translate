# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension that translates error/warning messages in the Problems panel using various LLM backends (Ollama, OpenAI, Claude, Gemini, or custom endpoints).

## Commands

```bash
npm run build      # Production build (esbuild)
npm run watch      # Development mode with file watching
npm run lint       # Run ESLint on src/**/*.ts
npm run test       # Run VS Code extension tests
npx tsc --noEmit   # Type check without emitting
```

## Architecture

```
extension.ts (entry point)
    │
    ├─→ TranslationService
    │   ├─→ LLMProviderFactory → [Ollama|OpenAI|Claude|Gemini|Custom]Provider
    │   └─→ CacheService (memory + globalState persistence)
    │
    ├─→ DiagnosticsProvider (Problems panel translation)
    │   └─→ TranslationService
    │
    ├─→ TranslatedHoverProvider (editor hover translation)
    │   └─→ TranslationService
    │
    └─→ Settings (getSettings, onSettingsChanged, getCurrentProviderConfig)
```

### Key Patterns

- **Factory Pattern**: `LLMProviderFactory` creates provider instances by type
- **Strategy Pattern**: `BaseLLMProvider` abstract class with provider-specific implementations
- **LRU Cache**: `CacheService` with memory cache + VS Code globalState persistence

### LLM Provider Interface

All providers implement `LLMProvider` interface from `src/providers/llm/types.ts`:
- `isConfigured()`: Check if provider has required configuration
- `checkConnection()`: Verify connectivity
- `translate(message, targetLanguage)`: Core translation method
- `cancelPendingRequests()`: Abort in-flight requests

### Settings Structure

Provider-specific settings are namespaced (e.g., `problemTranslator.openai.apiKey`). The `getCurrentProviderConfig()` helper returns the active provider's config based on `settings.provider`.

## Debugging

Press F5 in VS Code to launch extension development host. The `watch` task runs automatically.

## Code Style

- **No barrel exports**: Do not use `index.ts` files for re-exporting. Import directly from the source file.
  ```typescript
  // Good
  import { LLMProvider } from './providers/llm/types.js';
  import { OllamaProvider } from './providers/llm/ollamaProvider.js';

  // Bad
  import { LLMProvider, OllamaProvider } from './providers/llm/index.js';
  ```

## Notes

- Uses esbuild for fast bundling (not tsc for emit)
- External dependency: `vscode` module is excluded from bundle
- Target: ES2022 with Node16 module resolution
