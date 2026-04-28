<div align="center">

> 🤖 이 문서는 영어 원본에서 기계 번역되었습니다. PR을 통한 개선을 환영합니다 — [번역 기여 가이드](../README.md) 참조.

# Lore Context

**AI 에이전트 메모리, 평가, 거버넌스를 위한 컨트롤 플레인.**

메모리가 프로덕션 리스크가 되기 전에 — 모든 에이전트가 기억한 것, 사용한 것, 삭제해야 할 것을 파악하십시오.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[시작하기](../../getting-started.md) · [API 참조](../../api-reference.md) · [아키텍처](../../architecture.md) · [통합](../../../integrations/README.md) · [배포](../../../deployment/README.md) · [변경 이력](CHANGELOG.md)

🌐 **다른 언어로 읽기**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## Lore Context란 무엇인가

Lore Context는 AI 에이전트 메모리를 위한 **오픈 코어 컨트롤 플레인**입니다. 메모리, 검색, 도구 추적 전반에 걸쳐 컨텍스트를 구성하고, 사용자 소유 데이터셋에 대한 검색 품질을 평가하며, 민감한 콘텐츠에 대한 거버넌스 검토를 라우팅하고, 메모리를 백엔드 간 이동 가능한 이식성 있는 교환 형식으로 내보냅니다.

또 다른 메모리 데이터베이스가 되려 하지 않습니다. 고유한 가치는 메모리 위에 위치하는 것입니다:

- **Context Query** — 단일 엔드포인트가 메모리 + 웹 + 레포지토리 + 도구 추적을 구성하여, 출처가 포함된 등급 컨텍스트 블록을 반환합니다.
- **Memory Eval** — 사용자 소유 데이터셋에서 Recall@K, Precision@K, MRR, stale-hit-rate, p95 레이턴시를 실행합니다. 실행 결과를 저장하고 회귀 탐지를 위해 diff를 비교합니다.
- **Governance Review** — 6단계 수명 주기(`candidate / active / flagged / redacted / superseded / deleted`), 위험 태그 스캐닝, 포이즈닝 휴리스틱, 변경 불가 감사 로그.
- **MIF 유사 이식성** — `provenance / validity / confidence / source_refs / supersedes / contradicts`를 보존하는 JSON + Markdown 내보내기/가져오기. 메모리 백엔드 간 마이그레이션 형식으로 작동합니다.
- **Multi-Agent 어댑터** — 버전 프로브 + 저하 모드 폴백이 있는 최우선 `agentmemory` 통합. 추가 런타임을 위한 깔끔한 어댑터 계약.

## 언제 사용할까

| Lore Context 사용 시... | 메모리 데이터베이스(agentmemory, Mem0, Supermemory) 사용 시... |
|---|---|
| 에이전트가 기억한 것, 이유, 사용 여부를 **증명**해야 할 때 | 단순 메모리 저장소만 필요할 때 |
| 여러 에이전트(Claude Code, Cursor, Qwen, Hermes, Dify)를 운영하며 공유 가능한 신뢰할 수 있는 컨텍스트가 필요할 때 | 단일 에이전트를 구축하고 벤더 종속 메모리 계층을 수용할 때 |
| 컴플라이언스를 위한 로컬 또는 프라이빗 배포가 필요할 때 | 호스팅 SaaS를 선호할 때 |
| 벤더 벤치마크가 아닌 사용자 소유 데이터셋에서 평가가 필요할 때 | 벤더 벤치마크로 충분할 때 |
| 시스템 간 메모리 마이그레이션이 필요할 때 | 백엔드 전환 계획이 없을 때 |

## 빠른 시작

```bash
# 1. 클론 + 설치
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. 실제 API 키 생성 (로컬 전용 개발 이외의 환경에서는 플레이스홀더 사용 금지)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. API 시작 (파일 기반, Postgres 불필요)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. 메모리 쓰기
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. 컨텍스트 조회
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

전체 설정(Postgres, Docker Compose, 대시보드, MCP 통합)은 [docs/getting-started.md](../../getting-started.md)를 참조하십시오.

## 아키텍처

```text
                       ┌─────────────────────────────────────────────┐
   MCP clients ──────► │ apps/api  (REST + auth + rate limit + logs) │
   (Claude Code,       │   ├── context router (memory/web/repo/tool) │
    Cursor, Qwen,      │   ├── context composer                      │
    Dify, Hermes...)   │   ├── governance + audit                    │
                       │   ├── eval runner                           │
                       │   └── MIF import/export                     │
                       └────────┬────────────────────────────────────┘
                                │
                  ┌─────────────┼──────────────────────────┐
                  ▼             ▼                          ▼
           Postgres+pgvector   agentmemory adapter     packages/search
           (incremental        (version-probed,        (BM25 / hybrid
            persistence)        degraded-mode safe)     pluggable)
                                                                 ▲
                       ┌─────────────────────────────┐           │
                       │ apps/dashboard  (Next.js)   │ ──────────┘
                       │   protected by Basic Auth   │
                       │   memory · traces · eval    │
                       │   governance review queue   │
                       └─────────────────────────────┘
```

자세한 내용은 [docs/architecture.md](../../architecture.md)를 참조하십시오.

## v0.4.0-alpha에 포함된 기능

| 기능 | 상태 | 위치 |
|---|---|---|
| API 키 인증(reader/writer/admin)이 있는 REST API | ✅ 프로덕션 | `apps/api` |
| MCP stdio 서버 (레거시 + 공식 SDK 전송) | ✅ 프로덕션 | `apps/mcp-server` |
| HTTP Basic Auth 게이팅이 있는 Next.js 대시보드 | ✅ 프로덕션 | `apps/dashboard` |
| Postgres + pgvector 증분 영속성 | ✅ 선택 사항 | `apps/api/src/db/` |
| 거버넌스 상태 머신 + 감사 로그 | ✅ 프로덕션 | `packages/governance` |
| Eval 실행기 (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ 프로덕션 | `packages/eval` |
| `supersedes` + `contradicts`를 포함한 MIF v0.2 가져오기/내보내기 | ✅ 프로덕션 | `packages/mif` |
| 버전 프로브 + 저하 모드가 있는 `agentmemory` 어댑터 | ✅ 프로덕션 | `packages/agentmemory-adapter` |
| 속도 제한 (IP별 + 키별 백오프) | ✅ 프로덕션 | `apps/api` |
| 민감 필드 자동 수정이 있는 구조화된 JSON 로깅 | ✅ 프로덕션 | `apps/api/src/logger.ts` |
| Docker Compose 프라이빗 배포 | ✅ 프로덕션 | `docker-compose.yml` |
| 데모 데이터셋 + 스모크 테스트 + Playwright UI 테스트 | ✅ 프로덕션 | `examples/`, `scripts/` |
| 호스팅 멀티테넌트 클라우드 동기화 | ⏳ 로드맵 | — |

전체 v0.4.0-alpha 릴리스 노트는 [CHANGELOG.md](CHANGELOG.md)를 참조하십시오.

## 통합

Lore Context는 MCP와 REST를 지원하며 대부분의 에이전트 IDE 및 채팅 프론트엔드와 통합됩니다:

| 도구 | 설정 가이드 |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](../../../integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](../../../integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](../../../integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](../../../integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](../../../integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](../../../integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](../../../integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](../../../integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](../../../integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](../../../integrations/openwebui.md) |
| 기타 / 일반 MCP | [docs/integrations/README.md](integrations.md) |

## 배포

| 모드 | 사용 시기 | 문서 |
|---|---|---|
| **로컬 파일 기반** | 솔로 개발, 프로토타입, 스모크 테스트 | 이 README, 위의 빠른 시작 |
| **로컬 Postgres+pgvector** | 프로덕션급 단일 노드, 대규모 시맨틱 검색 | [docs/deployment/README.md](deployment.md) |
| **Docker Compose 프라이빗** | 셀프 호스팅 팀 배포, 격리된 네트워크 | [docs/deployment/compose.private-demo.yml](../../../deployment/compose.private-demo.yml) |
| **클라우드 관리** | v0.6에서 제공 예정 | — |

모든 배포 경로에는 명시적인 시크릿이 필요합니다: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. `scripts/check-env.mjs` 스크립트는 값이 플레이스홀더 패턴과 일치하면 프로덕션 시작을 거부합니다.

## 보안

v0.4.0-alpha는 비공개 알파 배포에 적합한 심층 방어 자세를 구현합니다:

- **인증**: 역할 분리(`reader`/`writer`/`admin`) 및 프로젝트별 범위를 갖춘 API 키 Bearer 토큰. 빈 키 모드는 프로덕션에서 실패 폐쇄 방식으로 동작합니다.
- **속도 제한**: IP별 + 키별 이중 버킷, 인증 실패 백오프(60초 내 5회 실패 시 429, 30초 잠금).
- **대시보드**: HTTP Basic Auth 미들웨어. `DASHBOARD_BASIC_AUTH_USER/PASS` 없이는 프로덕션 시작을 거부합니다.
- **컨테이너**: 모든 Dockerfile은 비루트 `node` 사용자로 실행. api + 대시보드에 HEALTHCHECK.
- **시크릿**: 하드코딩된 자격증명 없음. 모든 기본값은 필수-또는-실패 변수입니다. `scripts/check-env.mjs`는 프로덕션에서 플레이스홀더 값을 거부합니다.
- **거버넌스**: 쓰기 시 PII / API 키 / JWT / 개인 키 정규식 스캐닝. 위험 태그된 콘텐츠는 검토 큐로 자동 라우팅. 모든 상태 전환에 대한 변경 불가 감사 로그.
- **메모리 포이즈닝**: 합의 + 명령형 동사 패턴에 대한 휴리스틱 감지.
- **MCP**: 모든 도구 입력에 대한 zod 스키마 유효성 검사. 변경 도구는 `reason`(8자 이상)이 필요하며 `destructiveHint: true`를 표시합니다. 업스트림 오류는 클라이언트 반환 전에 무해화됩니다.
- **로깅**: `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key` 필드가 자동 수정된 구조화된 JSON.

취약점 공개: [SECURITY.md](SECURITY.md).

## 프로젝트 구조

```text
apps/
  api/                # REST API + Postgres + governance + eval (TypeScript)
  dashboard/          # Next.js 16 대시보드 with Basic Auth middleware
  mcp-server/         # MCP stdio 서버 (레거시 + 공식 SDK 전송)
  web/                # 서버 사이드 HTML 렌더러 (JS 미사용 폴백 UI)
  website/            # 마케팅 사이트 (별도 관리)
packages/
  shared/             # 공유 타입, 오류, ID/토큰 유틸리티
  agentmemory-adapter # 업스트림 agentmemory + 버전 프로브 브릿지
  search/             # 플러그 가능 검색 공급자 (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + 메트릭 기본 요소
  governance/         # 상태 머신 + 위험 스캔 + 포이즈닝 + 감사
docs/
  i18n/<lang>/        # 17개 언어 현지화 README
  integrations/       # 11개 에이전트 IDE 통합 가이드
  deployment/         # 로컬 + Postgres + Docker Compose
  legal/              # 개인정보처리방침 / 이용약관 / 쿠키 (싱가포르 법)
scripts/
  check-env.mjs       # 프로덕션 모드 환경 변수 유효성 검사
  smoke-*.mjs         # 엔드 투 엔드 스모크 테스트
  apply-postgres-schema.mjs
```

## 요구 사항

- Node.js `>=22`
- pnpm `10.30.1`
- (선택 사항) 시맨틱 검색급 메모리를 위한 pgvector가 있는 Postgres 16

## 기여

기여를 환영합니다. 개발 워크플로, 커밋 메시지 프로토콜 및 검토 기대 사항은 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어 주십시오.

문서 번역은 [i18n 기여자 가이드](../README.md)를 참조하십시오.

## 운영 주체

Lore Context는 **REDLAND PTE. LTD.**(싱가포르, UEN 202304648K)가 운영합니다. 회사 프로필, 법적 조건 및 데이터 처리는 [`docs/legal/`](../../../legal/)에 문서화되어 있습니다.

## 라이선스

Lore Context 레포지토리는 [Apache License 2.0](../../../LICENSE)에 따라 라이선스가 부여됩니다. `packages/*`의 개별 패키지는 다운스트림 소비를 가능하게 하기 위해 MIT를 선언합니다. 업스트림 귀속은 [NOTICE](../../../NOTICE)를 참조하십시오.

## 감사의 말

Lore Context는 로컬 메모리 런타임으로 [agentmemory](https://github.com/agentmemory/agentmemory) 위에 구축됩니다. 업스트림 계약 세부 사항 및 버전 호환성 정책은 [UPSTREAM.md](../../../UPSTREAM.md)에 문서화되어 있습니다.
