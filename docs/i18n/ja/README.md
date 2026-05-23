<div align="center">

# Lore Context

**AIエージェントメモリ、評価、ガバナンスのコントロールプレーン。**

すべてのエージェントが何を記憶し、使用し、忘れるべきかを、メモリが本番リスクになる前に把握する。

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[はじめに](../../getting-started.md) · [ウェブサイトクイックスタート](https://lorecontext.com/quickstart/) · [ベンチマーク方法論](https://lorecontext.com/benchmark/) · [APIリファレンス](../../api-reference.md) · [アーキテクチャ](../../architecture.md) · [プロジェクト計画](../../project-plan.md) · [リリース状況](../../release-status.md) · [ロードマップ](../../roadmap.md) · [インテグレーション](../../integrations/README.md) · [デプロイメント](../../deployment/README.md) · [変更履歴](../../../CHANGELOG.md)

🌐 **他の言語で読む**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

ローカライズされたドキュメントは現在の英語リリースノートより遅れる場合があります。正規のv2.1ドキュメントは英語のREADMEおよび`docs/`セットです。

</div>

---

> このドキュメントは英語原文から機械翻訳されており、最新リリースより遅れる場合があります。翻訳の改善はPRで歓迎します。翻訳コントリビューターガイドは[../README.md](../README.md)をご参照ください。

## Lore Context とは

Lore Context は**オープンコアのコントロールプレーン**であり、AIエージェントメモリを管理します。メモリ、検索、リポジトリグラフ、ツールトレースにまたがってコンテキストを合成し、独自データセットで検索品質を評価し、機密コンテンツのガバナンスレビューをルーティングし、バックエンド間で移動可能なポータブル交換フォーマットとしてメモリをエクスポートします。

別のメモリデータベースを目指しているわけではありません。固有の価値はメモリの上位層にあります。

- **Context Query** — 単一エンドポイントでメモリ＋ウェブ＋リポジトリ＋ツールトレースを合成し、出典付きのグレード付きコンテキストブロックを返します。
- **Memory Eval** — 独自データセットでRecall@K、Precision@K、MRR、stale-hit-rate、p95レイテンシを実行し、回帰検出のためにランを永続化して差分比較します。
- **Governance Review** — 六状態ライフサイクル（`candidate / active / flagged / redacted / superseded / deleted`）、リスクタグスキャン、ポイズニングヒューリスティクス、不変の監査ログ。
- **MIF的ポータビリティ** — `provenance / validity / confidence / source_refs / supersedes / contradicts`を保持したJSON＋Markdownエクスポート/インポート。メモリバックエンド間の移行フォーマットとして機能します。
- **Repo Graph** — 決定論的リポジトリインデックス（ファイル、シンボル、インポート、コール、ルート、テスト）をAPIルートと読み取り専用MCPツールとして公開し、エージェントがリポジトリへの回答を安定したプロジェクトコンテキストコントラクトに基づかせます。
- **Multi-Agent Adapter** — バージョンプローブ＋デグレードモードフォールバックを備えた`agentmemory`ファーストクラス統合と、追加ランタイム向けのクリーンなアダプターコントラクト。

## 使用シーン

| Lore Context を使う場合... | メモリデータベース (agentmemory, Mem0, Supermemory) を使う場合... |
|---|---|
| エージェントが何を記憶し、なぜ、それが使用されたかを**証明**する必要がある | 生のメモリストレージだけが必要 |
| 複数のエージェント（Claude Code、Cursor、Qwen、Hermes、Dify）を動かしており、信頼できる共有コンテキストが必要 | 単一エージェントを構築しており、ベンダーロックのメモリ層で問題ない |
| コンプライアンスのためにローカルまたはプライベートデプロイが必要 | ホステッドSaaSを好む |
| ベンダーベンチマークではなく独自データセットで評価が必要 | ベンダーベンチマークで十分 |
| システム間でメモリを移行したい | バックエンドを切り替える予定がない |

## クイックスタート

```bash
# 1. クローン + インストール
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. クイックスタートヘルパーを実行し、アクティベーションレポートを確認
pnpm quickstart -- --dry-run --activation-report

# 3. 実際のAPIキーを生成（ローカルのみの開発環境以外ではプレースホルダーを使用しないこと）
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. APIを起動（ファイルバック、Postgres不要）
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. メモリを書き込む
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. コンテキストをクエリし、返されたtraceIdをEvidence Ledgerで確認
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

公開ウェブサイトのクイックスタートについては[lorecontext.com/quickstart](https://lorecontext.com/quickstart/)をご覧ください。フルセットアップ（Postgres、Docker Compose、Dashboard、MCP統合）については[docs/getting-started.md](../../getting-started.md)をご覧ください。

正規のアルファクイックスタートは`git clone` + `pnpm quickstart`です。Loreは現在、公開の`@lore-context/quickstart` npmパッケージの公開や主張を行っていません。MCP stdioサーバーはレジストリとクライアント配布用に別途[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)として公開されており、SDKミドルウェアは[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)（npm）と`lore-context-middleware`（PyPI）として提供されています。

AIが読める形での発見のため、ウェブサイトは公開ドキュメントのみから`/llms.txt`と`/llms-full.txt`を公開しています。公式MCPレジストリエントリが公開されており、追加の配布ドラフトは[docs/distribution](../../distribution/)に、ローンチドラフトは[docs/launch](../../launch/)に、デザインパートナー受付は[docs/design-partners](../../design-partners/)にあります。公開ベンチマークページは再現可能な方法論と小規模スモークランレポートであり、競合他社との比較ベンチマーク勝利の主張ではありません。

## アーキテクチャ

```text
                       ┌───────────────────────────────────────────────┐
  MCP/REST clients ─► │ apps/api  (auth + rate limit + evidence)       │
  (Claude Code,       │   ├── Memory Inbox / lifecycle / audit         │
   Codex, Cursor,     │   ├── capture ingestion + recall hydration     │
   OpenCode...)       │   ├── context query (memory/web/repo/traces)   │
                       │   ├── repo graph query / symbol / impact       │
                       │   ├── Google sign-in + hosted MCP metadata     │
                       │   └── OpenAPI + usage + operator surfaces      │
                       └───────────────┬───────────────────────────────┘
                                       │
                         capture / embedding / graph jobs
                                       ▼
                       ┌───────────────────────────────────────────────┐
                       │ memory-worker  (AWS SQS + DLQ fan-out)        │
                       │   ├── auto redaction / curation / save        │
                       │   ├── dreaming butler (prune/merge/resolve)    │
                       │   ├── private Qwen3 embedding service         │
                       │   └── Qdrant dense+sparse indexing            │
                       └───────────────┬───────────────────────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
          RDS PostgreSQL 16      Qdrant derived index   apps/dashboard
          truth store + audit    lore_memories_v12      user-facing SaaS
```

詳細については[docs/architecture.md](../../architecture.md)をご覧ください。

## v2.1.0 の内容

`v2.1.0`は**Repo Graph APIとMCPツール**のリリースです。Lore独自のリポジトリグラフをファーストクラスのエージェントメモリサーフェスにします。ファイル、シンボル、インポート、コール、ルート、テスト、プロセスヒントの決定論的なTypeScript/JavaScriptリポジトリインデックスを、APIルートと読み取り専用MCPツールを通じて公開し、エージェントがリポジトリへの回答をアドホックなテキスト検索ではなく安定したプロジェクトコンテキストコントラクトに基づかせます。

v2.1.0はAWS本番環境と公開ウェブサイトにデプロイされています。ハイブリッドメモリエンジン（RDSトゥルースストア、AWS SQSワーカーファンアウト、Qdrant派生インデックス、プライベートQwen3埋め込みサービス、7ストリーム`HybridSearchOrchestrator`）、ドリーミングバトラーメモリ統合ワーカー、エージェントメモリ自己改善ループ、公開SDKミドルウェアパッケージ、およびv1.7〜v2.0ラインでリリースされた商用SaaSサブストレートの上に構築されています。

| 機能 | 状態 | 場所 |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ 本番 | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| コードナレッジグラフインデクサー | ✅ 本番 | `packages/code-indexer`, `packages/code-indexer-python` |
| メモリ＋ウェブ＋リポジトリ＋ツールトレースを合成するContext Query | ✅ 本番 | `apps/api`, `docs/api-reference.md` |
| 7ストリーム`HybridSearchOrchestrator`（FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki） | ✅ 本番 | `packages/search` |
| クロスエンコーダーリランカー（ポストフュージョン、オプトイン） | ✅ 本番 | `apps/api/src/rerankers/` |
| ドリーミングバトラーメモリ統合（prune / merge / resolve / surface） | ✅ 本番、フラグゲート | `apps/api/src/workers/butler-v18.ts` |
| エージェントメモリ自己改善ループ＋コンテキストレシピ | ✅ 本番、人間ゲートによる昇格 | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| SDKミドルウェア（OpenAI / Anthropicクライアント向け自動インジェクト＋自動リテイン） | ✅ 公開済み | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| AIエージェント向けシークレットボールト（MCPネイティブ、3ボタン認証） | ✅ ベータ、暗号監査待ち | `apps/mcp-server`, `apps/api` |
| クラウドメモリエンジン: RDSトゥルースストア＋SQSワーカーファンアウト＋Qdrantインデックス | ✅ 本番 | `apps/api`, `apps/api/src/worker.ts` |
| プライベートQwen3-Embedding-0.6B 1024次元ベクターサービス | ✅ 本番 | `apps/api/src/embedding.ts` |
| 自動キャプチャ取り込みとMemory Inbox例外 | ✅ 本番 | `apps/api`, `packages/capture` |
| Googleサインイン＋個人ボールトブートストラップ | ✅ 本番 | `apps/api`, `apps/dashboard` |
| 商用SaaS: 個人サブスクリプション、課金、クォータゲーティング | ✅ 本番 | ホステッドクラウド（`Lore-Context/lore-cloud`） |
| APIキー認証付きREST API（reader/writer/admin） | ✅ 本番 | `apps/api` |
| `/openapi.json`のOpenAPI 3.1コントラクト（`2.1.0`を報告） | ✅ 本番 | `apps/api/src/openapi.ts` |
| MCP stdioサーバー（レガシー＋公式SDKトランスポート） | ✅ 本番 | `apps/mcp-server` |
| Googleセッション＋オペレーターBasic Auth付きNext.jsダッシュボード | ✅ 本番 | `apps/dashboard` |
| Evidence Ledger API＋ダッシュボードサマリー | ✅ 本番 | `apps/api`, `apps/dashboard` |
| ガバナンスステートマシン＋監査ログ | ✅ 本番 | `packages/governance` |
| Evalランナー（Recall@K / Precision@K / MRR / staleHit / p95） | ✅ 本番 | `packages/eval` |
| `supersedes`＋`contradicts`付きMIF v0.2インポート/エクスポート | ✅ 本番 | `packages/mif` |
| モデルゲートウェイ（マルチプロバイダーtask→modelルーティング） | ✅ 本番 | `packages/model-gateway` |
| バージョンプローブ＋デグレードモード付き`agentmemory`アダプター | ✅ 本番 | `packages/agentmemory-adapter` |
| レート制限、フィールドリダクション付き構造化JSONログ | ✅ 本番 | `apps/api` |
| Docker Composeプライベートデプロイメント | ✅ 本番 | `docker-compose.yml` |
| `pnpm quickstart`ローカル採用ヘルパー＋アクティベーションレポート | ✅ 本番 | `scripts/lore-quickstart.mjs` |
| 公式MCPレジストリ＋配布/ローンチ/デザインパートナードキュメント | ✅ 本番 | `server.json`, `docs/distribution/`, `docs/launch/` |

完全なリリース履歴については[CHANGELOG.md](../../../CHANGELOG.md)をご覧ください。

## 現在のリリース状態

`v2.1.0`は現在のソース、ホステッド本番、リリースラインです。最適化されたリリースフロー（不変のarm64ファーストアーティファクト、ステージングAPIスモーク、本番APIデプロイ、独立したウェブサイトデプロイ、リリース後監査、タグ/リリースクロージャー）を通じてAWS本番環境と公開ウェブサイトにデプロイされました。外部チェックにより、`https://api.lorecontext.com/health`が`status=ok`を返し、`/openapi.json`が`2.1.0`を報告し、`https://lorecontext.com/status.html`に`v2.1.0`が含まれることが確認されています。

本番環境はv1.1+のRDS / SQS / memory-worker / Qdrantクラウド形状を維持し、Qdrantコレクションとして`lore_memories_v12`を使用し、Postgresパスに1024次元pgvectorを維持し、付加的なリポジトリグラフスキーマ（`apps/api/src/db/schema-v21-repo-graph.sql`）を追加しています。

現在の公開安全なステータススナップショットについては[docs/release-status.md](../../release-status.md)を、完全なリリースノートについては[docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)をご覧ください。

## リリースの焦点

v2.1リリースはLoreのリポジトリグラフをファーストクラスのエージェントメモリサーフェスにします。目的は、エージェントがアドホックなテキスト検索ではなく、決定論的で安定したプロジェクトコンテキストコントラクトに対して「Xはどこで定義されているか」「何がこれを呼び出しているか」「これを変更すると何が壊れるか」に答えられるようにすることです。

- `@lore/repo-graph` — ファイル、シンボル、インポート、コール、ルート、テスト、プロセスヒントの決定論的TypeScript/JavaScriptリポジトリインデックス。
- APIルート: `POST /v1/repo/graph/query`、`POST /v1/repo/symbol/context`、`POST /v1/repo/impact`、`POST /v1/repo/detect-changes`。
- MCPツール: `repo.graph_query`、`repo.symbol_context`、`repo.impact`、`repo.detect_changes`（読み取り専用）。
- `context_query(repo)`は利用可能な場合にプロバイダーバックアップのリポジトリグラフエビデンスを使用し、リポジトリグラフストレージが設定されていない場合は正直な利用不可フォールバックを提供します。
- リポジトリグラフPostgresスキーマは付加的であり、既存の本番スキーマの上に位置し、本番/ステージングスキーマセットアップ時に適用されます。

ルートおよびAPIパッケージバージョンは`2.1.0`を報告するため、`/openapi.json`はリリースタグと一致します。リリーストレインはv2.0.9後に導入された最適化された分割API/ウェブサイトデプロイメントガードレールを使用します。

[docs/project-plan.md](../../project-plan.md)、[docs/roadmap.md](../../roadmap.md)、[docs/release-governance.md](../../release-governance.md)をご覧ください。

## インテグレーション

Lore Context はMCPとRESTを話し、ほとんどのエージェントIDEとチャットフロントエンドと統合します。

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
| その他 / 汎用MCP | [docs/integrations/README.md](../../integrations/README.md) |

## デプロイメント

| モード | 使用場面 | ドキュメント |
|---|---|---|
| **ローカルファイルバック** | ソロ開発、プロトタイプ、スモークテスト | このREADME、上記のクイックスタート |
| **ローカルPostgres+pgvector** | シングルノードローカルフォールバックと移行テスト | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Composeプライベート** | セルフホステッドチームデプロイメント、独立ネットワーク | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **ホステッドクラウド** | RDS / SQS / memory-worker / Qdrant / プライベート埋め込みに加えてグラフ拡張ハイブリッドリコールスタックと商用SaaSサブストレート | [docs/release-status.md](../../release-status.md) |

すべてのデプロイメントパスは明示的なシークレットを必要とします。ローカル/プライベートパスは`POSTGRES_PASSWORD`、`LORE_API_KEYS`、ダッシュボード認証が必要です。ホステッドデプロイメントにはさらにRDS、SQS、Qdrant、埋め込みサービス、OAuth、トンネル設定、および本番ランタイムエクスポートが必要です。`scripts/check-env.mjs`スクリプトは、いずれかの値がプレースホルダーパターンに一致する場合、本番起動を拒否します。

## セキュリティ

v2.1.0は通常ユーザーアクセスのためのローカル/プライベートデプロイメント姿勢とホステッドクラウドガードレールを維持します。

- **認証**: ロール分離（`reader`/`writer`/`admin`）とプロジェクトスコーピングを備えたAPIキーベアラートークン。空のキーモードは本番環境でフェイルクローズ。
- **レート制限**: 認証失敗バックオフ付きのIPごと＋キーごとのデュアルバケット（60秒で5回失敗後429、30秒ロックアウト）。
- **ダッシュボード**: ホステッド製品のGoogleセッションフロー；ローカル/プライベートオペレーターデプロイメントにはHTTP Basic Authも利用可能。
- **コンテナ**: すべてのDockerfileが非rootの`node`ユーザーとして実行；api＋dashboardでHEALTHCHECK。
- **シークレット**: ハードコードされた認証情報はゼロ；すべてのデフォルトは必須または失敗変数。`scripts/check-env.mjs`は本番でプレースホルダー値を拒否。
- **ガバナンス**: 書き込み時にPII / APIキー / JWT / 秘密鍵の正規表現スキャン；リスクタグ付きコンテンツは自動的にレビューキューにルーティング；すべての状態遷移で不変の監査ログ。
- **メモリポイズニング**: コンセンサス＋命令動詞パターンのヒューリスティック検出。
- **MCP**: すべてのツール入力でzodスキーマ検証；変更ツールは`reason`（8文字以上）を要求し`destructiveHint: true`を表面化；アップストリームエラーはクライアント返却前にサニタイズ。
- **ワーカー分離**: キャプチャ、埋め込み、グラフ、コネクター、バックフィルジョブはDLQ付きのAWS SQSキューを通じて実行；QdrantはRDSを権威として派生インデックス。
- **ログ**: `content`、`query`、`memory`、`value`、`password`、`secret`、`token`、`key`フィールドの自動リダクション付き構造化JSON。

脆弱性の開示: [SECURITY.md](../../../SECURITY.md)。

## プロジェクト構造

```text
apps/
  api/                # REST コントロールプレーン + Postgres + ガバナンス + eval + リポグラフ
  dashboard/          # Googleセッション + オペレーターBasic Auth付きNext.jsダッシュボード
  mcp-server/         # MCP stdioサーバー（レガシー + 公式SDKトランスポート）
  cli/                # lore CLI（doctor、wiki-recompile、データセットインポート/エクスポート）
  browser-extension/  # キャプチャサーフェススキャフォールド
  web/                # サーバーサイドHTMLレンダラー（no-JSフォールバックUI）
  website/            # マーケティングサイト（個別管理）
packages/
  shared/             # 共有型、エラー、ID/トークンユーティリティ
  agentmemory-adapter # アップストリームagentmemory + バージョンプローブへのブリッジ
  search/             # 7ストリームHybridSearchOrchestrator + レシピアダプター
  repo-graph/         # 決定論的リポジトリインデックス（v2.1）
  code-indexer/       # コードナレッジグラフインデクサー（TypeScript/JavaScript）
  code-indexer-python # コードナレッジグラフインデクサー（Python）
  capture/            # キャプチャ取り込みプリミティブ
  connectors/         # 外部ソースコネクター
  model-gateway/      # マルチプロバイダーtask→modelルーティング
  mif/                # Memory Interchange Format（v0.2）
  eval/               # EvalRunner + メトリックプリミティブ + コンテキストレシピ
  governance/         # ステートマシン + リスクスキャン + ポイズニング + 監査
  profile/            # ボールト / アカウントプロファイル型
  sdk-typescript/     # TypeScriptクライアントSDK
  sdk-python/         # PythonクライアントSDK
  sdk-go/ sdk-java/ sdk-dotnet/   # 追加言語SDK
  sdk-middleware-typescript/      # 自動インジェクト + 自動リテインミドルウェア（npm）
  sdk-middleware-python/          # 自動インジェクト + 自動リテインミドルウェア（PyPI）
docs/
  i18n/<lang>/        # 17言語のローカライズREADME
  integrations/       # エージェントIDE統合ガイド
  deployment/         # ローカル、Docker Compose、本番自動化ランブック
  legal/              # プライバシー / 利用規約 / Cookie（シンガポール法）
scripts/
  check-env.mjs       # 本番モード環境バリデーション
  smoke-*.mjs         # エンドツーエンドスモークテスト
  apply-postgres-schema.mjs
```

## 要件

- Node.js `>=22`
- pnpm `10.30.1`
- （オプションのローカルフォールバック）pgvector付きPostgres 16
- （ホステッド/高度）RDS PostgreSQL 16、AWS SQS、Qdrant、プライベート埋め込みサービス

## コントリビューション

コントリビューションを歓迎します。開発ワークフロー、コミットメッセージプロトコル、レビュー期待値については[CONTRIBUTING.md](../../../CONTRIBUTING.md)をお読みください。

ドキュメント翻訳については[i18nコントリビューターガイド](../README.md)をご覧ください。

## 運営元

Lore Context は **REDLAND PTE. LTD.**（シンガポール、UEN 202304648K）が運営しています。会社プロファイル、法的条件、データ取り扱いは[`docs/legal/`](../../legal/)に記載されています。

## ライセンス

Lore Context リポジトリは[Apache License 2.0](../../../LICENSE)の下でライセンスされています。`packages/*`下の個々のパッケージはダウンストリームでの利用を可能にするためにMITを宣言しています。アップストリームの帰属については[NOTICE](../../../NOTICE)をご覧ください。

## 謝辞

Lore Context はローカルメモリランタイムとして[agentmemory](https://github.com/agentmemory/agentmemory)の上に構築されています。アップストリームコントラクトの詳細とバージョン互換性ポリシーは[UPSTREAM.md](../../../UPSTREAM.md)に記載されています。
