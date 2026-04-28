> 🤖 このドキュメントは英語版から機械翻訳されました。PR による改善を歓迎します — [翻訳貢献ガイド](../README.md)を参照してください。

# 変更履歴

Lore Context への注目すべき変更はすべてここに記録されています。フォーマットは [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) に基づき、このプロジェクトは [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) に準拠しています。

## [v0.4.0-alpha] — 2026-04-28

最初の公開アルファ版。監査失敗した MVP をリリース候補アルファに変換した本番ハードニングスプリントを完了します。すべての P0 監査項目がクリアされ、13 件中 12 件の P1 項目がクリアされました（1 件は部分的 — 注記参照）。117 件以上のテストが通過し、モノレポのビルドがクリーンになっています。

### 追加

- **`packages/eval/src/runner.ts`** — 実際の `EvalRunner`（`runEval` / `persistRun` / `loadRuns` / `diffRuns`）。評価はユーザー所有のデータセットに対してエンドツーエンドの検索評価を実行し、クロスタイム回帰検出のためにランを JSON として保持できるようになりました。
- **`packages/governance/src/state.ts`** — 6 状態ガバナンスステートマシン（`candidate / active / flagged / redacted / superseded / deleted`）と明示的な合法遷移テーブル。不正な遷移はスローします。
- **`packages/governance/src/audit.ts`** — `@lore/shared` の `AuditLog` 型と統合された不変の監査ログ追加ヘルパー。
- **`packages/governance/detectPoisoning`** — 同一ソース支配（>80%）と命令動詞パターンマッチングを使用したメモリポイズニング検出のヒューリスティック。
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — 手動ロール比較（新しい依存関係なし）による semver ベースの上流バージョンプローブ。`LORE_AGENTMEMORY_REQUIRED=0` によるサイレントスキップ縮退モードをサポート。
- **`packages/mif`** — `LoreMemoryItem` に `supersedes: string[]` と `contradicts: string[]` フィールドを追加。JSON と Markdown フォーマット間のラウンドトリップを保持。
- **`apps/api/src/logger.ts`** — センシティブフィールド（`content` / `query` / `memory` / `value` / `password` / `secret` / `token` / `key`）の自動リダクション付き構造化 JSON ロガー。`requestId` がすべてのリクエストを通じて流れます。
- **`apps/dashboard/middleware.ts`** — HTTP Basic Auth ミドルウェア。`DASHBOARD_BASIC_AUTH_USER` と `DASHBOARD_BASIC_AUTH_PASS` なしでは本番起動を拒否します。
- **`scripts/check-env.mjs`** — 本番モード環境変数バリデーター。いずれかの環境値がプレースホルダーパターン（`read-local`、`write-local`、`admin-local`、`change-me`、`demo`、`test`、`dev`、`password`）に一致する場合、アプリの起動を拒否します。
- **レート制限** — 認証失敗バックオフ付き IP ごとおよびキーごとのデュアルバケットトークンリミッター（60 秒内で 5 回失敗 → 30 秒ロックアウト → 429 レスポンス）。`LORE_RATE_LIMIT_PER_IP`、`LORE_RATE_LIMIT_PER_KEY`、`LORE_RATE_LIMIT_DISABLED` で設定可能。
- **グレースフルシャットダウン** — SIGTERM/SIGINT ハンドラーが最大 10 秒でインフライトリクエストをドレインし、保留中の Postgres 書き込みをフラッシュし、プールを閉じ、15 秒で強制終了します。
- **データベースインデックス** — `memory_records`、`context_traces`、`audit_logs`、`event_log`、`eval_runs` に `(project_id)` / `(status)` / `(created_at)` の B-tree インデックス。jsonb の `content` と `metadata` に GIN インデックス。
- **MCP zod 入力バリデーション** — すべての MCP ツールがツールごとの zod スキーマに対して `safeParse` を実行するようになりました。失敗はサニタイズされた問題と共に JSON-RPC `-32602` を返します。
- **MCP `destructiveHint` + 必須 `reason`** — すべての変更ツール（`memory_forget`、`memory_update`、`memory_supersede`、`memory_redact`）は少なくとも 8 文字の `reason` を必要とし、`destructiveHint: true` を表示します。
- `apps/api`、`apps/mcp-server`、`packages/eval`、`packages/governance`、`packages/mif`、`packages/agentmemory-adapter` 全体で 117 件以上の新しいテストケース。
- 多言語ドキュメント: `docs/i18n/<lang>/` 下の 17 言語の README。
- `CHANGELOG.md`（このファイル）。
- `docs/getting-started.md` — 5 分間の開発者クイックスタート。
- `docs/api-reference.md` — REST API エンドポイントリファレンス。
- `docs/i18n/README.md` — 翻訳貢献ガイド。

### 変更

- **`packages/mif`** エンベロープバージョン `"0.1"` → `"0.2"`。後方互換インポート。
- **`LORE_POSTGRES_AUTO_SCHEMA`** デフォルト `true` → `false`。本番デプロイはスキーマの自動適用を明示的にオプトインするか、`pnpm db:schema` を実行する必要があります。
- **`apps/api`** リクエストボディパーサーがハードペイロードサイズ制限付きのストリーミングになりました（`LORE_MAX_JSON_BYTES`、デフォルト 1 MiB）。サイズ超過のリクエストは 413 を返します。
- **ループバック認証**の変更: URL の `Host` ヘッダーへの依存を削除。ループバック検出は `req.socket.remoteAddress` のみを使用するようになりました。API キーが設定されていない本番環境では、API はフェイルクローズし、リクエストを拒否します（以前: サイレントに admin を付与していました）。
- **スコープ付き API キー**は `/v1/memory/list`、`/v1/eval/run`、`/v1/memory/import` で `project_id` を提供する必要があります（以前: 未定義の `project_id` がショートサーキットしていました）。
- **すべての Dockerfile** が非 root の `node` ユーザーで実行されるようになりました。`apps/api/Dockerfile` と `apps/dashboard/Dockerfile` が `HEALTHCHECK` を宣言します。
- **`docker-compose.yml`** の `POSTGRES_PASSWORD` が `${POSTGRES_PASSWORD:?must be set}` を使用するようになりました — 明示的なパスワードなしで起動が速やかに失敗します。
- **`docs/deployment/compose.private-demo.yml`** — 同様の必須またはフェイルパターン。
- **`.env.example`** — すべてのデモデフォルトが削除され、`# REQUIRED` プレースホルダーに置き換えられました。レート制限、リクエストタイムアウト、ペイロード制限、agentmemory 必須モード、ダッシュボード Basic Auth の新しい変数が記載されました。

### 修正

- **ループバックバイパス認証脆弱性**（P0）。攻撃者が `Host: 127.0.0.1` を送信してループバック検出を偽装し、API キーなしで admin ロールを取得できました。
- **ダッシュボードプロキシでの confused-deputy 問題**（P0）。ダッシュボードプロキシが未認証リクエストに `LORE_API_KEY` を注入し、ポート 3001 に到達できる人に admin 権限を付与していました。
- **ブルートフォース防御**（P0）。README/`.env.example` に表示されたデモキー（`admin-local`、`read-local`、`write-local`）が無限に列挙可能でした。レート制限とデフォルト削除でこれを防御します。
- **`LORE_API_KEYS` の不正な JSON によるクラッシュ** — プロセスがスタックトレースをスローする代わりに明確なエラーで終了するようになりました。
- **大きなリクエストボディによる OOM** — 設定された制限を超えるボディは、Node プロセスをクラッシュさせる代わりに 413 を返すようになりました。
- **MCP エラーリーク** — 生の SQL、ファイルパス、スタックトレースを含む上流 API エラーが MCP クライアントに到達する前に `{code, generic-message}` にサニタイズされるようになりました。
- **ダッシュボードの JSON パースクラッシュ** — 無効な JSON レスポンスが UI をクラッシュしなくなりました。エラーはユーザーに見える状態として表示されます。
- **MCP `memory_update` / `memory_supersede`** は以前 `reason` を必要としていませんでした。今は zod スキーマで強制されます。
- **Postgres プール**: `statement_timeout` が 15 秒に設定されました。以前は不正な jsonb クエリによる無制限のクエリ時間リスクがありました。

### セキュリティ

- すべての P0 監査結果（ループバックバイパス / ダッシュボード認証 / レート制限 / デモシークレット）がクリアされました。完全な監査証跡については public release notes を参照してください。
- `pnpm audit --prod` はリリース時点でゼロの既知脆弱性を報告します。
- デモ資格情報がすべてのデプロイテンプレートとサンプル README から削除されました。
- コンテナイメージはデフォルトで非 root として実行されます。

### 注記 / 既知の制限

- **部分的な P1-1**: `/v1/context/query` は既存のコンシューマーテストを壊さないために、許可的なスコープキー動作を維持しています。他の影響を受けたルート（`/v1/memory/list`、`/v1/eval/run`、`/v1/memory/import`）は `project_id` を強制します。v0.5 でトラッキングされます。
- **ホスト型マルチテナントクラウド同期**は v0.4.0-alpha では実装されていません。ローカルおよび Compose プライベートデプロイのみ。
- **翻訳品質**: README のローカライズは LLM 生成であり、明確にラベル付けされています。各ロケールを改良するコミュニティ PR を歓迎します（[`docs/i18n/README.md`](../README.md) を参照）。
- **OpenAPI / Swagger 仕様**はまだパッケージ化されていません。REST サーフェスは [`docs/api-reference.md`](api-reference.md) に散文形式で記載されています。v0.5 でトラッキングされます。

### 謝辞

このリリースは、構造化された監査計画に対する並列サブエージェント実行を含む 1 日の本番ハードニングスプリントの結果です。計画と監査アーティファクトに保存されています。

## [v0.0.0] — プレリリース

内部開発マイルストーン、公開リリースなし。実装内容:

- ワークスペースパッケージスキャフォルド（TypeScript モノレポ、pnpm ワークスペース）。
- 共有 TypeScript ビルド/テストパイプライン。
- `@lore/shared` のメモリ / コンテキスト / 評価 / 監査型システム。
- `agentmemory` アダプター境界。
- コンテキストルーターとコンポーザーを備えたローカル REST API。
- JSON ファイル永続化 + オプションの Postgres ランタイムストアとインクリメンタルアップサート。
- メモリの詳細 / 編集 / 継承 / 忘却フロー（明示的なハード削除付き）。
- 実際のメモリ使用量アカウンティング（`useCount`、`lastUsedAt`）。
- トレースフィードバック（`useful` / `wrong` / `outdated` / `sensitive`）。
- ガバナンスフィールド付き MIF 互換 JSON + Markdown インポート/エクスポート。
- シークレットスキャン正規表現セット。
- 直接セッションベースの評価メトリクス。プロバイダー比較評価ラン。評価ランリスティング。
- reader/writer/admin ロール分離付き API キー保護。
- ガバナンスレビューキュー。監査ログ API。
- API 提供ダッシュボード HTML。スタンドアロン Next.js ダッシュボード。
- デモシードデータ。統合設定生成。
- プライベート Docker/Compose パッケージング。
- レガシー + 公式 SDK stdio MCP トランスポート。

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
