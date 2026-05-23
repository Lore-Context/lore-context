# Lore v2.0.7 SDK Matrix

This matrix separates first-party API clients, SDK middleware, code-indexer tooling, and MCP surfaces so developers can choose the smallest supported integration path.

| Surface | Package | Language | Maturity | Install | Providers / runtime | Release channel | Verification |
|---|---|---|---|---|---|---|---|
| API SDK | `@lore-context/sdk` | TypeScript | stable generated client | `pnpm add @lore-context/sdk` | Fetch-compatible Node 22+ / browser runtimes | npm `latest`, current `0.1.5` | `pnpm --filter @lore-context/sdk test` |
| API SDK | `lore-context` | Python | stable generated client | `pip install lore-context` | Python 3.8+ with `httpx` | PyPI, current `0.1.0` | `python3 -m pytest packages/sdk-python/tests` |
| API SDK | `github.com/lore-context/lore-context-go-sdk` | Go | v2.0.7 beta client | `go get github.com/lore-context/lore-context-go-sdk` | Go 1.22+ `net/http` | source build / dry-run only | `cd packages/sdk-go && go test ./...` |
| API SDK | `dev.lorecontext:lore-context-sdk` | Java/JVM | v2.0.7 beta client | Maven/Gradle metadata in `packages/sdk-java` | Java 17+ `java.net.http`; Kotlin can consume Java client | dry-run only | `cd packages/sdk-java && ./gradlew test` |
| API SDK | `LoreContext.Sdk` | .NET/C# | v2.0.7 source preview | `dotnet add package LoreContext.Sdk` after human-gated NuGet publish | .NET 8+ `HttpClient` | dry-run only; local toolchain may be absent | `dotnet test packages/sdk-dotnet/LoreContext.Sdk.sln` |
| Middleware | `@lore-context/sdk-middleware` | TypeScript | stable `0.1.0` | `pnpm add @lore-context/sdk-middleware @lore-context/sdk openai` | OpenAI, Anthropic, OpenRouter-compatible clients | npm `latest` | `pnpm --filter @lore-context/sdk-middleware test` |
| Middleware | `lore-context-middleware` | Python | stable `0.1.0` | `pip install lore-context-middleware lore-context openai` | OpenAI and Anthropic Python SDKs | PyPI `latest` | package pytest suite when present |
| Code graph | `@lore-context/code-indexer` | TypeScript CLI | stable `0.1.0` | `pnpm add -D @lore-context/code-indexer` | Tree-sitter TypeScript/Python/Go | npm `latest` | `pnpm --filter @lore-context/code-indexer test` |
| Code graph | `lore-context-code-indexer` | Python CLI | stable `0.1.0` | `pip install lore-context-code-indexer` | Tree-sitter TypeScript/Python/Go | PyPI `latest` | package pytest suite when present |
| Agent tools | Lore MCP server | MCP clients | stable server surface | configure the hosted/local MCP endpoint | Claude Code, Cursor, Codex/OpenCode-compatible MCP clients | app/server release train | hosted MCP smoke checks |

## Language deferrals

| Language / framework | v2.0.7 status | Developer fallback | Decision trigger to promote |
|---|---|---|---|
| Ruby / Rails | deferred | REST/cURL recipe in [REST fallback](./rest-curl-quickstart.md) | Rails customer or partner pipeline demand |
| PHP / Laravel | deferred | REST/cURL recipe in [REST fallback](./rest-curl-quickstart.md) | Laravel customer or partner pipeline demand |
| Rust | deferred | REST/cURL recipe plus generated OpenAPI clients outside first-party support | local-agent binary or privacy-first packaging demand |
| Swift | deferred | REST/cURL until mobile key-management and consent model exist | iOS product surface committed |
| Kotlin mobile | deferred | JVM client is server-side only; do not ship mobile artifact yet | Android key-management and consent model committed |
| Dart / Flutter | deferred | REST/cURL until mobile consent model exists | Flutter app/customer demand |

## Release constraints

- v2.0.7 SDK work is dry-run only for package publication. No npm, PyPI, Maven Central, NuGet, git tag, or production deploy is allowed from unattended team work.
- Go, JVM, and .NET clients are API-client-first. Provider-wrapping middleware for those languages is intentionally deferred until adoption evidence exists.
- Go planned SDK publish policy is explicitly dry-run only. Build and release dry-run only; no live module publish without a human gate.
- Java planned SDK publish policy is explicitly dry-run only. Build and release dry-run only; no Maven Central publish without a human gate.
- .NET planned SDK publish policy is explicitly dry-run only. Build and release dry-run only; no NuGet publish without a human gate.
- Generated SDK outputs are sourced from `fern/openapi/openapi.yaml`; hand-authored examples must compile without live Lore credentials.
