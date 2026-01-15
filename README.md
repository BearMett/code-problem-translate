# Problem Translator

VS Code Problems 패널의 에러/경고 메시지를 다양한 LLM을 통해 원하는 언어로 번역합니다.

## Features

- **Problems 패널 번역**: 에러, 경고, 정보, 힌트 메시지를 실시간으로 번역
- **Hover 번역**: 에디터에서 문제가 있는 코드에 마우스를 올리면 번역 표시
- **다중 LLM 지원**: Ollama, OpenAI, Claude, Gemini, Custom endpoint 지원
- **캐시 시스템**: 번역 결과를 캐시하여 중복 API 호출 방지
- **필터링**: 소스 및 심각도별 번역 대상 필터링

## Installation

1. VS Code Marketplace에서 "Problem Translator" 검색
2. Install 버튼 클릭

또는 `.vsix` 파일로 직접 설치:
```bash
code --install-extension problem-translator-0.1.0.vsix
```

## Configuration

### Provider 선택

설정에서 사용할 LLM Provider를 선택합니다:

```json
{
  "problemTranslator.provider": "ollama"  // ollama, openai, claude, gemini, custom
}
```

### Ollama (로컬 LLM)

무료로 사용 가능한 로컬 LLM입니다. [Ollama](https://ollama.ai)를 먼저 설치하세요.

```json
{
  "problemTranslator.provider": "ollama",
  "problemTranslator.ollama.url": "http://localhost:11434",
  "problemTranslator.ollama.model": "qwen2.5:3b"
}
```

**권장 모델**: `qwen2.5:3b`, `qwen2.5:7b`, `llama3.2:3b`

### OpenAI

```json
{
  "problemTranslator.provider": "openai",
  "problemTranslator.openai.apiKey": "sk-...",
  "problemTranslator.openai.model": "gpt-5-nano"
}
```

**지원 모델**: `gpt-5.2`, `gpt-5-mini`, `gpt-5-nano`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o`, `gpt-4o-mini`

### Claude (Anthropic)

```json
{
  "problemTranslator.provider": "claude",
  "problemTranslator.claude.apiKey": "sk-ant-...",
  "problemTranslator.claude.model": "claude-haiku-4-5-20251001"
}
```

**지원 모델**: `claude-haiku-4-5-20251001`, `claude-sonnet-4-5-20250929`, `claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20241022`

### Gemini (Google)

```json
{
  "problemTranslator.provider": "gemini",
  "problemTranslator.gemini.apiKey": "...",
  "problemTranslator.gemini.model": "gemini-2.5-flash"
}
```

**지원 모델**: `gemini-2.5-flash`, `gemini-2.5-pro`

### Custom Endpoint

자체 호스팅 또는 기타 API를 사용할 수 있습니다.

```json
{
  "problemTranslator.provider": "custom",
  "problemTranslator.custom.url": "https://your-api-endpoint/v1/chat/completions",
  "problemTranslator.custom.apiKey": "optional-api-key",
  "problemTranslator.custom.model": "your-model-name",
  "problemTranslator.custom.requestFormat": "openai"  // openai 또는 ollama
}
```

## Commands

| 명령어 | 설명 |
|--------|------|
| `Problem Translator: Translate All Problems` | 모든 문제 번역 |
| `Problem Translator: Toggle Translation` | 번역 켜기/끄기 |
| `Problem Translator: Clear Translation Cache` | 번역 캐시 삭제 |
| `Problem Translator: Show Status` | 현재 상태 표시 |

## Settings

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `problemTranslator.enabled` | `true` | 자동 번역 활성화 |
| `problemTranslator.targetLanguage` | `Korean` | 번역 대상 언어 |
| `problemTranslator.displayMode` | `both` | 표시 모드 (original/translated/both) |
| `problemTranslator.enableHover` | `true` | Hover 번역 활성화 |
| `problemTranslator.enableProblemsPanel` | `true` | Problems 패널 번역 활성화 |
| `problemTranslator.cacheEnabled` | `true` | 캐시 활성화 |
| `problemTranslator.cacheMaxSize` | `1000` | 최대 캐시 크기 |
| `problemTranslator.debounceDelay` | `500` | 번역 지연 시간 (ms) |
| `problemTranslator.sources` | `[]` | 번역할 소스 필터 (빈 배열 = 모두) |
| `problemTranslator.severities` | `["Error", "Warning", "Information", "Hint"]` | 번역할 심각도 필터 |

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Repository

https://github.com/BearMett/code-problem-translate
