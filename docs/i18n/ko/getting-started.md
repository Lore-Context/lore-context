> 🤖 이 문서는 영어 원본에서 기계 번역되었습니다. PR을 통한 개선을 환영합니다 — [번역 기여 가이드](../README.md) 참조.

# 시작하기

이 가이드는 메모리가 작성되고, 컨텍스트가 조회되고, 대시보드에 접근할 수 있는 Lore Context 인스턴스가 실행될 때까지의 과정을 안내합니다. 전체 약 15분, 핵심 경로는 약 5분을 계획하십시오.

## 사전 요구 사항

- **Node.js** `>=22` (`nvm`, `mise` 또는 배포판 패키지 관리자 사용)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (선택 사항) Postgres+pgvector 경로를 위한 **Docker + Docker Compose**
- (선택 사항) 스키마를 직접 적용하려는 경우 **psql**

## 1. 클론 및 설치

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

`pnpm test`가 초록색이 아니면 계속하지 마십시오 — 실패 로그와 함께 이슈를 열어 주십시오.

## 2. 실제 시크릿 생성

Lore Context는 플레이스홀더 값으로는 프로덕션에서 시작을 거부합니다. 습관을 일관되게 유지하기 위해 로컬 개발에서도 실제 키를 생성하십시오.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

멀티 역할 로컬 설정의 경우:

```bash
export READER_KEY=$(openssl rand -hex 32)
export WRITER_KEY=$(openssl rand -hex 32)
export ADMIN_KEY=$(openssl rand -hex 32)
export LORE_API_KEYS='[
  {"key":"'"$READER_KEY"'","role":"reader","projectIds":["demo"]},
  {"key":"'"$WRITER_KEY"'","role":"writer","projectIds":["demo"]},
  {"key":"'"$ADMIN_KEY"'","role":"admin"}
]'
```

## 3. API 시작 (파일 기반, 데이터베이스 불필요)

가장 간단한 경로는 로컬 JSON 파일을 스토리지 백엔드로 사용합니다. 솔로 개발 및 스모크 테스트에 적합합니다.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

다른 셸에서 헬스를 확인하십시오:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

예상: `{"status":"ok",...}`.

## 4. 첫 번째 메모리 쓰기

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{
    "content": "Use Postgres pgvector for Lore Context production storage.",
    "memory_type": "project_rule",
    "project_id": "demo",
    "scope": "project"
  }' | jq
```

예상: 새 메모리의 `id`와 `active` 또는 `candidate`인 `governance.state`가 있는 `200` 응답(콘텐츠가 시크릿과 같은 위험 패턴과 일치하는 경우 후자).

## 5. 컨텍스트 구성

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{
    "query": "production storage",
    "project_id": "demo",
    "token_budget": 1200
  }' | jq
```

`evidence.memory` 배열에 메모리가 인용되고, 나중에 라우팅 및 피드백을 검사하는 데 사용할 수 있는 `traceId`가 표시되어야 합니다.

## 6. 대시보드 시작

새 터미널에서:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

브라우저에서 http://127.0.0.1:3001 을 여십시오. 브라우저가 Basic Auth 자격증명을 요청합니다. 인증되면 대시보드에 메모리 인벤토리, 추적, eval 결과 및 거버넌스 검토 큐가 렌더링됩니다.

## 7. (선택 사항) MCP를 통해 Claude Code 연결

Claude Code의 `claude_desktop_config.json` MCP 서버 섹션에 다음을 추가하십시오:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<paste your $LORE_API_KEY here>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Claude Code를 다시 시작하십시오. Lore Context MCP 도구(`context_query`, `memory_write` 등)를 사용할 수 있게 됩니다.

다른 에이전트 IDE(Cursor, Qwen, Dify, FastGPT 등)는 [docs/integrations/README.md](integrations.md)의 통합 매트릭스를 참조하십시오.

## 8. (선택 사항) Postgres + pgvector로 전환

JSON 파일 스토리지가 부족해졌을 때:

```bash
docker compose up -d postgres
pnpm db:schema   # psql을 통해 apps/api/src/db/schema.sql 적용
```

그런 다음 `LORE_STORE_DRIVER=postgres`로 API를 시작하십시오:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

`pnpm smoke:postgres`를 실행하여 쓰기-재시작-읽기 라운드트립이 살아남는지 확인하십시오.

## 9. (선택 사항) 데모 데이터셋 시드 및 eval 실행

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

eval 보고서는 `output/eval-reports/`에 Markdown 및 JSON으로 저장됩니다.

## 다음 단계

- **프로덕션 배포** — [docs/deployment/README.md](deployment.md)
- **API 참조** — [docs/api-reference.md](api-reference.md)
- **아키텍처 심층 분석** — [docs/architecture.md](architecture.md)
- **거버넌스 검토 워크플로** — [docs/architecture.md](architecture.md)의 `거버넌스 흐름` 섹션 참조
- **메모리 이식성(MIF)** — `pnpm --filter @lore/mif test`로 라운드트립 예시 확인
- **기여** — [CONTRIBUTING.md](CONTRIBUTING.md)

## 일반적인 함정

| 증상 | 원인 | 해결 방법 |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | 다른 프로세스가 포트 3000 사용 중 | `lsof -i :3000`으로 찾기. 또는 `PORT=3010` 설정 |
| `503 Dashboard Basic Auth not configured` | `DASHBOARD_BASIC_AUTH_USER/PASS` 없는 프로덕션 모드 | 환경 변수를 내보내거나 `LORE_DASHBOARD_DISABLE_AUTH=1` 전달(개발 전용) |
| `[check-env] ERROR: ... contain placeholder/demo values` | 임의 환경 변수가 `admin-local` / `change-me` / `demo` 등과 일치 | `openssl rand -hex 32`를 통해 실제 값 생성 |
| `429 Too Many Requests` | 속도 제한 트리거됨 | 쿨오프 창 대기(기본값 5회 인증 실패 후 30초). 또는 개발에서 `LORE_RATE_LIMIT_DISABLED=1` 설정 |
| `agentmemory adapter unhealthy` | 로컬 agentmemory 런타임이 실행되지 않음 | agentmemory를 시작하거나 무음 스킵을 위해 `LORE_AGENTMEMORY_REQUIRED=0` 설정 |
| MCP 클라이언트에 `-32602 Invalid params` | 도구 입력이 zod 스키마 유효성 검사 실패 | 오류 본문의 `invalid_params` 배열 확인 |
| 모든 페이지에서 대시보드 401 | 잘못된 Basic Auth 자격증명 | 환경 변수를 다시 내보내고 대시보드 프로세스 재시작 |

## 도움 받기

- 버그 제출: https://github.com/Lore-Context/lore-context/issues
- 보안 공개: [SECURITY.md](SECURITY.md) 참조
- 문서 기여: [CONTRIBUTING.md](CONTRIBUTING.md) 참조
