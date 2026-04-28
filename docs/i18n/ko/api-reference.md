> 🤖 이 문서는 영어 원본에서 기계 번역되었습니다. PR을 통한 개선을 환영합니다 — [번역 기여 가이드](../README.md) 참조.

# API 참조

Lore Context는 `/v1/*` 아래에 REST API와 stdio MCP 서버를 노출합니다. 이 문서는 REST 표면을 다룹니다. MCP 도구 이름은 끝부분에 나열됩니다.

모든 예시는 다음을 가정합니다:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## 규칙

- 모든 엔드포인트는 JSON을 수락하고 반환합니다.
- 인증: `Authorization: Bearer <key>` 헤더(또는 `x-lore-api-key`). `/health`만 인증되지 않은 경로입니다.
- 역할: `reader < writer < admin`. 각 엔드포인트에 최소 역할이 나열됩니다.
- 오류: `{ "error": { "code": string, "message": string, "status": number, "requestId": string } }`.
- 속도 제한: 모든 응답에 `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` 헤더. `429 Too Many Requests`에는 `Retry-After` 헤더가 포함됩니다.
- 모든 변경은 감사 로그에 기록됩니다. 관리자 전용 접근은 `/v1/governance/audit-log`를 통해.

## 헬스 및 준비 상태

### `GET /health`
- **인증**: 없음
- **응답 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number, "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## 컨텍스트

### `POST /v1/context/query`
메모리 + 웹 + 레포지토리 + 도구 추적에서 컨텍스트를 구성합니다.

- **인증**: reader+
- **본문**: `{ "query": string, "project_id"?: string, "token_budget"?: number, "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **응답 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...], "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number, "tokens_used": number, "latency_ms": number, "traceId": string }`

## 메모리

### `POST /v1/memory/write`
- **인증**: writer+ (프로젝트 범위 writer는 일치하는 `project_id`를 포함해야 함)
- **본문**: `{ "content": string, "memory_type": string, "project_id": string, "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number, "source_refs"?: string[], "metadata"?: object }`
- **응답 200**: `{ "id": string, "governance": { "state": GovState, "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **인증**: reader+
- **응답 200**: 거버넌스 상태를 포함한 전체 메모리 레코드.

### `POST /v1/memory/:id/update`
메모리를 인플레이스 패치합니다(소소한 수정만).
- **인증**: writer+
- **본문**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
이전 메모리를 대체하는 새 메모리를 생성합니다.
- **인증**: writer+
- **본문**: `{ "content": string, "reason": string }`
- **응답 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
기본적으로 소프트 삭제. 관리자는 하드 삭제 가능.
- **인증**: writer+(소프트) / admin(하드)
- **본문**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
구성 없이 직접 검색합니다.
- **인증**: reader+
- **본문**: `{ "query": string, "project_id"?: string, "limit"?: number, "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **인증**: reader+
- **쿼리**: `project_id`(범위 지정 키의 경우 필수), `state`, `limit`, `offset`
- **응답 200**: `{ "memories": [...], "total": number, "limit": number, "offset": number }`

### `GET /v1/memory/export`
메모리를 MIF v0.2 JSON으로 내보냅니다.
- **인증**: admin
- **쿼리**: `project_id`, `format`(`json` 또는 `markdown`)
- **응답 200**: `provenance`, `validity`, `confidence`, `source_refs`, `supersedes`, `contradicts`가 있는 MIF 봉투.

### `POST /v1/memory/import`
MIF v0.1 또는 v0.2 봉투를 가져옵니다.
- **인증**: admin(또는 명시적 `project_id`를 가진 범위 지정 writer)
- **본문**: JSON 문자열 또는 객체로서의 MIF 봉투
- **응답 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## 거버넌스

### `GET /v1/governance/review-queue`
- **인증**: admin
- **응답 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[], "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
candidate/flagged → active로 승격합니다.
- **인증**: admin
- **본문**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
candidate/flagged → deleted로 승격합니다.
- **인증**: admin
- **본문**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **인증**: admin
- **쿼리**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **응답 200**: `{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **인증**: reader+
- **응답 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"|"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **인증**: writer+(프로젝트 범위 writer는 일치하는 `project_id`를 포함해야 함)
- **본문**: `{ "dataset_id": string, "provider_ids": string[], "k": number, "project_id": string }`
- **응답 200**: `{ "run_id": string, "metrics": { "recallAtK": number, "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms": number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
저장된 eval 실행을 가져옵니다.
- **인증**: reader+

### `GET /v1/eval/report`
최신 eval을 Markdown 또는 JSON으로 렌더링합니다.
- **인증**: reader+
- **쿼리**: `project_id`, `format`(`md`|`json`)

## 이벤트 및 추적

### `POST /v1/events/ingest`
에이전트 텔레메트리를 Lore에 푸시합니다.
- **인증**: writer+
- **본문**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **인증**: reader+
- **쿼리**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
단일 컨텍스트 쿼리 추적을 검사합니다.
- **인증**: reader+

### `POST /v1/traces/:trace_id/feedback`
컨텍스트 쿼리에 대한 피드백을 기록합니다.
- **인증**: writer+
- **본문**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## 통합

### `GET /v1/integrations/agentmemory/health`
agentmemory 업스트림 + 버전 호환성을 확인합니다.
- **인증**: reader+
- **응답 200**: `{ "reachable": boolean, "upstreamVersion": string, "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
agentmemory에서 Lore로 메모리를 가져옵니다.
- **인증**: admin(범위 없음 — 동기화는 프로젝트를 넘나듦)
- **본문**: `{ "project_id"?: string, "dry_run"?: boolean }`

## MCP 서버 (stdio)

MCP 서버는 다음 도구를 노출합니다. 각 도구의 `inputSchema`는 zod 유효성 검사 JSON 스키마입니다. 변경 도구는 8자 이상의 `reason` 문자열이 필요합니다.

| 도구 | 변경 여부 | 설명 |
|---|---|---|
| `context_query` | 아니오 | 쿼리를 위한 컨텍스트 구성 |
| `memory_write` | 예 | 새 메모리 쓰기 |
| `memory_search` | 아니오 | 구성 없이 직접 검색 |
| `memory_get` | 아니오 | id로 가져오기 |
| `memory_list` | 아니오 | 필터로 메모리 나열 |
| `memory_update` | 예 | 인플레이스 패치 |
| `memory_supersede` | 예 | 새 버전으로 대체 |
| `memory_forget` | 예 | 소프트 또는 하드 삭제 |
| `memory_export` | 아니오 | MIF 봉투 내보내기 |
| `eval_run` | 아니오 | 데이터셋에 대해 eval 실행 |
| `trace_get` | 아니오 | id로 추적 검사 |

JSON-RPC 오류 코드:
- `-32602` 유효하지 않은 파라미터(zod 유효성 검사 실패)
- `-32603` 내부 오류(무해화됨. 원본은 stderr에 기록됨)

공식 SDK 전송으로 실행:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

공식 OpenAPI 3.0 스펙은 v0.5에 추적됩니다. 그때까지 이 산문 참조가 권위 있습니다.
