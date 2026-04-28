> 🤖 このドキュメントは英語版から機械翻訳されました。PR による改善を歓迎します — [翻訳貢献ガイド](../README.md)を参照してください。

# API リファレンス

Lore Context は `/v1/*` の下に REST API と stdio MCP サーバーを公開しています。このドキュメントは REST サーフェスをカバーします。MCP ツール名は末尾に列挙されています。

すべての例は以下を前提としています:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## 規約

- すべてのエンドポイントは JSON を受け入れて返します。
- 認証: `Authorization: Bearer <key>` ヘッダー（または `x-lore-api-key`）。`/health` のみが未認証ルートです。
- ロール: `reader < writer < admin`。各エンドポイントは最小ロールを記載しています。
- エラー: `{ "error": { "code": string, "message": string, "status": number, "requestId": string } }`。
- レート制限: すべてのレスポンスに `X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset` ヘッダー。`429 Too Many Requests` には `Retry-After` ヘッダーが含まれます。
- すべての変更は監査ログに記録されます。admin のみが `/v1/governance/audit-log` を通じてアクセスできます。

## ヘルスと準備状況

### `GET /health`
- **認証**: なし
- **レスポンス 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number, "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## コンテキスト

### `POST /v1/context/query`
メモリ + Web + リポジトリ + ツールトレースからコンテキストを構成します。

- **認証**: reader 以上
- **ボディ**: `{ "query": string, "project_id"?: string, "token_budget"?: number, "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **レスポンス 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...], "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number, "tokens_used": number, "latency_ms": number, "traceId": string }`

## メモリ

### `POST /v1/memory/write`
- **認証**: writer 以上（プロジェクトスコープのライターは一致する `project_id` を含める必要があります）
- **ボディ**: `{ "content": string, "memory_type": string, "project_id": string, "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number, "source_refs"?: string[], "metadata"?: object }`
- **レスポンス 200**: `{ "id": string, "governance": { "state": GovState, "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **認証**: reader 以上
- **レスポンス 200**: ガバナンス状態を含む完全なメモリレコード。

### `POST /v1/memory/:id/update`
メモリをインプレースでパッチします（小さな修正のみ）。
- **認証**: writer 以上
- **ボディ**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
古いメモリを置き換える新しいメモリを作成します。
- **認証**: writer 以上
- **ボディ**: `{ "content": string, "reason": string }`
- **レスポンス 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
デフォルトではソフト削除。admin はハード削除が可能。
- **認証**: writer 以上（ソフト） / admin（ハード）
- **ボディ**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
構成なしの直接検索。
- **認証**: reader 以上
- **ボディ**: `{ "query": string, "project_id"?: string, "limit"?: number, "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **認証**: reader 以上
- **クエリ**: `project_id`（スコープ付きキーには REQUIRED）、`state`、`limit`、`offset`
- **レスポンス 200**: `{ "memories": [...], "total": number, "limit": number, "offset": number }`

### `GET /v1/memory/export`
メモリを MIF v0.2 JSON としてエクスポートします。
- **認証**: admin
- **クエリ**: `project_id`、`format`（`json` または `markdown`）
- **レスポンス 200**: `provenance`、`validity`、`confidence`、`source_refs`、`supersedes`、`contradicts` を含む MIF エンベロープ。

### `POST /v1/memory/import`
MIF v0.1 または v0.2 エンベロープをインポートします。
- **認証**: admin（または明示的な `project_id` を持つスコープ付きライター）
- **ボディ**: JSON 文字列またはオブジェクトとしての MIF エンベロープ
- **レスポンス 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## ガバナンス

### `GET /v1/governance/review-queue`
- **認証**: admin
- **レスポンス 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[], "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
candidate/flagged → active に昇格します。
- **認証**: admin
- **ボディ**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
candidate/flagged → deleted に昇格します。
- **認証**: admin
- **ボディ**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **認証**: admin
- **クエリ**: `project_id`、`actor`、`from`、`to`、`limit`、`offset`
- **レスポンス 200**: `{ "entries": AuditLog[], "total": number }`

## 評価

### `GET /v1/eval/providers`
- **認証**: reader 以上
- **レスポンス 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"|"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **認証**: writer 以上（プロジェクトスコープのライターは一致する `project_id` を含める必要があります）
- **ボディ**: `{ "dataset_id": string, "provider_ids": string[], "k": number, "project_id": string }`
- **レスポンス 200**: `{ "run_id": string, "metrics": { "recallAtK": number, "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms": number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
保存された評価ランを取得します。
- **認証**: reader 以上

### `GET /v1/eval/report`
最新の評価を Markdown または JSON としてレンダリングします。
- **認証**: reader 以上
- **クエリ**: `project_id`、`format`（`md`|`json`）

## イベントとトレース

### `POST /v1/events/ingest`
エージェントテレメトリを Lore にプッシュします。
- **認証**: writer 以上
- **ボディ**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **認証**: reader 以上
- **クエリ**: `project_id`、`traceId`、`from`、`to`、`limit`

### `GET /v1/traces/:trace_id`
単一のコンテキストクエリトレースを検査します。
- **認証**: reader 以上

### `POST /v1/traces/:trace_id/feedback`
コンテキストクエリに対するフィードバックを記録します。
- **認証**: writer 以上
- **ボディ**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## インテグレーション

### `GET /v1/integrations/agentmemory/health`
agentmemory 上流とバージョン互換性を確認します。
- **認証**: reader 以上
- **レスポンス 200**: `{ "reachable": boolean, "upstreamVersion": string, "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
agentmemory から Lore にメモリをプルします。
- **認証**: admin（スコープなし — 同期はプロジェクトをまたぎます）
- **ボディ**: `{ "project_id"?: string, "dry_run"?: boolean }`

## MCP サーバー（stdio）

MCP サーバーは以下のツールを公開しています。各ツールの `inputSchema` は zod バリデート済み JSON Schema です。変更ツールには少なくとも 8 文字の `reason` 文字列が必要です。

| ツール | 変更 | 説明 |
|---|---|---|
| `context_query` | いいえ | クエリのコンテキストを構成する |
| `memory_write` | はい | 新しいメモリを書き込む |
| `memory_search` | いいえ | 構成なしの直接検索 |
| `memory_get` | いいえ | id で取得する |
| `memory_list` | いいえ | フィルター付きでメモリを一覧表示する |
| `memory_update` | はい | インプレースでパッチする |
| `memory_supersede` | はい | 新しいバージョンに置き換える |
| `memory_forget` | はい | ソフトまたはハード削除 |
| `memory_export` | いいえ | MIF エンベロープをエクスポートする |
| `eval_run` | いいえ | データセットに対して評価を実行する |
| `trace_get` | いいえ | id でトレースを検査する |

JSON-RPC エラーコード:
- `-32602` 無効なパラメーター（zod バリデーション失敗）
- `-32603` 内部エラー（サニタイズ済み。元のものは stderr に書き込まれます）

公式 SDK トランスポートで実行する場合:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

正式な OpenAPI 3.0 仕様は v0.5 でトラッキングされています。それまでは、この散文リファレンスが権威的です。
