# Dream Interpretation Pages

## Live Demo

- [Open the public GitHub Pages demo](https://kim3310.github.io/dream-interpretation-pages/)
- Scope: credential-free, synthetic-data demo for technical review paths and evaluators.

> **Curated supporting repo**
> This repository is kept as optional proof, but it no longer leads the portfolio.
> Current front door: **aix-pilot and doeon-kim-portfolio**.
> Reason: Consumer SEO and entertainment traffic are not aligned with the strongest technical or B2B architecture story.

[![ci](https://github.com/KIM3310/dream-interpretation-pages/actions/workflows/ci.yml/badge.svg)](https://github.com/KIM3310/dream-interpretation-pages/actions/workflows/ci.yml)

Cloudflare Pages에 올릴 수 있는 꿈해몽 사이트입니다. 프런트는 `Vite + Vanilla TypeScript`, 서버는 `Pages Functions`를 사용하고, AI API(OpenAI 또는 Google Gemini)는 서버측에서만 호출합니다. `OPENAI_API_KEY`가 설정되면 OpenAI를 사용하고, 그렇지 않으면 `GEMINI_API_KEY`로 Google Gemini를 사용합니다. 둘 다 없으면 내장 fallback 해석이 제공됩니다.

## System Overview

A consumer AI app that tests fast distribution, safe fallback behavior, and lightweight personalization on a free hosting stack.

| Area | Details |
|---|---|
| Users | Consumer AI builders, content communities, and solo users who want low-friction creative interpretation. |
| Technical path | Validate the demo, README, architecture notes, and quality gate before deeper workflow review. |
| System scope | Cloudflare Pages functions, server-side AI adapters, abuse controls, deterministic fallback output, and Vite/TypeScript app surface. |
| Operating boundary | Interpretations are entertainment/reflection content; user prompts need privacy controls and abuse-rate limits. |
| Evaluation path | Run the local build/functions path and verify fallback behavior without model-provider keys. |

## Evaluation Path

- **Start here:** Submit one prompt without provider keys and confirm the deterministic fallback path is still useful.
- **Local demo:** Run `npm install`, `npm run build`, and `npm run cf:dev`, then open `http://127.0.0.1:8788`.
- **Checks:** Run `npm run verify`; use `/api/architecture-pack` to inspect abuse controls and model contracts.

## Service Launch Playbook

- [Service launch playbook](docs/service-launch-playbook.md) maps the repository to its product scope, operating gates, operating boundaries, and risk controls.

## Architecture Notes

- [Architecture guide](docs/architecture-evidence-map.md) summarizes the system scope, first files to inspect, runtime commands, and known boundaries.
- [Quality notes](docs/quality-gate.md) lists the local checks, CI surface, and release expectations for this repository.
- [Enterprise readiness notes](docs/enterprise-readiness.md) outlines security, data, operations, integration, and handoff expectations.
- [Repository positioning](docs/repository-positioning.md) explains why this repository is archived/supporting and where the current technical entry points live.

## 포함된 것

- 메인 랜딩 페이지와 꿈해몽 입력 폼
- 입력 품질 점수, 포커스 선택, 결과 깊이 선택
- 초안 자동 저장/복원과 최근 리딩 저장
- 최근 리딩 검색/필터와 이전 결과 비교 카드
- 최근 리딩 JSON 내보내기
- 요약 복사, 공유, 입력 재사용 액션
- `/api/interpret` Pages Function
- `/api/architecture-pack` review-facing abuse/control contract
- 소개, 개인정보 처리방침, 문의, 상징 모음 정적 페이지
- `wrangler.toml`, `.dev.vars.example`, `.env.example`, `_headers`

## 로컬 실행

```bash
npm install
cp .dev.vars.example .dev.vars
cp .env.example .env.local
npm run build
npm run cf:dev
```

브라우저에서 `http://127.0.0.1:8788`로 확인할 수 있습니다.

## 환경 변수

- `OPENAI_API_KEY`: 선택 사항. OpenAI API 키 (설정하면 OpenAI를 우선 사용)
- `OPENAI_MODEL`: 선택 사항. 기본값은 `gpt-5.2`
- `GEMINI_API_KEY`: 선택 사항. Google Gemini API 키 (`OPENAI_API_KEY`가 없을 때 사용)
- `GEMINI_MODEL`: 선택 사항. 기본값은 `gemini-2.5-flash`
- `SITE_NAME`: 사이트 브랜드명
- `TURNSTILE_SECRET_KEY`: 선택 사항. 설정하면 폼 제출 전에 Turnstile 검증을 강제합니다.
- `RATE_LIMITER`: 선택 사항. Cloudflare KV 바인딩을 붙이면 분당 요청 제한이 isolate 간에도 더 안정적으로 유지됩니다.
- `VITE_TURNSTILE_SITE_KEY`: 선택 사항. 프런트엔드 위젯 렌더링용 값입니다. `.env.local` 또는 Pages 빌드 환경변수로 넣습니다.

## Cloudflare Pages 배포

1. Cloudflare 대시보드에서 Pages 프로젝트를 만듭니다.
2. 빌드 명령은 `npm run build`, 출력 디렉터리는 `dist`로 설정합니다.
3. Pages 프로젝트의 `Settings -> Environment variables`에 AI 키(`OPENAI_API_KEY` 또는 `GEMINI_API_KEY`), 모델명, `SITE_NAME`를 추가합니다.
4. 공개 트래픽에서 비용 남용을 막고 싶다면 Turnstile 위젯을 만들고 `TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY`도 같이 등록합니다.
5. 가능하면 KV 바인딩 `RATE_LIMITER`도 추가하세요.
6. Git 연동 없이 배포하려면:

```bash
npm run build
npx wrangler pages deploy dist --project-name <your-project-name>
```

## 공개 배포 전에 바꿔야 할 것

- `contact.html`의 플레이스홀더 이메일
- 실제 도메인 기준의 개인정보 처리 문구
- 자체 편집 콘텐츠 추가
- 운영자 정보와 브랜드 문구 구체화
- 상징 문서와 검색 유입용 원본 글 축적

AI가 만든 얇은 문서만으로는 콘텐츠 품질 유지가 어렵습니다. 꿈 상징 사전, 운영자 소개, FAQ, 실제 문의 채널 같은 신뢰 신호를 함께 쌓는 편이 낫습니다.

## 보안 메모

- `OPENAI_API_KEY`와 `GEMINI_API_KEY`는 `vars`가 아니라 secret으로 등록하세요.
- API에는 분당 6회 기본 제한이 걸려 있고, `RATE_LIMITER` KV를 붙이면 좀 더 안정적인 서버측 제한이 가능합니다.
- `/api/architecture-pack`에서 abuse posture, model contract, fail-closed 조건을 한 번에 검토할 수 있습니다.
- 공개 배포에서는 `TURNSTILE_SECRET_KEY` 또는 `RATE_LIMITER`가 없으면 AI 엔드포인트가 fail-closed 되도록 되어 있습니다.
- `public/_headers`에 기본 보안 헤더를 넣었습니다. 추후 Turnstile이나 외부 스크립트를 확장하면 허용 도메인을 같이 조정해야 합니다.

## Turnstile 선택 적용

`.env.local` 예시:

```bash
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

Cloudflare Pages 런타임 환경변수 예시:

```bash
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

## 검증

```bash
npm run check
npm run build
```

## 공개 전 최종 체크

- `OPENAI_API_KEY` 또는 `GEMINI_API_KEY`를 Pages secret으로 등록
- 필요하면 `TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY` 연결
- `contact.html`의 이메일과 운영 정보 교체
- 결과 품질을 실 API 키(OpenAI 또는 Gemini)로 한 번 이상 확인
- `npx wrangler pages deploy dist --project-name <your-project-name>` 실행

## Cloud + AI Architecture

- [Cloud + AI architecture blueprint](docs/cloud-ai-architecture.md)
- [Machine-readable architecture manifest](docs/architecture/blueprint.json)
- Validation command: `python3 scripts/validate_architecture_blueprint.py`

## Enterprise Productization

- [Product operating model](docs/product-operating-model.md) defines the product scope, trust boundary, operating checks, and service path for this repository.

## System Architecture

- [System architecture](docs/system-architecture.md) maps the runtime boundary, data/control flow, cloud or local deployment surface, and operating assumptions for this repository.

## Service Architecture

- [Service architecture](docs/service-architecture.md) defines the cloud resources, account information, cost controls, and production guardrails needed to turn this repo into a scoped service without publishing public financial assumptions.

<!-- search-growth-readme:start -->

## Search And Service Surface

- Public entry: free interpretation page with limited daily reports
- Paid boundary: premium saved journal, long-form reports, themes, and export packs
- Canonical URL: https://kim3310.github.io/dream-interpretation-pages/
- Lead capture: https://github.com/KIM3310/dream-interpretation-pages/issues/new?template=service-inquiry.yml&title=Private+workspace+inquiry%3A+Dream+Interpretation+Pages
- Machine-readable offer: [docs/service-offer.json](docs/service-offer.json)
- Search growth implementation: [docs/search-growth-implementation.md](docs/search-growth-implementation.md)
- Revenue architecture: [docs/revenue-architecture.md](docs/revenue-architecture.md)

<!-- search-growth-readme:end -->
