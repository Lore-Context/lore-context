> 🤖 이 문서는 영어 원본에서 기계 번역되었습니다. PR을 통한 개선을 환영합니다 — [번역 기여 가이드](../README.md) 참조.

# 변경 이력

Lore Context의 모든 주목할 만한 변경 사항이 여기에 문서화됩니다. 형식은 [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)을 기반으로 하며, 이 프로젝트는 [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)을 준수합니다.

## [v0.4.0-alpha] — 2026-04-28

첫 번째 공개 알파. 감사 실패 MVP를 릴리스 후보 알파로 전환한 프로덕션 강화 스프린트를 종료합니다. 모든 P0 감사 항목 완료, P1 항목 13개 중 12개 완료(1개 부분 완료 — 비고 참조), 117개 이상의 테스트 통과, 전체 모노레포 빌드 클린.

### 추가됨

- **`packages/eval/src/runner.ts`** — 실제 `EvalRunner`(`runEval` / `persistRun` / `loadRuns` / `diffRuns`). Eval은 이제 사용자 소유 데이터셋에 대해 엔드 투 엔드 검색 평가를 실행하고 교차 시간 회귀 탐지를 위해 JSON으로 실행 결과를 저장할 수 있습니다.
- **`packages/governance/src/state.ts`** — 명시적 법적 전환 테이블이 있는 6단계 거버넌스 상태 머신(`candidate / active / flagged / redacted / superseded / deleted`). 불법적인 전환은 예외를 발생시킵니다.
- **`packages/governance/src/audit.ts`** — `@lore/shared` `AuditLog` 타입과 통합된 변경 불가 감사 로그 추가 헬퍼.
- **`packages/governance/detectPoisoning`** — 동일 소스 지배(>80%) 및 명령형 동사 패턴 매칭을 사용한 메모리 포이즈닝 탐지 휴리스틱.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — 수동 작성 비교(새 의존성 없음)를 사용한 semver 기반 업스트림 버전 프로브. 무음 스킵 저하 모드를 위해 `LORE_AGENTMEMORY_REQUIRED=0`을 존중합니다.
- **`packages/mif`** — `LoreMemoryItem`에 `supersedes: string[]` 및 `contradicts: string[]` 필드 추가. JSON 및 Markdown 형식 전반에 걸쳐 라운드트립이 보존됩니다.
- **`apps/api/src/logger.ts`** — 민감 필드(`content` / `query` / `memory` / `value` / `password` / `secret` / `token` / `key`) 자동 수정이 있는 구조화된 JSON 로거. `requestId`가 모든 요청을 통해 흐릅니다.
- **`apps/dashboard/middleware.ts`** — HTTP Basic Auth 미들웨어. 프로덕션 시작은 `DASHBOARD_BASIC_AUTH_USER` 및 `DASHBOARD_BASIC_AUTH_PASS` 없이는 시작을 거부합니다.
- **`scripts/check-env.mjs`** — 프로덕션 모드 환경 변수 유효성 검사기. 환경 변수 값이 플레이스홀더 패턴(`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`)과 일치하면 앱 시작을 거부합니다.
- **속도 제한** — 인증 실패 백오프가 있는 IP별 및 키별 이중 버킷 토큰 리미터(60초 내 5회 실패 → 30초 잠금 → 429 응답). `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED`를 통해 구성 가능합니다.
- **정상 종료** — SIGTERM/SIGINT 핸들러가 10초까지 진행 중인 요청을 드레인하고, 대기 중인 Postgres 쓰기를 플러시하며, 풀을 닫고, 15초에 강제 종료합니다.
- **데이터베이스 인덱스** — `memory_records`, `context_traces`, `audit_logs`, `event_log`, `eval_runs`에 대한 `(project_id)` / `(status)` / `(created_at)` B-tree 인덱스. jsonb `content` 및 `metadata`에 대한 GIN 인덱스.
- **MCP zod 입력 유효성 검사** — 모든 MCP 도구는 이제 도구별 zod 스키마에 대해 `safeParse`를 실행합니다. 실패 시 무해화된 이슈와 함께 JSON-RPC `-32602`를 반환합니다.
- **MCP `destructiveHint` + 필수 `reason`** — 모든 변경 도구(`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`)는 8자 이상의 `reason`이 필요하며 `destructiveHint: true`를 표시합니다.
- `apps/api`, `apps/mcp-server`, `packages/eval`, `packages/governance`, `packages/mif`, `packages/agentmemory-adapter` 전반에 걸쳐 117개 이상의 새 테스트 케이스.
- 다국어 문서: `docs/i18n/<lang>/` 아래 17개 언어 README.
- `CHANGELOG.md`(이 파일).
- `docs/getting-started.md` — 5분 개발자 빠른 시작.
- `docs/api-reference.md` — REST API 엔드포인트 참조.
- `docs/i18n/README.md` — 번역 기여자 가이드.

### 변경됨

- **`packages/mif`** 봉투 버전 `"0.1"` → `"0.2"`. 하위 호환 가져오기.
- **`LORE_POSTGRES_AUTO_SCHEMA`** 기본값 `true` → `false`. 프로덕션 배포는 스키마 자동 적용을 명시적으로 선택하거나 `pnpm db:schema`를 실행해야 합니다.
- **`apps/api`** 요청 본문 파서는 이제 하드 페이로드 크기 제한(`LORE_MAX_JSON_BYTES`, 기본값 1 MiB)이 있는 스트리밍입니다. 초과 요청은 413을 반환합니다.
- **루프백 인증** 변경: URL `Host` 헤더에 대한 의존성 제거. 루프백 탐지는 이제 `req.socket.remoteAddress`만 사용합니다. API 키가 구성되지 않은 프로덕션에서 API는 실패 폐쇄 방식으로 요청을 거부합니다(이전: 자동으로 관리자 권한 부여).
- **범위 지정 API 키**는 이제 `/v1/memory/list`, `/v1/eval/run`, `/v1/memory/import`에 `project_id`를 제공해야 합니다(이전: 정의되지 않은 `project_id`가 단락).
- **모든 Dockerfile**은 이제 비루트 `node` 사용자로 실행됩니다. `apps/api/Dockerfile` 및 `apps/dashboard/Dockerfile`은 `HEALTHCHECK`를 선언합니다.
- **`docker-compose.yml`** `POSTGRES_PASSWORD`는 이제 `${POSTGRES_PASSWORD:?must be set}`를 사용합니다 — 명시적 비밀번호 없이 시작 시 빠른 실패.
- **`docs/deployment/compose.private-demo.yml`** — 동일한 필수-또는-실패 패턴.
- **`.env.example`** — 모든 데모 기본값이 제거되고 `# REQUIRED` 플레이스홀더로 대체됨. 속도 제한, 요청 시간 초과, 페이로드 제한, agentmemory 필수 모드, 대시보드 Basic Auth를 위한 새 변수 문서화.

### 수정됨

- **루프백 우회 인증 취약점** (P0). 공격자가 루프백 탐지를 스푸핑하기 위해 `Host: 127.0.0.1`을 보내 API 키 없이 관리자 역할을 획득할 수 있었습니다.
- **대시보드 프록시의 confused-deputy** (P0). 대시보드 프록시가 인증되지 않은 요청에 `LORE_API_KEY`를 주입하여 포트 3001에 도달할 수 있는 모든 사람에게 관리자 권한을 부여했습니다.
- **무차별 대입 방어** (P0). README/`.env.example`에 표시된 데모 키(`admin-local`, `read-local`, `write-local`)를 무한정 열거할 수 있었습니다. 속도 제한 및 기본값 제거로 이제 방어합니다.
- **잘못된 형식의 `LORE_API_KEYS`에서 JSON 파싱 충돌** — 프로세스는 이제 스택 추적을 던지는 대신 명확한 오류와 함께 종료됩니다.
- **대용량 요청 본문으로 인한 OOM** — 구성된 제한 이상의 본문은 이제 Node 프로세스를 충돌시키는 대신 413을 반환합니다.
- **MCP 오류 누출** — 원시 SQL, 파일 경로 또는 스택 추적을 포함한 업스트림 API 오류는 MCP 클라이언트에 도달하기 전에 `{code, generic-message}`로 무해화됩니다.
- **대시보드 JSON 파싱 충돌** — 잘못된 JSON 응답이 더 이상 UI를 충돌시키지 않습니다. 오류는 사용자가 볼 수 있는 상태로 표시됩니다.
- **MCP `memory_update` / `memory_supersede`** 이전에는 `reason`이 필요하지 않았습니다. 이제 zod 스키마로 적용됩니다.
- **Postgres 풀**: `statement_timeout`이 이제 15초로 설정됨. 이전에는 잘못된 형식의 jsonb 쿼리에서 무한 쿼리 시간 위험이 있었습니다.

### 보안

- 모든 P0 감사 결과(루프백 우회 / 대시보드 인증 / 속도 제한 / 데모 시크릿) 완료. 전체 감사 추적은 `Lore_Context_项目计划书_2026-04-27.md` 및 `.omc/plans/lore-prelaunch-fixes-2026-04-28.md`를 참조하십시오.
- `pnpm audit --prod`는 릴리스 시 알려진 취약점 제로를 보고합니다.
- 모든 배포 템플릿 및 예제 README에서 데모 자격증명 제거.
- 컨테이너 이미지는 이제 기본적으로 비루트로 실행됩니다.

### 비고 / 알려진 제한 사항

- **부분 P1-1**: `/v1/context/query`는 기존 소비자 테스트가 중단되는 것을 방지하기 위해 허용적인 범위 지정 키 동작을 유지합니다. 다른 영향받는 경로(`/v1/memory/list`, `/v1/eval/run`, `/v1/memory/import`)는 `project_id`를 적용합니다. v0.5에서 추적됩니다.
- **호스팅 멀티테넌트 클라우드 동기화**는 v0.4.0-alpha에서 구현되지 않습니다. 로컬 및 Compose 프라이빗 배포만 가능합니다.
- **번역 품질**: README 현지화는 LLM이 생성하며 명확하게 표시됩니다. 각 로케일을 개선하기 위한 커뮤니티 PR을 환영합니다([`docs/i18n/README.md`](../README.md) 참조).
- **OpenAPI / Swagger 스펙**은 아직 패키지화되지 않았습니다. REST 표면은 [`docs/api-reference.md`](api-reference.md)에 산문 형식으로 문서화되어 있습니다. v0.5에서 추적됩니다.

### 감사의 말

이 릴리스는 구조화된 감사 계획에 대한 병렬 서브 에이전트 실행을 포함한 단일 날짜 프로덕션 강화 스프린트의 결과입니다. 계획 및 감사 아티팩트는 `.omc/plans/` 아래에 보존됩니다.

## [v0.0.0] — 사전 릴리스

내부 개발 마일스톤, 공개적으로 릴리스되지 않음. 구현됨:

- 워크스페이스 패키지 스캐폴드(TypeScript 모노레포, pnpm 워크스페이스).
- 공유 TypeScript 빌드/테스트 파이프라인.
- `@lore/shared`의 메모리 / 컨텍스트 / eval / 감사 타입 시스템.
- `agentmemory` 어댑터 경계.
- 컨텍스트 라우터 및 컴포저가 있는 로컬 REST API.
- JSON 파일 영속성 + 증분 업서트가 있는 선택적 Postgres 런타임 저장소.
- 명시적 하드 삭제가 있는 메모리 상세 / 편집 / 교체 / 삭제 플로우.
- 실제 메모리 사용 회계(`useCount`, `lastUsedAt`).
- 추적 피드백(`useful` / `wrong` / `outdated` / `sensitive`).
- 거버넌스 필드가 있는 MIF 유사 JSON + Markdown 가져오기/내보내기.
- 시크릿 스캐닝 정규식 세트.
- 직접 세션 기반 eval 메트릭. 공급자 비교 eval 실행. eval 실행 목록.
- reader/writer/admin 역할 분리가 있는 API 키 보호.
- 거버넌스 검토 큐. 감사 로그 API.
- API 제공 대시보드 HTML. 독립 실행형 Next.js 대시보드.
- 데모 시드 데이터. 통합 구성 생성.
- 프라이빗 Docker/Compose 패키징.
- 레거시 + 공식 SDK stdio MCP 전송.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
