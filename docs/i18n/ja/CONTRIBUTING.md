> 🤖 このドキュメントは英語版から機械翻訳されました。PR による改善を歓迎します — [翻訳貢献ガイド](../README.md)を参照してください。

# Lore Context への貢献

Lore Context の改善にご協力いただきありがとうございます。このプロジェクトはアルファ段階の AI エージェントコンテキストコントロールプレーンです。変更はローカルファースト運用、監査可能性、デプロイの安全性を維持してください。

## 行動規範

このプロジェクトは [Contributor Covenant](../../CODE_OF_CONDUCT.md) に従います。参加することで、それを支持することに同意したことになります。

## 開発セットアップ

要件:

- Node.js 22 以上
- pnpm 10.30.1（`corepack prepare pnpm@10.30.1 --activate`）
- （オプション）Postgres パスの場合は Docker
- （オプション）スキーマを自分で適用する場合は `psql`

共通コマンド:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # requires docker compose up -d postgres
pnpm run doctor
```

パッケージごとの作業:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore-context/server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## プルリクエストへの期待

- **変更を集中させ、可逆にしてください。** PR ごとに 1 つの懸念事項、懸念事項ごとに 1 つの PR。
- **動作変更にはテストを追加してください。** スナップショットより実際のアサーションを優先してください。
- **レビューをリクエストする前に `pnpm build` と `pnpm test` を実行してください。** CI でも実行しますが、ローカルの方が速いです。
- **API、ダッシュボード、MCP、Postgres、インポート/エクスポート、評価、またはデプロイの動作を変更する場合は、関連するスモークテストを実行してください。**
- **生成されたビルド出力、ローカルストア、`.env` ファイル、資格情報、またはプライベートな顧客データをコミットしないでください。** `.gitignore` がほとんどのパスをカバーしています。新しいアーティファクトを作成する場合は、それらが除外されていることを確認してください。
- **PR のスコープ内に留まってください。** 無関係なコードをドライブバイでリファクタリングしないでください。

## アーキテクチャガードレール

これらは v0.4.x では交渉の余地がありません。PR がこれらに違反する場合、分割または修正のリクエストが来ます:

- **ローカルファーストが主要です。** 新機能はホスト型サービスやサードパーティ SaaS 依存なしで動作する必要があります。
- **新しい認証サーフェスバイパスなし。** すべてのルートは API キー + ロールでゲートされたままです。ループバックは本番環境では特別なケースではありません。
- **生の `agentmemory` 露出なし。** 外部呼び出し元は Lore エンドポイントのみを通じてメモリにアクセスします。
- **監査ログの整合性。** メモリの状態に影響するすべての変更が監査エントリを書き込みます。
- **欠落した設定ではフェイルクローズ。** 本番モードの起動は、必要な環境変数がプレースホルダーまたは欠落している場合、開始を拒否します。

## コミットメッセージ

Lore Context は Linux カーネルガイドラインにインスパイアされた小さく独自のコミットフォーマットを使用します。

### フォーマット

```text
<type>: <short summary in imperative mood>

<optional body explaining why this change is needed and what tradeoffs apply>

<optional trailers>
```

### タイプ

- `feat` — 新しいユーザーが見える機能または API エンドポイント
- `fix` — バグ修正
- `refactor` — 動作変更なしのコード再構成
- `chore` — リポジトリの衛生（依存関係、ツール、ファイル移動）
- `docs` — ドキュメントのみ
- `test` — テストのみの変更
- `perf` — 測定可能な影響を持つパフォーマンス改善
- `revert` — 以前のコミットの取り消し

### スタイル

- タイプとサマリーの最初の単語は**小文字**にしてください。
- サマリー行に**末尾ピリオドなし**。
- サマリー行は**72 文字以内**。本文は 80 で折り返します。
- **命令法**: "fix loopback bypass"、"fixed" や "fixes" ではなく。
- **What より Why**: diff が何が変わったかを示します。本文はなぜを説明すべきです。
- ユーザーが明示的に要求しない限り、`Co-Authored-By` トレーラー、AI 帰属、または signed-off-by 行を**含めないでください**。

### 有用なトレーラー

関連する場合は、制約とレビュアーコンテキストを捉えるためにトレーラーを追加します:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### 例

```text
fix: loopback bypass — remove host-header trust, fail closed in production

Previous versions trusted the Host header for loopback detection, allowing a
remote attacker to spoof "Host: 127.0.0.1" and obtain admin role with no API
key when LORE_API_KEYS was unset. Loopback detection now uses
req.socket.remoteAddress only, and production with empty keys returns 401.

Constraint: Local development without keys still works on loopback
Confidence: high
Scope-risk: narrow (auth path only)
Tested: pnpm test (added loopback-bypass test case), pnpm smoke:api
```

## コミットの粒度

- コミットごとに 1 つの論理的な変更。レビュアーは担保損害なしに原子的に元に戻せます。
- PR を開くまたは更新する前に、些細な修正（`typo`、`lint`、`prettier`）を親コミットにスカッシュします。
- 単一の理由を共有する場合、複数ファイルのリファクタリングは 1 つのコミットで問題ありません。

## レビュープロセス

- メンテナーは通常のアクティビティ期間中、7 日以内に PR をレビューします。
- レビューを再リクエストする前に、すべてのブロッキングコメントに対応してください。
- 非ブロッキングコメントについては、インラインで根拠を返信するか、フォローアップイシューが許容されます。
- メンテナーは PR が承認されると `merge-queue` ラベルを追加する場合があります。そのラベルが適用された後はリベースや強制プッシュをしないでください。

## ドキュメント翻訳

翻訳された README やドキュメントファイルを改善したい場合は、[i18n 貢献ガイド](../README.md)を参照してください。

## バグの報告

- セキュリティ脆弱性でない限り、https://github.com/Lore-Context/lore-context/issues でパブリックイシューを提出してください。
- セキュリティ問題については [SECURITY.md](SECURITY.md) に従ってください。
- 含める内容: バージョンまたはコミット、環境、再現手順、期待された動作と実際の動作、ログ（センシティブなコンテンツをリダクト済み）。

## 謝辞

Lore Context は AI エージェントインフラのために有用なことをしようとしている小さなプロジェクトです。スコープの絞られた PR のすべてが前進させます。
