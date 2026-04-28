> 🤖 このドキュメントは英語版から機械翻訳されました。PR による改善を歓迎します — [翻訳貢献ガイド](../README.md)を参照してください。

# プライベートデプロイ

> **`openssl rand -hex 32` でキーを生成してください — 本番環境で以下のプレースホルダーを決して使用しないでください。**

このスライスは、アプリケーションのコードパスを変更せずに、プライベートデモまたは内部チームのロールアウトのために Lore をパッケージ化します。デプロイバンドルは以下で構成されます:

- `apps/api/Dockerfile`: REST API イメージ。
- `apps/dashboard/Dockerfile`: スタンドアロン Next.js ダッシュボードイメージ。
- `Dockerfile`: stdio クライアント用のオプション MCP ランチャーイメージ。
- `docs/deployment/compose.private-demo.yml`: Postgres、API、ダッシュボード、オンデマンド MCP サービスのコピー&ペースト Compose スタック。
- `examples/demo-dataset/**`: ファイルストア、インポート、評価フロー用のシードデータ。

## 推奨トポロジー

- `postgres`: 共有またはマルチオペレーターデモの耐久性ストア。
- `api`: デフォルトでループバックに公開される内部ブリッジネットワーク上の Lore REST API。
- `dashboard`: デフォルトでループバックに公開され、`LORE_API_URL` を通じて API にプロキシするオペレーター UI。
- `mcp`: ホスト上で `node apps/mcp-server/dist/index.js` の代わりにコンテナ化されたランチャーを必要とする Claude、Cursor、Qwen オペレーター向けのオプション stdio コンテナ。

Compose スタックは意図的に公開露出を狭く保っています。Postgres、API、ダッシュボードはすべて変数化されたポートマッピングを通じてデフォルトで `127.0.0.1` にバインドします。

## プリフライト

1. `.env.example` を `.env.private` などのプライベートランタイムファイルにコピーします。
2. `POSTGRES_PASSWORD` を置き換えます。
3. 単一の `LORE_API_KEY` よりも `LORE_API_KEYS` を優先します。
4. 完全なオペレーターワークフローの場合は `DASHBOARD_LORE_API_KEY` を `admin` キーに設定し、読み取り専用デモの場合はスコープ付き `reader` キーに設定します。クライアントがメモリを変更すべきかどうかに応じて、`MCP_LORE_API_KEY` を `writer` または `reader` キーに設定します。

ロール分離の例:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
DASHBOARD_BASIC_AUTH_USER=admin
DASHBOARD_BASIC_AUTH_PASS=<YOUR_DASHBOARD_PASSWORD>
```

## スタックを起動する

リポジトリのルートからプライベートデモスタックをビルドして起動します:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

ヘルスチェック:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl -u "${DASHBOARD_BASIC_AUTH_USER}:${DASHBOARD_BASIC_AUTH_PASS}" \
  http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## デモデータをシードする

Postgres バックの Compose スタックの場合、API がヘルシーになった後にパッケージ化されたデモメモリをインポートします:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

パッケージ化された評価リクエストを実行します:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

代わりにデータベースなしの単一ホストデモが必要な場合は、ファイルストアスナップショットを API に向けます:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## MCP ランチャーパターン

推奨パターン:

- MCP ランチャーをクライアントの近くで実行します。
- `LORE_API_URL` をプライベート API URL に向けます。
- ランチャーには最小限の適切な API キーを提供します。

ホストベースのランチャー:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

コンテナ化されたランチャー:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

コンテナ化されたランチャーは再現可能なワークステーションセットアップに便利ですが、stdio プロセスであり、長時間実行のパブリックネットワークサービスではありません。

## セキュリティのデフォルト

- 認証済みリバースプロキシがスタックの前にすでにある場合を除き、`API_BIND_HOST`、`DASHBOARD_BIND_HOST`、`POSTGRES_BIND_HOST` を `127.0.0.1` に保ってください。
- どこでも単一のグローバル admin キーを再利用するのではなく、`reader` / `writer` / `admin` 分離の `LORE_API_KEYS` を優先してください。
- デモクライアントにはプロジェクトスコープのキーを使用してください。パッケージ化されたデモプロジェクト ID は `demo-private` です。
- `AGENTMEMORY_URL` をループバックに保ち、生の `agentmemory` を直接公開しないでください。
- プライベートデプロイが本当に稼働中の agentmemory ランタイムに依存していない限り、`LORE_AGENTMEMORY_REQUIRED=0` のままにしてください。
- `LORE_POSTGRES_AUTO_SCHEMA=true` は制御された内部環境のみに保ってください。スキーマのブートストラップがリリースプロセスの一部になったら、`false` に固定できます。

## 再利用するファイル

- Compose サンプル: [compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- API イメージ: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- ダッシュボードイメージ: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- MCP イメージ: [Dockerfile](../../../Dockerfile)
- デモデータ: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
