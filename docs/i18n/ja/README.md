> 🤖 このドキュメントは英語版から機械翻訳されました。PR による改善を歓迎します — [翻訳貢献ガイド](../README.md)を参照してください。

<div align="center">

# Lore Context

**AIエージェントのメモリ、評価、ガバナンスのコントロールプレーン。**

すべてのエージェントが記憶したこと、使用したこと、そして忘れるべきことを把握してください — メモリが本番環境のリスクになる前に。

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[はじめに](getting-started.md) · [API リファレンス](api-reference.md) · [アーキテクチャ](architecture.md) · [インテグレーション](integrations.md) · [デプロイ](deployment.md) · [変更履歴](CHANGELOG.md)

🌐 **他の言語で読む**: [English](../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## Lore Context とは

Lore Context は AIエージェントのメモリ向け**オープンコアのコントロールプレーン**です。メモリ、検索、ツールトレースをまたいでコンテキストを構成し、自社データセットで検索品質を評価し、センシティブなコンテンツのガバナンスレビューをルーティングし、バックエンド間で移行可能なポータブル交換フォーマットとしてメモリをエクスポートします。

別のメモリデータベースになることを目指しているわけではありません。独自の価値はメモリの上に構築されるものにあります。

- **コンテキストクエリ** — 単一エンドポイントでメモリ + Web + リポジトリ + ツールトレースを構成し、出所情報付きのグレード付きコンテキストブロックを返します。
- **メモリ評価** — 自社が所有するデータセットに対して Recall@K、Precision@K、MRR、古いヒット率、p95 レイテンシを実行し、回帰検出のためにランを保持して比較します。
- **ガバナンスレビュー** — 6状態ライフサイクル（`candidate / active / flagged / redacted / superseded / deleted`）、リスクタグスキャン、ポイズニングヒューリスティクス、不変の監査ログ。
- **MIF 互換ポータビリティ** — `provenance / validity / confidence / source_refs / supersedes / contradicts` を保持した JSON + Markdown エクスポート/インポート。メモリバックエンド間の移行フォーマットとして機能します。
- **マルチエージェントアダプター** — バージョンプローブ + 縮退モードフォールバックを備えた `agentmemory` ファーストクラス統合。追加ランタイム向けのクリーンなアダプターコントラクト。

## 使用タイミング

| Lore Context を使う場合... | メモリデータベース（agentmemory、Mem0、Supermemory）を使う場合... |
|---|---|
| エージェントが何を記憶したか、なぜか、使われたかを**証明**する必要がある | 生のメモリストレージだけが必要 |
| 複数のエージェント（Claude Code、Cursor、Qwen、Hermes、Dify）を運用し、共有された信頼できるコンテキストが必要 | 単一エージェントを構築しており、ベンダーロックされたメモリ層で問題ない |
| コンプライアンスのためにローカルまたはプライベートデプロイが必要 | ホスト型 SaaS を好む |
| ベンダーのベンチマークではなく自社データセットでの評価が必要 | ベンダーベンチマークで十分 |
| システム間でメモリを移行したい | バックエンドを切り替える予定がない |

## クイックスタート

```bash
# 1. クローン + インストール
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. 実際の API キーを生成する（ローカル専用開発以外のいかなる環境でもプレースホルダーを使用しないこと）
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. API を起動する（ファイルバックエンド、Postgres 不要）
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. メモリを書き込む
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. コンテキストをクエリする
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

完全なセットアップ（Postgres、Docker Compose、ダッシュボード、MCP 統合）については [docs/getting-started.md](getting-started.md) を参照してください。

## アーキテクチャ

```text
                       ┌─────────────────────────────────────────────┐
   MCP clients ──────► │ apps/api  (REST + auth + rate limit + logs) │
   (Claude Code,       │   ├── context router (memory/web/repo/tool) │
    Cursor, Qwen,      │   ├── context composer                      │
    Dify, Hermes...)   │   ├── governance + audit                    │
                       │   ├── eval runner                           │
                       │   └── MIF import/export                     │
                       └────────┬────────────────────────────────────┘
                                │
                  ┌─────────────┼──────────────────────────┐
                  ▼             ▼                          ▼
           Postgres+pgvector   agentmemory adapter     packages/search
           (incremental        (version-probed,        (BM25 / hybrid
            persistence)        degraded-mode safe)     pluggable)
                                                                 ▲
                       ┌─────────────────────────────┐           │
                       │ apps/dashboard  (Next.js)   │ ──────────┘
                       │   protected by Basic Auth   │
                       │   memory · traces · eval    │
                       │   governance review queue   │
                       └─────────────────────────────┘
```

詳細については [docs/architecture.md](architecture.md) を参照してください。

## v0.4.0-alpha の内容

| 機能 | ステータス | 場所 |
|---|---|---|
| REST API（API キー認証、reader/writer/admin） | ✅ 本番対応 | `apps/api` |
| MCP stdio サーバー（レガシー + 公式 SDK トランスポート） | ✅ 本番対応 | `apps/mcp-server` |
| HTTP Basic Auth ゲーティング付き Next.js ダッシュボード | ✅ 本番対応 | `apps/dashboard` |
| Postgres + pgvector インクリメンタル永続化 | ✅ オプション | `apps/api/src/db/` |
| ガバナンスステートマシン + 監査ログ | ✅ 本番対応 | `packages/governance` |
| 評価ランナー（Recall@K / Precision@K / MRR / staleHit / p95） | ✅ 本番対応 | `packages/eval` |
| MIF v0.2 インポート/エクスポート（`supersedes` + `contradicts`） | ✅ 本番対応 | `packages/mif` |
| バージョンプローブ + 縮退モード付き `agentmemory` アダプター | ✅ 本番対応 | `packages/agentmemory-adapter` |
| レート制限（IP ごと + キーごと、バックオフ付き） | ✅ 本番対応 | `apps/api` |
| センシティブフィールド自動リダクション付き構造化 JSON ログ | ✅ 本番対応 | `apps/api/src/logger.ts` |
| Docker Compose プライベートデプロイ | ✅ 本番対応 | `docker-compose.yml` |
| デモデータセット + スモークテスト + Playwright UI テスト | ✅ 本番対応 | `examples/`、`scripts/` |
| ホスト型マルチテナントクラウド同期 | ⏳ ロードマップ | — |

完全な v0.4.0-alpha リリースノートは [CHANGELOG.md](CHANGELOG.md) を参照してください。

## インテグレーション

Lore Context は MCP と REST を話し、ほとんどのエージェント IDE やチャットフロントエンドと統合できます。

| ツール | セットアップガイド |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](../../integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](../../integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](../../integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](../../integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](../../integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](../../integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](../../integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](../../integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](../../integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](../../integrations/openwebui.md) |
| その他 / 汎用 MCP | [integrations.md](integrations.md) |

## デプロイ

| モード | 適した場合 | ドキュメント |
|---|---|---|
| **ローカルファイルバックエンド** | 個人開発、プロトタイプ、スモークテスト | この README のクイックスタート |
| **ローカル Postgres+pgvector** | 本番品質シングルノード、大規模セマンティック検索 | [deployment.md](deployment.md) |
| **Docker Compose プライベート** | セルフホスト型チームデプロイ、隔離ネットワーク | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **クラウドマネージド** | v0.6 で提供予定 | — |

すべてのデプロイパスには明示的なシークレットが必要です: `POSTGRES_PASSWORD`、`LORE_API_KEYS`、`DASHBOARD_BASIC_AUTH_USER/PASS`。`scripts/check-env.mjs` スクリプトは、いずれかの値がプレースホルダーパターンに一致する場合、本番起動を拒否します。

## セキュリティ

v0.4.0-alpha は、非公開のアルファデプロイに適した多層防御の姿勢を実装しています。

- **認証**: ロール分離（`reader`/`writer`/`admin`）とプロジェクトスコープを持つ API キーベアラートークン。空キーモードは本番環境でフェイルクローズします。
- **レート制限**: 認証失敗バックオフ付き IP ごと + キーごとのデュアルバケット（60 秒内で 5 回失敗すると 429、30 秒ロックアウト）。
- **ダッシュボード**: HTTP Basic Auth ミドルウェア。`DASHBOARD_BASIC_AUTH_USER/PASS` なしでは本番起動を拒否します。
- **コンテナ**: すべての Dockerfile は非 root の `node` ユーザーで実行。api + dashboard に HEALTHCHECK あり。
- **シークレット**: ハードコードされた資格情報ゼロ。すべてのデフォルトは必須または失敗の変数。`scripts/check-env.mjs` は本番環境でプレースホルダー値を拒否します。
- **ガバナンス**: 書き込み時に PII / API キー / JWT / 秘密鍵の正規表現スキャン。リスクタグ付きコンテンツはレビューキューに自動ルーティング。すべての状態遷移で不変の監査ログ。
- **メモリポイズニング**: 同一ソース支配 + 命令動詞パターンのヒューリスティック検出。
- **MCP**: すべてのツール入力に zod スキーマバリデーション。変更ツールには `reason`（8 文字以上）が必要で `destructiveHint: true` を表示。上流エラーはクライアント返却前にサニタイズ。
- **ログ**: `content`、`query`、`memory`、`value`、`password`、`secret`、`token`、`key` フィールドの自動リダクション付き構造化 JSON。

脆弱性の開示: [SECURITY.md](SECURITY.md)。

## プロジェクト構造

```text
apps/
  api/                # REST API + Postgres + governance + eval (TypeScript)
  dashboard/          # Next.js 16 ダッシュボード（Basic Auth ミドルウェア付き）
  mcp-server/         # MCP stdio サーバー（レガシー + 公式 SDK トランスポート）
  web/                # サーバーサイド HTML レンダラー（JS なしフォールバック UI）
  website/            # マーケティングサイト（別途管理）
packages/
  shared/             # 共有型、エラー、ID/トークンユーティリティ
  agentmemory-adapter # 上流 agentmemory + バージョンプローブへのブリッジ
  search/             # プラガブル検索プロバイダー（BM25 / ハイブリッド）
  mif/                # Memory Interchange Format（v0.2）
  eval/               # EvalRunner + メトリクスプリミティブ
  governance/         # ステートマシン + リスクスキャン + ポイズニング + 監査
docs/
  i18n/<lang>/        # 17 言語のローカライズ済み README
  integrations/       # 11 エージェント IDE 統合ガイド
  deployment/         # ローカル + Postgres + Docker Compose
  legal/              # プライバシー / 利用規約 / Cookie（シンガポール法）
scripts/
  check-env.mjs       # 本番モード環境変数バリデーション
  smoke-*.mjs         # エンドツーエンドスモークテスト
  apply-postgres-schema.mjs
```

## 要件

- Node.js `>=22`
- pnpm `10.30.1`
- （オプション）セマンティック検索品質のメモリのために Postgres 16 + pgvector

## 貢献

コントリビューションを歓迎します。開発ワークフロー、コミットメッセージプロトコル、レビュー期待値については [CONTRIBUTING.md](CONTRIBUTING.md) をお読みください。

ドキュメント翻訳については [i18n 貢献ガイド](../README.md) を参照してください。

## 運営元

Lore Context は **REDLAND PTE. LTD.**（シンガポール、UEN 202304648K）によって運営されています。会社プロフィール、法的条件、データ取り扱いは [`docs/legal/`](../../legal/) に記載されています。

## ライセンス

Lore Context リポジトリは [Apache License 2.0](../../LICENSE) の下でライセンスされています。`packages/*` 下の個々のパッケージはダウンストリームでの利用を可能にするために MIT を宣言しています。上流の帰属については [NOTICE](../../NOTICE) を参照してください。

## 謝辞

Lore Context はローカルメモリランタイムとして [agentmemory](https://github.com/agentmemory/agentmemory) の上に構築されています。上流のコントラクトの詳細とバージョン互換性ポリシーは [UPSTREAM.md](../../UPSTREAM.md) に記載されています。
