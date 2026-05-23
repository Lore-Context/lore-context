> 🤖 이 문서는 영어 원본에서 기계 번역되었습니다. PR을 통한 개선을 환영합니다 — [번역 기여 가이드](../README.md) 참조.

# 보안 정책

Lore Context는 메모리, 추적, 감사 로그 및 통합 자격증명을 처리합니다. 보안 보고를 높은 우선순위로 취급하십시오.

## 취약점 보고

의심되는 취약점, 유출된 시크릿, 인증 우회, 데이터 노출, 또는 테넌트 격리 문제에 대해 공개 이슈를 열지 마십시오.

선호하는 보고 경로:

1. 사용 가능한 경우 이 레포지토리에 대해 **GitHub 비공개 취약점 보고**를 사용하십시오.
2. 비공개 보고가 불가능한 경우 유지 관리자에게 비공개로 연락하여 다음을 포함하십시오:
   - 영향받는 버전 또는 커밋,
   - 재현 단계,
   - 예상 영향,
   - 실제 시크릿 또는 개인 데이터가 관련되어 있는지 여부.

신뢰할 수 있는 보고에 대해 72시간 내에 확인을 목표로 합니다.

## 지원되는 버전

Lore Context는 현재 1.0 이전 알파 소프트웨어입니다. 보안 수정은 먼저 `main` 브랜치를 대상으로 합니다. 태그된 릴리스는 공개 릴리스가 다운스트림 운영자에 의해 활발하게 사용될 때 타겟 패치를 받을 수 있습니다.

| 버전 | 지원 여부 |
|---|---|
| v0.4.x-alpha | ✅ 활성 |
| v0.3.x 및 이전 | ❌ 사전 릴리스 내부 전용 |

## 내장 강화 (v0.4.0-alpha)

알파는 다음과 같은 심층 방어 제어를 포함하여 출시됩니다. 운영자는 배포에서 이것이 활성화되어 있는지 확인해야 합니다.

### 인증

- **API 키 Bearer 토큰** (`Authorization: Bearer <key>` 또는 `x-lore-api-key` 헤더).
- **역할 분리**: `reader` / `writer` / `admin`.
- **프로젝트별 범위**: `LORE_API_KEYS` JSON 항목에 `projectIds: ["..."]` 허용 목록을 포함할 수 있습니다. 변경 작업은 일치하는 `project_id`가 필요합니다.
- **빈 키 모드는 프로덕션에서 실패 폐쇄**: `NODE_ENV=production`이고 키가 구성되지 않은 경우 API는 모든 요청을 거부합니다.
- **루프백 우회 제거됨**: 이전 버전은 `Host: 127.0.0.1`을 신뢰했습니다. v0.4는 소켓 레벨 원격 주소만 사용합니다.

### 속도 제한

- **IP별 및 키별 이중 버킷 리미터**, 인증 실패 백오프 포함.
- **기본값**: 비인증 경로에 대해 IP당 60 req/min, 인증된 키당 600 req/min.
- **60초 내 5회 인증 실패 → 30초 잠금** (429 반환).
- 구성 가능: `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED=1` (개발 전용).

### 대시보드 보호

- **HTTP Basic Auth 미들웨어** (`apps/dashboard/middleware.ts`).
- **프로덕션 시작은 거부됨** `DASHBOARD_BASIC_AUTH_USER` 및 `DASHBOARD_BASIC_AUTH_PASS` 없이.
- `LORE_DASHBOARD_DISABLE_AUTH=1`은 프로덕션 외부에서만 허용됩니다.
- 서버 사이드 관리자 키 폴백 **제거됨**: 대시보드 프록시가 업스트림 API 자격증명을 주입하기 전에 사용자는 Basic Auth를 통해 인증되어야 합니다.

### 컨테이너 강화

- 모든 Dockerfile은 비루트 `node` 사용자로 실행됩니다.
- `apps/api/Dockerfile` 및 `apps/dashboard/Dockerfile`은 `/health`에 대한 `HEALTHCHECK`를 선언합니다.
- `apps/mcp-server`는 stdio 전용입니다 — 네트워크 리스너 없음 — `HEALTHCHECK`를 선언하지 않습니다.

### 시크릿 관리

- **하드코딩된 자격증명 제로.** 모든 `docker-compose.yml`, `docs/deployment/compose.private-demo.yml` 및 `.env.example` 기본값은 `${VAR:?must be set}` 형식을 사용합니다 — 명시적 값 없이 시작 시 빠른 실패.
- `scripts/check-env.mjs`는 `NODE_ENV=production`일 때 플레이스홀더 값(`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`)을 거부합니다.
- 모든 배포 문서 및 예제 README에서 리터럴 데모 자격증명이 제거되었습니다.

### 거버넌스

- **모든 메모리 쓰기에서 위험 태그 스캐닝**: API 키, AWS 키, JWT 토큰, 개인 키, 비밀번호, 이메일, 전화번호 탐지.
- **명시적 법적 전환 테이블이 있는 6단계 상태 머신**. 불법적인 전환은 예외를 발생시킵니다.
- **메모리 포이즈닝 휴리스틱**: 동일 소스 지배 + 명령형 동사 패턴 매칭 → `suspicious` 플래그.
- **변경 불가 감사 로그**는 모든 상태 전환에 추가됩니다.
- 고위험 콘텐츠는 `candidate` / `flagged`로 자동 라우팅되어 검토될 때까지 컨텍스트 구성에서 제외됩니다.

### MCP 강화

- 모든 MCP 도구 입력은 호출 전에 **zod 스키마에 대해 유효성 검사됩니다**. 유효성 검사 실패 시 무해화된 이슈 목록과 함께 JSON-RPC `-32602`를 반환합니다.
- **모든 변경 도구**는 8자 이상의 `reason` 문자열이 필요하며 스키마에서 `destructiveHint: true`를 표시합니다.
- 업스트림 API 오류는 MCP 클라이언트에 반환되기 전에 **무해화됩니다** — 원시 SQL, 파일 경로 및 스택 추적이 제거됩니다.

### 로깅

- **구조화된 JSON 출력**, 핸들러 체인 전반에 걸친 `requestId` 상관관계.
- `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`와 일치하는 필드의 **자동 수정**. 메모리 레코드 및 쿼리의 실제 콘텐츠는 로그에 절대 기록되지 않습니다.

### 데이터 경계

- `agentmemory` 어댑터는 초기화 시 업스트림 버전을 프로브하고 비호환성에 대해 경고합니다. `LORE_AGENTMEMORY_REQUIRED=0`은 업스트림에 접근할 수 없는 경우 어댑터를 무음 저하 모드로 전환합니다.
- `apps/api` 요청 본문 파서는 `LORE_MAX_JSON_BYTES` 제한(기본값 1 MiB)을 적용합니다. 초과 요청은 413을 반환합니다.
- Postgres 연결 풀은 쿼리 시간을 제한하기 위해 `statement_timeout: 15000`을 설정합니다.
- `LORE_REQUEST_TIMEOUT_MS`(기본값 30초)는 모든 요청 핸들러를 제한합니다. 시간 초과 시 504를 반환합니다.

## 배포 가이드

- 구성된 `LORE_API_KEYS` 없이 Lore를 원격으로 노출하지 마십시오.
- `reader` / `writer` / `admin` **역할 분리** 키를 선호하십시오.
- 프로덕션에서 `DASHBOARD_BASIC_AUTH_USER` 및 `DASHBOARD_BASIC_AUTH_PASS`를 **항상 설정**하십시오.
- **`openssl rand -hex 32`로 키를 생성하십시오**. 예제에 표시된 플레이스홀더 값을 절대 사용하지 마십시오.
- 원시 `agentmemory` 엔드포인트를 비공개로 유지하고 Lore를 통해서만 접근하십시오.
- 루프백 이외의 노출에 대해서는 네트워크 액세스 제어 계층(Cloudflare Access, AWS ALB, Tailscale ACL 등) 뒤에 대시보드, 거버넌스, 가져오기/내보내기, 동기화 및 감사 경로를 유지하십시오.
- **프로덕션에서 API를 시작하기 전에 `node scripts/check-env.mjs`를 실행하십시오.**
- 프로덕션 `.env` 파일, 공급자 API 키, 클라우드 자격증명, 고객 콘텐츠가 포함된 eval 데이터 또는 개인 메모리 내보내기를 **절대 커밋하지 마십시오**.

## 공개 타임라인

확인된 고영향 취약점의 경우:

- 0일: 보고 확인.
- 7일: 분류 및 심각도 분류가 보고자와 공유됨.
- 30일: 협조적 공개 공개(또는 상호 합의로 연장).
- 30일 이상: 해당되는 경우 중간 이상 심각도에 대한 CVE 발행.

낮은 심각도 문제의 경우 다음 마이너 릴리스 내에서 해결을 기대하십시오.

## 강화 로드맵

후속 릴리스에 계획된 항목:

- **v0.5**: OpenAPI / Swagger 스펙. `pnpm audit --high`, CodeQL 정적 분석 및 dependabot의 CI 통합.
- **v0.6**: Sigstore 서명 컨테이너 이미지, SLSA 출처, 장기 토큰 대신 GitHub OIDC를 통한 npm 게시.
- **Future hosted hardening**: KMS 봉투 암호화를 통한 `risk_tags` 플래그된 메모리 콘텐츠의 저장 시 암호화.
