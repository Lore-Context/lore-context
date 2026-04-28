> 🤖 このドキュメントは英語版から機械翻訳されました。PR による改善を歓迎します — [翻訳貢献ガイド](../README.md)を参照してください。

# はじめに

このガイドでは、ゼロから Lore Context インスタンスを起動し、メモリの書き込み、コンテキストのクエリ、ダッシュボードへのアクセスまでを説明します。合計約 15 分、コアパスは約 5 分を見込んでください。

## 前提条件

- **Node.js** `>=22`（`nvm`、`mise`、またはディストロのパッケージマネージャーを使用）
- **pnpm** `10.30.1`（`corepack enable && corepack prepare pnpm@10.30.1 --activate`）
- （オプション）Postgres+pgvector パスの場合は **Docker + Docker Compose**
- （オプション）スキーマを自分で適用する場合は **psql**

## 1. クローンとインストール

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

`pnpm test` がグリーンでない場合は、続けないでください — 失敗ログと共にイシューを開いてください。

## 2. 実際のシークレットを生成する

Lore Context はプレースホルダー値があると本番環境での起動を拒否します。習慣を一貫させるためにローカル開発でも実際のキーを生成してください。

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

マルチロールのローカルセットアップの場合:

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

## 3. API を起動する（ファイルバックエンド、データベース不要）

最もシンプルなパスはローカル JSON ファイルをストレージバックエンドとして使用します。個人開発とスモークテストに適しています。

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

別のシェルでヘルスを確認します:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

期待される結果: `{"status":"ok",...}`。

## 4. 最初のメモリを書き込む

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

期待される結果: 新しいメモリの `id` と `governance.state` が `active` または `candidate`（コンテンツがシークレットなどのリスクパターンにマッチした場合）の `200` レスポンス。

## 5. コンテキストを構成する

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

`evidence.memory` 配列にメモリが引用されているのが見えるはずです。また、後でルーティングとフィードバックの検査に使用できる `traceId` も確認できます。

## 6. ダッシュボードを起動する

新しいターミナルで:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

ブラウザで http://127.0.0.1:3001 を開いてください。ブラウザが Basic Auth 資格情報を要求します。認証後、ダッシュボードにメモリインベントリ、トレース、評価結果、ガバナンスレビューキューが表示されます。

## 7. （オプション）MCP 経由で Claude Code を接続する

Claude Code の `claude_desktop_config.json` の MCP サーバーセクションに以下を追加します:

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

Claude Code を再起動します。Lore Context の MCP ツール（`context_query`、`memory_write` など）が利用可能になります。

他のエージェント IDE（Cursor、Qwen、Dify、FastGPT など）については、[docs/integrations/README.md](integrations.md) の統合マトリックスを参照してください。

## 8. （オプション）Postgres + pgvector に切り替える

JSON ファイルストレージを使いきったとき:

```bash
docker compose up -d postgres
pnpm db:schema   # applies apps/api/src/db/schema.sql via psql
```

次に `LORE_STORE_DRIVER=postgres` で API を起動します:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

`pnpm smoke:postgres` を実行して、書き込み・再起動・読み取りのラウンドトリップが生き残ることを確認します。

## 9. （オプション）デモデータセットをシードして評価を実行する

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

評価レポートは `output/eval-reports/` に Markdown と JSON として保存されます。

## 次のステップ

- **本番デプロイ** — [deployment.md](deployment.md)
- **API リファレンス** — [api-reference.md](api-reference.md)
- **アーキテクチャ詳細** — [architecture.md](architecture.md)
- **ガバナンスレビューワークフロー** — [architecture.md](architecture.md) の「ガバナンスフロー」セクションを参照
- **メモリポータビリティ（MIF）** — `pnpm --filter @lore/mif test` でラウンドトリップ例を確認
- **貢献** — [CONTRIBUTING.md](CONTRIBUTING.md)

## よくある落とし穴

| 症状 | 原因 | 修正 |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | 別のプロセスがポート 3000 を使用中 | `lsof -i :3000` で見つけるか、`PORT=3010` を設定する |
| `503 Dashboard Basic Auth not configured` | `DASHBOARD_BASIC_AUTH_USER/PASS` なしの本番モード | 環境変数をエクスポートするか `LORE_DASHBOARD_DISABLE_AUTH=1`（開発のみ）を渡す |
| `[check-env] ERROR: ... contain placeholder/demo values` | いずれかの env が `admin-local` / `change-me` / `demo` などにマッチ | `openssl rand -hex 32` で実際の値を生成する |
| `429 Too Many Requests` | レート制限がトリガーされた | クールオフウィンドウ（デフォルト 5 回の認証失敗後 30 秒）を待つか、開発環境で `LORE_RATE_LIMIT_DISABLED=1` を設定する |
| `agentmemory adapter unhealthy` | ローカル agentmemory ランタイムが実行されていない | agentmemory を起動するか、サイレントスキップのために `LORE_AGENTMEMORY_REQUIRED=0` を設定する |
| MCP クライアントが `-32602 Invalid params` を見る | ツール入力が zod スキーマバリデーションに失敗 | エラー本文の `invalid_params` 配列を確認する |
| ダッシュボードのすべてのページで 401 | 誤った Basic Auth 資格情報 | 環境変数を再エクスポートしてダッシュボードプロセスを再起動する |

## ヘルプを得る

- バグを報告: https://github.com/Lore-Context/lore-context/issues
- セキュリティ開示: [SECURITY.md](SECURITY.md) を参照
- ドキュメントへの貢献: [CONTRIBUTING.md](CONTRIBUTING.md) を参照
