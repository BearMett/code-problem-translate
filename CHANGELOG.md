# Changelog

All notable changes to the "Problem Translator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-15

### Added

- Initial release
- Problems 패널 에러/경고 메시지 번역 기능
- Hover 툴팁 번역 기능
- 다중 LLM Provider 지원
  - Ollama (로컬 LLM)
  - OpenAI (GPT-5, GPT-4.1, GPT-4o 시리즈)
  - Claude (Anthropic)
  - Gemini (Google)
  - Custom endpoint
- LRU 캐시 시스템으로 번역 결과 저장
- 소스 및 심각도별 필터링
- 표시 모드 설정 (원문만/번역만/둘 다)
- 번역 대상 언어 설정

### Commands

- `Problem Translator: Translate All Problems` - 모든 문제 번역
- `Problem Translator: Toggle Translation` - 번역 켜기/끄기
- `Problem Translator: Clear Translation Cache` - 캐시 삭제
- `Problem Translator: Show Status` - 상태 표시
