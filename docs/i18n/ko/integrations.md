> 🤖 이 문서는 영어 원본에서 기계 번역되었습니다. PR을 통한 개선을 환영합니다 — [번역 기여 가이드](../README.md) 참조.

# 통합 가이드

이 가이드는 현재 로컬 MVP에 대한 Lore Context 통합 계약을 문서화합니다.

## 현재 레포지토리 상태

- 레포지토리에는 이제 로컬 REST API, 컨텍스트 라우터/컴포저, 선택적 JSON 파일 영속성, 선택적 Postgres 런타임 저장소, 추적, 메모리 가져오기/내보내기, eval 공급자 비교, API 제공 대시보드 HTML, 독립 실행형 Next.js 대시보드 및 `agentmemory` 어댑터 경계가 포함됩니다.
- `apps/mcp-server/src/index.ts`는 `LORE_API_URL`을 통해 Lore REST API에 도구를 프록시하고 구성된 경우 `LORE_API_KEY`를 Bearer 토큰으로 전달하는 실행 가능한 stdio JSON-RPC MCP 런처를 제공합니다. 레거시 내장 stdio 루프와 `LORE_MCP_TRANSPORT=sdk`를 통한 공식 `@modelcontextprotocol/sdk` stdio 전송을 지원합니다.
- 아래 문서는 통합 계약입니다. API 우선 통합은 오늘 로컬 REST 서버를 사용할 수 있습니다. MCP 지원 클라이언트는 `pnpm build` 후 로컬 stdio 런처를 사용할 수 있습니다.

## 공유 설계

- MCP 지원 클라이언트는 원시 `agentmemory`가 아닌 소규모 Lore MCP 서버에 연결해야 합니다.
- API 우선 클라이언트는 Lore REST 엔드포인트를 호출해야 합니다. `POST /v1/context/query`가 주요 읽기 경로입니다.
- `POST /v1/context/query`는 클라이언트가 필요할 때 메모리/웹/레포지토리/도구 추적 라우팅을 강제하거나 비활성화할 수 있도록 `mode`, `sources`, `freshness`, `token_budget`, `writeback_policy` 및 `include_sources`를 허용합니다.
- Lore는 `packages/agentmemory-adapter`를 통해 로컬 `agentmemory` 런타임을 래핑합니다.
- 로컬 `agentmemory`는 `http://127.0.0.1:3111`에서 예상됩니다.

## 사용 가능한 MCP 표면

- `context_query`
- `memory_write`
- `memory_search`
- `memory_forget`
- `memory_list`
- `memory_get`
- `memory_update`
- `memory_supersede`
- `memory_export`
- `eval_run`
- `trace_get`

## 사용 가능한 REST 표면

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` (선택적 `project_id`, `scope`, `status`, `memory_type`, `q`, `limit`)
- `GET /v1/memory/:id`
- `PATCH /v1/memory/:id`
- `POST /v1/memory/:id/supersede`
- `GET /v1/memory/export`
- `POST /v1/memory/import`
- `GET /v1/governance/review-queue`
- `POST /v1/governance/memory/:id/approve`
- `POST /v1/governance/memory/:id/reject`
- `POST /v1/events/ingest`
- `POST /v1/eval/run`
- `GET /v1/eval/providers`
- `GET /v1/eval/runs`
- `GET /v1/eval/runs/:id`
- `GET /v1/traces`
- `GET /v1/traces/:id`
- `POST /v1/traces/:id/feedback`
- `GET /v1/audit-logs`

## 로컬 API 스모크

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

자동화된 스모크 경로:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## 로컬 MCP 스모크

MCP 런처는 stdin을 통해 줄바꿈으로 구분된 JSON-RPC를 읽고 stdout에 JSON-RPC 메시지만 씁니다:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

패키지 관리자 배너가 stdout을 오염시킬 수 있으므로 MCP 클라이언트에서 `pnpm start`를 통해 이것을 실행하지 마십시오.

## 프라이빗 배포 정렬

[docs/deployment/README.md](deployment.md)의 프라이빗 데모 패키징은 다음을 가정합니다:

- Lore API 및 대시보드는 장기 실행 컨테이너로 실행됩니다.
- Postgres는 공유 데모를 위한 기본 내구성 저장소입니다.
- MCP 런처는 클라이언트 가까이에 있는 stdio 프로세스로 유지되거나, 온디맨드로 선택적 `mcp` Compose 서비스로 실행됩니다.
- 데모 시드는 [examples/demo-dataset/import/lore-demo-memories.json](../../../../examples/demo-dataset/import/lore-demo-memories.json)에서 오고, eval 스모크는 [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../../examples/demo-dataset/eval/lore-demo-eval-request.json)에서 옵니다.

프라이빗 배포의 경우 클라이언트 런처를 프라이빗 API URL로 지정하고 맞는 최소 역할을 제공하십시오:

- `reader`: 대시보드 및 읽기 전용 코파일럿.
- `writer`: 메모리, 피드백 또는 eval 실행을 써야 하는 에이전트.
- `admin`: 가져오기, 내보내기, 거버넌스, 감사 및 삭제 흐름.

## 배포 인식 클라이언트 템플릿

### Claude Code

프라이빗 API를 대상으로 하는 워크스테이션 로컬 stdio 프로세스를 선호하십시오:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY="${WRITE_KEY:?set WRITE_KEY}" \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

`node .../dist/index.js` 대신 패키지된 MCP 컨테이너를 사용하는 경우 동일한 `LORE_API_URL` / `LORE_API_KEY` 쌍을 유지하고 `docker compose run --rm mcp`를 통해 stdio 런처를 실행하십시오.

### Cursor

Cursor 스타일 MCP JSON은 런처를 로컬로 유지하고 API 대상 및 키만 변경해야 합니다:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_READER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Cursor 워크플로가 의도적으로 내구성 있는 프로젝트 메모리를 쓰는 경우에만 `writer` 키를 사용하십시오.

### Qwen Code

Qwen 스타일 `mcpServers` JSON은 동일한 경계를 따릅니다:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_WRITER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

검색 전용 검색 어시스턴트에는 `reader`를 사용하고, `memory_write`, `memory_update` 또는 추적 피드백 도구가 필요한 에이전트 흐름에는 `writer`를 사용하십시오.

## 안전한 기본값

- MCP에는 로컬에서 `stdio`를 선호하십시오. 원격 전송이 필요한 경우에만 인증된 스트리밍 가능 HTTP를 사용하십시오.
- SSE는 기본 경로가 아닌 레거시 호환성으로 취급하십시오.
- `includeTools` 또는 클라이언트 동등 항목으로 도구를 허용 목록에 추가하십시오.
- 기본적으로 광범위한 신뢰 모드를 활성화하지 마십시오.
- 변경 작업에서 `reason`을 요구하십시오.
- 관리자가 제어된 제거를 위해 의도적으로 `hard_delete: true`를 설정하지 않는 한 `memory_forget`을 소프트 삭제로 유지하십시오.
- 공유 로컬 또는 원격 API 노출을 위해 `LORE_API_KEYS` 역할 분리를 사용하십시오: 읽기 전용 클라이언트에는 `reader`, 에이전트 쓰기에는 `writer`, 동기화/가져오기/내보내기/삭제/거버넌스/감사 작업에만 `admin`. 클라이언트 키의 볼 수 있거나 변경할 수 있는 프로젝트로 범위를 좁히기 위해 `projectIds`를 추가하십시오.
- `agentmemory`를 `127.0.0.1`에 바인딩하십시오.
- 원시 `agentmemory` 뷰어 또는 콘솔을 공개적으로 노출하지 마십시오.
- 현재 라이브 `agentmemory` 0.9.3 계약: `remember`, `export`, `audit` 및 `forget(memoryId)`은 Lore 동기화/계약 테스트에 사용 가능합니다. `smart-search`는 관찰을 검색하며 새로 기억된 메모리 레코드가 직접 검색 가능하다는 증거로 취급해서는 안 됩니다.
