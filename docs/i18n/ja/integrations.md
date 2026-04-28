> 🤖 このドキュメントは英語版から機械翻訳されました。PR による改善を歓迎します — [翻訳貢献ガイド](../README.md)を参照してください。

# インテグレーションガイド

これらのガイドは現在のローカル MVP に対する Lore Context インテグレーションコントラクトを文書化しています。

## 現在のリポジトリの状態

- リポジトリには現在、ローカル REST API、コンテキストルーター/コンポーザー、オプションの JSON ファイル永続化、オプションの Postgres ランタイムストア、トレース、メモリインポート/エクスポート、評価プロバイダー比較、API 提供ダッシュボード HTML、スタンドアロン Next.js ダッシュボード、`agentmemory` アダプター境界が含まれています。
- `apps/mcp-server/src/index.ts` は、`LORE_API_URL` を通じてツールを Lore REST API にプロキシし、設定されている場合は `LORE_API_KEY` を Bearer トークンとして転送する、実行可能な stdio JSON-RPC MCP ランチャーを提供します。レガシー組み込み stdio ループと `LORE_MCP_TRANSPORT=sdk` を通じた公式 `@modelcontextprotocol/sdk` stdio トランスポートをサポートします。
- 以下のドキュメントはインテグレーションコントラクトです。API ファーストの統合は今日ローカル REST サーバーを使用できます。MCP 対応クライアントは `pnpm build` 後にローカル stdio ランチャーを使用できます。

## 共有設計

- MCP 対応クライアントは生の `agentmemory` ではなく、小さな Lore MCP サーバーに接続すべきです。
- API ファーストクライアントは Lore REST エンドポイントを呼び出し、`POST /v1/context/query` をメイン読み取りパスとして使用すべきです。
- `POST /v1/context/query` は `mode`、`sources`、`freshness`、`token_budget`、`writeback_policy`、`include_sources` を受け入れるため、クライアントは必要に応じてメモリ/Web/リポジトリ/ツールトレースのルーティングを強制または無効化できます。
- Lore はローカル `agentmemory` ランタイムを `packages/agentmemory-adapter` を通じてラップします。
- ローカル `agentmemory` は `http://127.0.0.1:3111` に期待されます。

## 利用可能な MCP サーフェス

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

## 利用可能な REST サーフェス

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list`（オプションの `project_id`、`scope`、`status`、`memory_type`、`q`、`limit` 付き）
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

## ローカル API スモーク

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

自動スモークパスは:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## ローカル MCP スモーク

MCP ランチャーは stdin 上の改行区切り JSON-RPC を読み取り、stdout に JSON-RPC メッセージのみを書き込みます:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

パッケージマネージャーのバナーが stdout を汚染するため、MCP クライアントからは `pnpm start` を通じてこれを起動しないでください。

## プライベートデプロイの整合

[deployment.md](deployment.md) のプライベートデモパッケージングは以下を前提としています:

- Lore API とダッシュボードは長時間実行コンテナとして動作します。
- Postgres は共有デモのデフォルト耐久性ストアです。
- MCP ランチャーはクライアントの近くに stdio プロセスとして留まるか、オンデマンドでオプションの `mcp` Compose サービスとして実行します。
- デモシーディングは `examples/demo-dataset/import/lore-demo-memories.json` から来て、評価スモークは `examples/demo-dataset/eval/lore-demo-eval-request.json` から来ます。

プライベートデプロイの場合、クライアントランチャーをプライベート API URL に向け、適合する最小ロールを提供します:

- `reader`: ダッシュボードと読み取り専用コパイロット。
- `writer`: メモリ、フィードバック、または評価ランを書き込む必要があるエージェント。
- `admin`: インポート、エクスポート、ガバナンス、監査、忘却フロー。

## デプロイ対応クライアントテンプレート

### Claude Code

プライベート API を対象とするワークステーションローカルの stdio プロセスを優先します:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY=write-local \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

`node .../dist/index.js` の代わりにパッケージ化された MCP コンテナを使用する場合は、同じ `LORE_API_URL` / `LORE_API_KEY` ペアを保持し、`docker compose run --rm mcp` を通じて stdio ランチャーを実行します。

### Cursor

Cursor スタイルの MCP JSON はランチャーをローカルに保ち、API ターゲットとキーのみを変更すべきです:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "read-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Cursor のワークフローが意図的に耐久性のあるプロジェクトメモリを書き戻す場合にのみ `writer` キーを使用してください。

### Qwen Code

Qwen スタイルの `mcpServers` JSON は同じ境界に従います:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "write-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

検索のみの検索アシスタントには `reader` を使用し、`memory_write`、`memory_update`、またはトレースフィードバックツールが必要なエージェントフローには `writer` を使用してください。

## 安全なデフォルト

- MCP にはローカルで `stdio` を優先します。リモートトランスポートが必要な場合にのみ認証済みのストリーミング可能な HTTP を使用します。
- SSE はレガシー互換性として扱い、デフォルトパスとして扱わないでください。
- `includeTools` またはクライアントの同等機能でツールをホワイトリスト化します。
- デフォルトでは広範な信頼モードを有効にしないでください。
- 変更操作には `reason` を必要とします。
- admin が制御された削除のために意図的に `hard_delete: true` を設定する場合を除き、`memory_forget` はソフト削除のままにしてください。
- 共有ローカルまたはリモート API 露出には `LORE_API_KEYS` ロール分離を使用します: 読み取り専用クライアントには `reader`、エージェントのライトバックには `writer`、同期/インポート/エクスポート/忘却/ガバナンス/監査操作にのみ `admin`。クライアントキーが見たり変更したりできるプロジェクトをスコープするために `projectIds` を追加します。
- `agentmemory` を `127.0.0.1` にバインドしたままにします。
- 生の `agentmemory` ビューアやコンソールを公開しないでください。
- 現在の稼働中の `agentmemory` 0.9.3 コントラクト: `remember`、`export`、`audit`、`forget(memoryId)` は Lore 同期/コントラクトテストに使用可能です。`smart-search` は観察を検索し、新しく記憶されたメモリレコードが直接検索可能であることの証明として扱うべきではありません。
