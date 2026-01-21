# Problem Translator

Translates error/warning messages in VS Code's Problems panel to your preferred language using various LLMs.

## Features

- **Problems Panel Translation**: Real-time translation of errors, warnings, info, and hints
- **Multiple LLM Support**: Ollama, OpenAI, Claude, Gemini, Custom endpoint

## Installation

1. Search for "Problem Translator" in VS Code Marketplace
2. Click Install

Or install directly from `.vsix` file:
```bash
code --install-extension problem-translator-0.1.0.vsix
```

## Configuration

### Provider Selection

Select the LLM provider in settings:

```json
{
  "problemTranslator.provider": "ollama"  // ollama, openai, claude, gemini, custom
}
```

### Ollama (Local LLM)

Free local LLM. Install [Ollama](https://ollama.ai) first.

```json
{
  "problemTranslator.provider": "ollama",
  "problemTranslator.ollama.url": "http://localhost:11434",
  "problemTranslator.ollama.model": "qwen2.5:3b"
}
```

**Recommended models**: `qwen2.5:3b`, `qwen2.5:7b`, `llama3.2:3b`, `exaone3.5:7.8b`

### OpenAI

```json
{
  "problemTranslator.provider": "openai",
  "problemTranslator.openai.apiKey": "sk-...",
  "problemTranslator.openai.model": "gpt-5-nano"
}
```

**Supported models**: `gpt-5.2`, `gpt-5-mini`, `gpt-5-nano`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o`, `gpt-4o-mini`

### Claude (Anthropic)

```json
{
  "problemTranslator.provider": "claude",
  "problemTranslator.claude.apiKey": "sk-ant-...",
  "problemTranslator.claude.model": "claude-haiku-4-5-20251001"
}
```

**Supported models**: `claude-haiku-4-5-20251001`, `claude-sonnet-4-5-20250929`, `claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20241022`

### Gemini (Google)

```json
{
  "problemTranslator.provider": "gemini",
  "problemTranslator.gemini.apiKey": "...",
  "problemTranslator.gemini.model": "gemini-2.5-flash"
}
```

**Supported models**: `gemini-2.5-flash`, `gemini-2.5-pro`

### Custom Endpoint

Use self-hosted or other APIs.

```json
{
  "problemTranslator.provider": "custom",
  "problemTranslator.custom.url": "https://your-api-endpoint/v1/chat/completions",
  "problemTranslator.custom.apiKey": "optional-api-key",
  "problemTranslator.custom.model": "your-model-name",
  "problemTranslator.custom.requestFormat": "openai"  // openai or ollama
}
```

## Commands

| Command | Description |
|---------|-------------|
| `Problem Translator: Translate All Problems` | Translate all problems |
| `Problem Translator: Toggle Translation` | Toggle translation on/off |
| `Problem Translator: Clear Translation Cache` | Clear translation cache |
| `Problem Translator: Show Status` | Show current status |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `problemTranslator.enabled` | `true` | Enable automatic translation |
| `problemTranslator.targetLanguage` | `Korean` | Target language |
| `problemTranslator.displayMode` | `both` | Display mode (original/translated/both) |
| `problemTranslator.enableHover` | `true` | Enable hover translation |
| `problemTranslator.enableProblemsPanel` | `true` | Enable Problems panel translation |
| `problemTranslator.cacheEnabled` | `true` | Enable cache |
| `problemTranslator.cacheMaxSize` | `1000` | Maximum cache size |
| `problemTranslator.debounceDelay` | `500` | Translation delay (ms) |
| `problemTranslator.sources` | `[]` | Source filter (empty = all) |
| `problemTranslator.severities` | `["Error", "Warning", "Information", "Hint"]` | Severity filter |

## License

MIT License - see [LICENSE](../LICENSE) file for details.

## Repository

https://github.com/BearMett/code-problem-translate
