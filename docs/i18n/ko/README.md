<div align="center">

# Lore Context

**AI 에이전트 메모리, 평가, 거버넌스를 위한 컨트롤 플레인.**

메모리가 프로덕션 리스크가 되기 전에, 모든 에이전트가 무엇을 기억하고 사용했으며 잊어야 하는지 파악하세요.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[시작하기](../../getting-started.md) · [웹사이트 퀵스타트](https://lorecontext.com/quickstart/) · [벤치마크 방법론](https://lorecontext.com/benchmark/) · [API 레퍼런스](../../api-reference.md) · [아키텍처](../../architecture.md) · [프로젝트 계획](../../project-plan.md) · [릴리스 상태](../../release-status.md) · [로드맵](../../roadmap.md) · [통합](../../integrations/README.md) · [배포](../../deployment/README.md) · [변경 내역](../../../CHANGELOG.md)

🌐 **다른 언어로 읽기**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

현지화된 문서는 현재 영어 릴리스 노트보다 늦을 수 있습니다. 정식 v2.1 문서는 영어 README 및 `docs/` 세트입니다.

</div>

---

> 이 문서는 영어 원본에서 기계 번역되었으며, 최신 릴리스보다 늦을 수 있습니다. 번역 개선을 위한 PR을 환영합니다. 번역 기여자 가이드는 [../README.md](../README.md)를 참조하세요.

## Lore Context란

Lore Context는 AI 에이전트 메모리를 위한 **오픈코어 컨트롤 플레인**입니다. 메모리, 검색, 리포지토리 그래프, 툴 트레이스 전반에 걸쳐 컨텍스트를 구성하고, 사용자 고유의 데이터셋으로 검색 품질을 평가하며, 민감한 콘텐츠에 대한 거버넌스 검토를 라우팅하고, 백엔드 간에 이동 가능한 이식 가능한 교환 형식으로 메모리를 내보냅니다.

또 다른 메모리 데이터베이스가 되려는 것이 아닙니다. 고유한 가치는 메모리 위에 있는 것입니다.

- **Context Query** — 단일 엔드포인트로 메모리 + 웹 + 리포 + 툴 트레이스를 구성하고, 출처가 포함된 등급별 컨텍스트 블록을 반환합니다.
- **Memory Eval** — 사용자가 소유한 데이터셋으로 Recall@K, Precision@K, MRR, stale-hit-rate, p95 지연 시간을 실행하고, 회귀 감지를 위해 실행을 지속하고 비교합니다.
- **Governance Review** — 6단계 라이프사이클(`candidate / active / flagged / redacted / superseded / deleted`), 리스크 태그 스캔, 포이즈닝 휴리스틱, 불변 감사 로그.
- **MIF형 이식성** — `provenance / validity / confidence / source_refs / supersedes / contradicts`를 보존하는 JSON + Markdown 내보내기/가져오기. 메모리 백엔드 간 마이그레이션 형식으로 사용 가능합니다.
- **Repo Graph** — 결정론적 리포지토리 인덱싱(파일, 심볼, 임포트, 콜, 라우트, 테스트)을 API 라우트와 읽기 전용 MCP 툴로 노출하여, 에이전트가 리포지토리 답변을 안정적인 프로젝트 컨텍스트 계약에 근거하도록 합니다.
- **Multi-Agent Adapter** — 버전 프로브 + 성능 저하 모드 폴백을 갖춘 `agentmemory` 퍼스트클래스 통합과 추가 런타임을 위한 깔끔한 어댑터 계약.

## 사용 시기

| Lore Context를 사용하는 경우... | 메모리 데이터베이스(agentmemory, Mem0, Supermemory)를 사용하는 경우... |
|---|---|
| 에이전트가 무엇을 기억했는지, 왜, 그리고 사용되었는지를 **증명**해야 할 때 | 단순 메모리 스토리지만 필요할 때 |
| 여러 에이전트(Claude Code, Cursor, Qwen, Hermes, Dify)를 운영하며 신뢰할 수 있는 공유 컨텍스트가 필요할 때 | 단일 에이전트를 구축 중이며 벤더 종속 메모리 계층으로 충분할 때 |
| 컴플라이언스를 위해 로컬 또는 프라이빗 배포가 필요할 때 | 호스팅된 SaaS를 선호할 때 |
| 벤더 벤치마크가 아닌 자체 데이터셋으로 평가가 필요할 때 | 벤더 벤치마크로 충분한 신호를 얻을 수 있을 때 |
| 시스템 간에 메모리를 마이그레이션하고 싶을 때 | 백엔드를 전환할 계획이 없을 때 |

## 퀵스타트

```bash
# 1. 클론 + 설치
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. 퀵스타트 헬퍼를 실행하고 활성화 보고서를 확인
pnpm quickstart -- --dry-run --activation-report

# 3. 실제 API 키 생성 (로컬 전용 개발 환경 이외에는 플레이스홀더를 사용하지 마세요)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. API 시작 (파일 백, Postgres 불필요)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. 메모리 쓰기
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. 컨텍스트 쿼리 후, 반환된 traceId를 Evidence Ledger에서 확인
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

공개 웹사이트 퀵스타트는 [lorecontext.com/quickstart](https://lorecontext.com/quickstart/)를 참조하세요. 전체 설정(Postgres, Docker Compose, Dashboard, MCP 통합)은 [docs/getting-started.md](../../getting-started.md)를 참조하세요.

정식 알파 퀵스타트는 `git clone` + `pnpm quickstart`입니다. Lore는 현재 공개 `@lore-context/quickstart` npm 패키지를 게시하거나 주장하지 않습니다. MCP stdio 서버는 레지스트리 및 클라이언트 배포용으로 별도로 [`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)로 게시되며, SDK 미들웨어는 [`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)(npm)와 `lore-context-middleware`(PyPI)로 제공됩니다.

AI 가독형 검색을 위해 웹사이트는 공개 문서만으로부터 `/llms.txt`와 `/llms-full.txt`를 게시합니다. 공식 MCP 레지스트리 항목이 게시되었으며, 추가 배포 초안은 [docs/distribution](../../distribution/)에, 런칭 초안은 [docs/launch](../../launch/)에, 디자인 파트너 접수는 [docs/design-partners](../../design-partners/)에 있습니다. 공개 벤치마크 페이지는 재현 가능한 방법론과 소규모 스모크 실행 보고서이며, 경쟁 벤치마크 우위 주장이 아닙니다.

## 아키텍처

```text
                       ┌───────────────────────────────────────────────┐
  MCP/REST clients ─► │ apps/api  (auth + rate limit + evidence)       │
  (Claude Code,       │   ├── Memory Inbox / lifecycle / audit         │
   Codex, Cursor,     │   ├── capture ingestion + recall hydration     │
   OpenCode...)       │   ├── context query (memory/web/repo/traces)   │
                       │   ├── repo graph query / symbol / impact       │
                       │   ├── Google sign-in + hosted MCP metadata     │
                       │   └── OpenAPI + usage + operator surfaces      │
                       └───────────────┬───────────────────────────────┘
                                       │
                         capture / embedding / graph jobs
                                       ▼
                       ┌───────────────────────────────────────────────┐
                       │ memory-worker  (AWS SQS + DLQ fan-out)        │
                       │   ├── auto redaction / curation / save        │
                       │   ├── dreaming butler (prune/merge/resolve)    │
                       │   ├── private Qwen3 embedding service         │
                       │   └── Qdrant dense+sparse indexing            │
                       └───────────────┬───────────────────────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
          RDS PostgreSQL 16      Qdrant derived index   apps/dashboard
          truth store + audit    lore_memories_v12      user-facing SaaS
```

자세한 내용은 [docs/architecture.md](../../architecture.md)를 참조하세요.

## v2.1.0의 내용

`v2.1.0`은 **Repo Graph API와 MCP 툴** 릴리스입니다. Lore 자체 리포지토리 그래프를 퍼스트클래스 에이전트 메모리 서피스로 만듭니다. 파일, 심볼, 임포트, 콜, 라우트, 테스트, 프로세스 힌트의 결정론적 TypeScript/JavaScript 리포지토리 인덱싱을 API 라우트와 읽기 전용 MCP 툴을 통해 노출하여, 에이전트가 리포지토리 답변을 임기응변식 텍스트 검색이 아닌 안정적인 프로젝트 컨텍스트 계약에 근거하도록 합니다.

v2.1.0은 AWS 프로덕션과 공개 웹사이트에 배포되었습니다. 하이브리드 메모리 엔진(RDS 진실 저장소, AWS SQS 워커 팬아웃, Qdrant 파생 인덱스, 프라이빗 Qwen3 임베딩 서비스, 7스트림 `HybridSearchOrchestrator`), 드리밍 버틀러 메모리 통합 워커, 에이전트 메모리 자기 개선 루프, 게시된 SDK 미들웨어 패키지, 그리고 v1.7~v2.0 라인에서 출시된 상용 SaaS 기반 위에 구축되었습니다.

| 기능 | 상태 | 위치 |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ 프로덕션 | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| 코드 지식 그래프 인덱서 | ✅ 프로덕션 | `packages/code-indexer`, `packages/code-indexer-python` |
| 메모리 + 웹 + 리포 + 툴 트레이스를 구성하는 Context Query | ✅ 프로덕션 | `apps/api`, `docs/api-reference.md` |
| 7스트림 `HybridSearchOrchestrator`(FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki) | ✅ 프로덕션 | `packages/search` |
| 크로스 인코더 리랭커(포스트 퓨전, 옵트인) | ✅ 프로덕션 | `apps/api/src/rerankers/` |
| 드리밍 버틀러 메모리 통합(prune / merge / resolve / surface) | ✅ 프로덕션, 플래그 게이트 | `apps/api/src/workers/butler-v18.ts` |
| 에이전트 메모리 자기 개선 루프 + 컨텍스트 레시피 | ✅ 프로덕션, 인간 게이트 승격 | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| SDK 미들웨어(OpenAI / Anthropic 클라이언트용 자동 인젝트 + 자동 리테인) | ✅ 게시됨 | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| AI 에이전트용 시크릿 볼트(MCP 네이티브, 3버튼 인증) | ✅ 베타, 암호화 감사 대기 중 | `apps/mcp-server`, `apps/api` |
| 클라우드 메모리 엔진: RDS 진실 저장소 + SQS 워커 팬아웃 + Qdrant 인덱스 | ✅ 프로덕션 | `apps/api`, `apps/api/src/worker.ts` |
| 프라이빗 Qwen3-Embedding-0.6B 1024차원 벡터 서비스 | ✅ 프로덕션 | `apps/api/src/embedding.ts` |
| 자동 캡처 수집 및 Memory Inbox 예외 | ✅ 프로덕션 | `apps/api`, `packages/capture` |
| Google 로그인 + 개인 볼트 부트스트랩 | ✅ 프로덕션 | `apps/api`, `apps/dashboard` |
| 상용 SaaS: 개인 구독, 청구, 쿼터 게이팅 | ✅ 프로덕션 | 호스팅 클라우드(`Lore-Context/lore-cloud`) |
| API 키 인증이 있는 REST API(reader/writer/admin) | ✅ 프로덕션 | `apps/api` |
| `/openapi.json`의 OpenAPI 3.1 계약(`2.1.0` 보고) | ✅ 프로덕션 | `apps/api/src/openapi.ts` |
| MCP stdio 서버(레거시 + 공식 SDK 트랜스포트) | ✅ 프로덕션 | `apps/mcp-server` |
| Google 세션 + 운영자 Basic Auth가 있는 Next.js 대시보드 | ✅ 프로덕션 | `apps/dashboard` |
| Evidence Ledger API + 대시보드 요약 | ✅ 프로덕션 | `apps/api`, `apps/dashboard` |
| 거버넌스 상태 머신 + 감사 로그 | ✅ 프로덕션 | `packages/governance` |
| Eval 러너(Recall@K / Precision@K / MRR / staleHit / p95) | ✅ 프로덕션 | `packages/eval` |
| `supersedes` + `contradicts`가 있는 MIF v0.2 가져오기/내보내기 | ✅ 프로덕션 | `packages/mif` |
| 모델 게이트웨이(멀티 프로바이더 task→model 라우팅) | ✅ 프로덕션 | `packages/model-gateway` |
| 버전 프로브 + 성능 저하 모드가 있는 `agentmemory` 어댑터 | ✅ 프로덕션 | `packages/agentmemory-adapter` |
| 속도 제한, 필드 리댁션이 있는 구조화된 JSON 로깅 | ✅ 프로덕션 | `apps/api` |
| Docker Compose 프라이빗 배포 | ✅ 프로덕션 | `docker-compose.yml` |
| `pnpm quickstart` 로컬 채택 헬퍼 + 활성화 보고서 | ✅ 프로덕션 | `scripts/lore-quickstart.mjs` |
| 공식 MCP 레지스트리 + 배포/런칭/디자인 파트너 문서 | ✅ 프로덕션 | `server.json`, `docs/distribution/`, `docs/launch/` |

전체 릴리스 이력은 [CHANGELOG.md](../../../CHANGELOG.md)를 참조하세요.

## 현재 릴리스 상태

`v2.1.0`은 현재 소스, 호스팅 프로덕션, 릴리스 라인입니다. 최적화된 릴리스 플로우(불변 arm64 우선 아티팩트, 스테이징 API 스모크, 프로덕션 API 배포, 독립적인 웹사이트 배포, 릴리스 후 감사, 태그/릴리스 클로저)를 통해 AWS 프로덕션과 공개 웹사이트에 배포되었습니다. 외부 확인에 의해 `https://api.lorecontext.com/health`가 `status=ok`를 반환하고, `/openapi.json`이 `2.1.0`을 보고하며, `https://lorecontext.com/status.html`에 `v2.1.0`이 포함되어 있음이 확인되었습니다.

프로덕션은 v1.1+의 RDS / SQS / memory-worker / Qdrant 클라우드 형상을 유지하고, Qdrant 컬렉션으로 `lore_memories_v12`를 사용하며, Postgres 경로에 1024차원 pgvector를 유지하고, 부가적인 리포지토리 그래프 스키마(`apps/api/src/db/schema-v21-repo-graph.sql`)를 추가합니다.

현재 공개 안전 상태 스냅샷은 [docs/release-status.md](../../release-status.md)를, 전체 릴리스 노트는 [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)를 참조하세요.

## 릴리스 초점

v2.1 릴리스는 Lore의 리포지토리 그래프를 퍼스트클래스 에이전트 메모리 서피스로 만듭니다. 목표는 에이전트가 임기응변식 텍스트 검색이 아닌 결정론적이고 안정적인 프로젝트 컨텍스트 계약에 대해 "X는 어디에 정의되어 있는가", "무엇이 이것을 호출하는가", "이것을 변경하면 무엇이 깨지는가"에 답할 수 있게 하는 것입니다.

- `@lore/repo-graph` — 파일, 심볼, 임포트, 콜, 라우트, 테스트, 프로세스 힌트의 결정론적 TypeScript/JavaScript 리포지토리 인덱싱.
- API 라우트: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`, `POST /v1/repo/impact`, `POST /v1/repo/detect-changes`.
- MCP 툴: `repo.graph_query`, `repo.symbol_context`, `repo.impact`, `repo.detect_changes`(읽기 전용).
- `context_query(repo)`는 사용 가능한 경우 프로바이더 지원 리포지토리 그래프 증거를 사용하고, 리포지토리 그래프 스토리지가 구성되지 않은 경우 정직한 사용 불가 폴백을 제공합니다.
- 리포지토리 그래프 Postgres 스키마는 부가적이며 기존 프로덕션 스키마 위에 위치하고 프로덕션/스테이징 스키마 설정 중에 적용됩니다.

루트 및 API 패키지 버전은 `2.1.0`을 보고하므로 `/openapi.json`이 릴리스 태그와 일치합니다. 릴리스 트레인은 v2.0.9 이후 도입된 최적화된 분할 API/웹사이트 배포 가드레일을 사용합니다.

[docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md), [docs/release-governance.md](../../release-governance.md)를 참조하세요.

## 통합

Lore Context는 MCP와 REST를 지원하며 대부분의 에이전트 IDE 및 채팅 프론트엔드와 통합됩니다.

| 도구 | 설정 가이드 |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](../../integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](../../integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](../../integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](../../integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](../../integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](../../integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](../../integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](../../integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](../../integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](../../integrations/openwebui.md) |
| 기타 / 범용 MCP | [docs/integrations/README.md](../../integrations/README.md) |

## 배포

| 모드 | 사용 시기 | 문서 |
|---|---|---|
| **로컬 파일 백** | 솔로 개발, 프로토타입, 스모크 테스트 | 이 README, 위의 퀵스타트 |
| **로컬 Postgres+pgvector** | 단일 노드 로컬 폴백 및 마이그레이션 테스트 | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose 프라이빗** | 셀프 호스팅 팀 배포, 격리된 네트워크 | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **호스팅 클라우드** | RDS / SQS / memory-worker / Qdrant / 프라이빗 임베딩 및 그래프 강화 하이브리드 리콜 스택과 상용 SaaS 기반 | [docs/release-status.md](../../release-status.md) |

모든 배포 경로는 명시적인 시크릿이 필요합니다. 로컬/프라이빗 경로는 `POSTGRES_PASSWORD`, `LORE_API_KEYS`, 대시보드 인증이 필요합니다. 호스팅 배포에는 추가로 RDS, SQS, Qdrant, 임베딩 서비스, OAuth, 터널 구성, 프로덕션 런타임 내보내기가 필요합니다. `scripts/check-env.mjs` 스크립트는 값이 플레이스홀더 패턴과 일치하는 경우 프로덕션 시작을 거부합니다.

## 보안

v2.1.0은 일반 사용자 접근을 위한 로컬/프라이빗 배포 자세와 호스팅 클라우드 가드레일을 유지합니다.

- **인증**: 역할 분리(`reader`/`writer`/`admin`)와 프로젝트 스코핑이 있는 API 키 베어러 토큰. 빈 키 모드는 프로덕션에서 페일 클로즈.
- **속도 제한**: 인증 실패 백오프가 있는 IP별 + 키별 이중 버킷(60초 내 5회 실패 후 429, 30초 잠금).
- **대시보드**: 호스팅 제품을 위한 Google 세션 흐름; 로컬/프라이빗 운영자 배포에는 HTTP Basic Auth도 사용 가능.
- **컨테이너**: 모든 Dockerfile이 비루트 `node` 사용자로 실행; api + dashboard에 HEALTHCHECK.
- **시크릿**: 하드코딩된 자격 증명 없음; 모든 기본값은 필수 또는 실패 변수. `scripts/check-env.mjs`는 프로덕션에서 플레이스홀더 값을 거부.
- **거버넌스**: 쓰기 시 PII / API 키 / JWT / 비밀 키 정규식 스캔; 위험 태그가 지정된 콘텐츠는 자동으로 검토 큐에 라우팅; 모든 상태 전환에서 불변 감사 로그.
- **메모리 포이즈닝**: 합의 + 명령형 동사 패턴에 대한 휴리스틱 감지.
- **MCP**: 모든 툴 입력에 zod 스키마 검증; 변경 툴은 `reason`(8자 이상) 요구 및 `destructiveHint: true` 표면화; 업스트림 오류는 클라이언트 반환 전 새니타이즈.
- **워커 격리**: 캡처, 임베딩, 그래프, 커넥터, 백필 작업은 DLQ가 있는 AWS SQS 큐를 통해 실행; Qdrant는 파생 인덱스이며 RDS가 권위적 저장소.
- **로깅**: `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key` 필드의 자동 리댁션이 있는 구조화된 JSON.

취약점 공개: [SECURITY.md](../../../SECURITY.md).

## 프로젝트 구조

```text
apps/
  api/                # REST 컨트롤 플레인 + Postgres + 거버넌스 + eval + 리포 그래프
  dashboard/          # Google 세션 + 운영자 Basic Auth가 있는 Next.js 대시보드
  mcp-server/         # MCP stdio 서버(레거시 + 공식 SDK 트랜스포트)
  cli/                # lore CLI(doctor, wiki-recompile, 데이터셋 가져오기/내보내기)
  browser-extension/  # 캡처 서피스 스캐폴드
  web/                # 서버 사이드 HTML 렌더러(no-JS 폴백 UI)
  website/            # 마케팅 사이트(별도 관리)
packages/
  shared/             # 공유 타입, 오류, ID/토큰 유틸리티
  agentmemory-adapter # 업스트림 agentmemory + 버전 프로브 브리지
  search/             # 7스트림 HybridSearchOrchestrator + 레시피 어댑터
  repo-graph/         # 결정론적 리포지토리 인덱싱(v2.1)
  code-indexer/       # 코드 지식 그래프 인덱서(TypeScript/JavaScript)
  code-indexer-python # 코드 지식 그래프 인덱서(Python)
  capture/            # 캡처 수집 프리미티브
  connectors/         # 외부 소스 커넥터
  model-gateway/      # 멀티 프로바이더 task→model 라우팅
  mif/                # Memory Interchange Format(v0.2)
  eval/               # EvalRunner + 메트릭 프리미티브 + 컨텍스트 레시피
  governance/         # 상태 머신 + 리스크 스캔 + 포이즈닝 + 감사
  profile/            # 볼트 / 계정 프로필 타입
  sdk-typescript/     # TypeScript 클라이언트 SDK
  sdk-python/         # Python 클라이언트 SDK
  sdk-go/ sdk-java/ sdk-dotnet/   # 추가 언어 SDK
  sdk-middleware-typescript/      # 자동 인젝트 + 자동 리테인 미들웨어(npm)
  sdk-middleware-python/          # 자동 인젝트 + 자동 리테인 미들웨어(PyPI)
docs/
  i18n/<lang>/        # 17개 언어의 현지화된 README
  integrations/       # 에이전트 IDE 통합 가이드
  deployment/         # 로컬, Docker Compose, 프로덕션 자동화 런북
  legal/              # 개인정보 보호정책 / 이용약관 / 쿠키(싱가포르 법)
scripts/
  check-env.mjs       # 프로덕션 모드 환경 검증
  smoke-*.mjs         # 엔드 투 엔드 스모크 테스트
  apply-postgres-schema.mjs
```

## 요구사항

- Node.js `>=22`
- pnpm `10.30.1`
- (선택적 로컬 폴백) pgvector가 있는 Postgres 16
- (호스팅/고급) RDS PostgreSQL 16, AWS SQS, Qdrant, 프라이빗 임베딩 서비스

## 기여

기여를 환영합니다. 개발 워크플로우, 커밋 메시지 프로토콜, 검토 기대치는 [CONTRIBUTING.md](../../../CONTRIBUTING.md)를 읽어주세요.

문서 번역은 [i18n 기여자 가이드](../README.md)를 참조하세요.

## 운영사

Lore Context는 **REDLAND PTE. LTD.**(싱가포르, UEN 202304648K)가 운영합니다. 회사 프로필, 법적 조건, 데이터 처리는 [`docs/legal/`](../../legal/)에 문서화되어 있습니다.

## 라이선스

Lore Context 리포지토리는 [Apache License 2.0](../../../LICENSE)에 따라 라이선스가 부여됩니다. `packages/*` 하위의 개별 패키지는 다운스트림 사용을 가능하게 하기 위해 MIT를 선언합니다. 업스트림 귀속은 [NOTICE](../../../NOTICE)를 참조하세요.

## 감사의 말

Lore Context는 로컬 메모리 런타임으로 [agentmemory](https://github.com/agentmemory/agentmemory) 위에 구축되었습니다. 업스트림 계약 세부 사항과 버전 호환성 정책은 [UPSTREAM.md](../../../UPSTREAM.md)에 문서화되어 있습니다.
