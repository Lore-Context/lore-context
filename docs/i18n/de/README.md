<div align="center">

# Lore Context

**Die Steuerungsebene für KI-Agenten-Speicher, Evaluierung und Governance.**

Wissen Sie, was jeder Agent gespeichert, verwendet und vergessen sollte — bevor der Speicher zum Produktionsrisiko wird.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Erste Schritte](../../getting-started.md) · [Website-Schnellstart](https://lorecontext.com/quickstart/) · [Benchmark-Methodik](https://lorecontext.com/benchmark/) · [API-Referenz](../../api-reference.md) · [Architektur](../../architecture.md) · [Projektplan](../../project-plan.md) · [Versionsstatus](../../release-status.md) · [Roadmap](../../roadmap.md) · [Integrationen](../../integrations/README.md) · [Deployment](../../deployment/README.md) · [Änderungsprotokoll](../../../CHANGELOG.md)

🌐 **In Ihrer Sprache lesen**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

Lokalisierte Dokumente können hinter den aktuellen englischen Versionshinweisen zurückliegen; die kanonischen v2.1-Dokumente sind das englische README und das `docs/`-Set.

</div>

---

> Dieses Dokument ist eine maschinelle Übersetzung aus dem Englischen, kann gegenüber der neuesten Version zurückliegen, und PRs sind willkommen — siehe den [Leitfaden für Übersetzungsmitwirkende](../README.md).

## Was ist Lore Context

Lore Context ist eine **Open-Core-Steuerungsebene** für KI-Agenten-Speicher: Sie kombiniert Kontext aus Speicher, Suche, Repository-Graphen und Tool-Traces; bewertet die Abrufqualität auf Ihren eigenen Datensätzen; leitet Governance-Reviews für sensible Inhalte weiter; und exportiert Speicher als portables Austauschformat, das Sie zwischen Backends verschieben können.

Es versucht nicht, eine weitere Speicherdatenbank zu sein. Der einzigartige Wert liegt in dem, was über dem Speicher liegt:

- **Context Query** — ein einzelner Endpunkt kombiniert Speicher + Web + Repository + Tool-Traces und gibt einen bewerteten Kontextblock mit Herkunft zurück.
- **Memory Eval** — führt Recall@K, Precision@K, MRR, Stale-Hit-Rate, p95-Latenz auf Datensätzen durch, die Sie besitzen; persistiert Läufe und vergleicht sie zur Regressionserkennung.
- **Governance Review** — sechsstufiger Lebenszyklus (`candidate / active / flagged / redacted / superseded / deleted`), Risikotagging-Scan, Vergiftungsheuristiken, unveränderliches Prüfprotokoll.
- **MIF-ähnliche Portabilität** — JSON + Markdown Export/Import mit Beibehaltung von `provenance / validity / confidence / source_refs / supersedes / contradicts`. Funktioniert als Migrationsformat zwischen Speicher-Backends.
- **Repo Graph** — deterministisches Repository-Indexing (Dateien, Symbole, Importe, Aufrufe, Routen, Tests) als API-Routen und schreibgeschützte MCP-Tools, damit Agenten Repository-Antworten auf einen stabilen Projektkontextvertrag stützen.
- **Multi-Agent Adapter** — erstklassige `agentmemory`-Integration mit Versions-Probe + Fallback im Degraded-Modus; sauberer Adaptervertrag für weitere Runtimes.

## Wann verwenden

| Verwenden Sie Lore Context wenn... | Verwenden Sie eine Speicherdatenbank (agentmemory, Mem0, Supermemory) wenn... |
|---|---|
| Sie **beweisen** müssen, was Ihr Agent gespeichert hat, warum, und ob es verwendet wurde | Sie nur rohen Speicher benötigen |
| Sie mehrere Agenten (Claude Code, Cursor, Qwen, Hermes, Dify) betreiben und gemeinsam vertrauenswürdigen Kontext wünschen | Sie einen einzelnen Agenten aufbauen und mit einer anbieterspezifischen Speicherebene einverstanden sind |
| Sie eine lokale oder private Bereitstellung für Compliance benötigen | Sie einen gehosteten SaaS bevorzugen |
| Sie Evaluierungen auf Ihren eigenen Datensätzen benötigen, nicht auf Anbieter-Benchmarks | Anbieter-Benchmarks ausreichend sind |
| Sie Speicher zwischen Systemen migrieren möchten | Sie nie planen, Backends zu wechseln |

## Schnellstart

```bash
# 1. Klonen + installieren
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Den Schnellstart-Assistenten ausführen und den Aktivierungsbericht prüfen
pnpm quickstart -- --dry-run --activation-report

# 3. Einen echten API-Schlüssel generieren (keine Platzhalter in anderen als rein lokalen Entwicklungsumgebungen verwenden)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. Die API starten (dateibasiert, kein Postgres erforderlich)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Eine Erinnerung schreiben
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Kontext abfragen und dann die zurückgegebene traceId im Evidence Ledger prüfen
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Für den öffentlichen Website-Schnellstart siehe
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). Für die
vollständige Einrichtung (Postgres, Docker Compose, Dashboard, MCP-Integration) siehe
[docs/getting-started.md](../../getting-started.md).

Der kanonische Alpha-Schnellstart ist `git clone` + `pnpm quickstart`. Lore
veröffentlicht derzeit kein öffentliches npm-Paket `@lore-context/quickstart`.
Der MCP-stdio-Server wird separat als
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
für die Registry- und Client-Distribution veröffentlicht, und das SDK-Middleware
wird als
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) und `lore-context-middleware` (PyPI) geliefert.

Für KI-lesbare Entdeckbarkeit veröffentlicht die Website `/llms.txt` und `/llms-full.txt`
ausschließlich aus öffentlicher Dokumentation. Der Eintrag im offiziellen MCP-Registry ist
veröffentlicht, und weitere Verteilungsentwürfe befinden sich unter [docs/distribution](../../distribution/).
Launch-Entwürfe liegen unter [docs/launch](../../launch/), und Design-Partner-Aufnahme
unter [docs/design-partners](../../design-partners/). Die öffentliche Benchmark-Seite ist
eine reproduzierbare Methodik und ein kleiner Smoke-Run-Bericht, keine wettbewerbsfähige
Benchmark-Sieg-Behauptung.

## Architektur

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

Weitere Details unter [docs/architecture.md](../../architecture.md).

## Neuerungen in v2.1.0

`v2.1.0` ist die **Repo Graph API und MCP Tools**-Version. Sie macht Lores eigenen
Repository-Graphen zu einer erstklassigen Agenten-Speicheroberfläche: deterministisches
TypeScript/JavaScript-Repository-Indexing für Dateien, Symbole, Importe, Aufrufe,
Routen, Tests und Prozesshinweise, das über API-Routen und schreibgeschützte MCP-Tools
bereitgestellt wird, damit Agenten Repository-Antworten auf einen stabilen
Projektkontextvertrag stützen statt auf Ad-hoc-Textsuche.

v2.1.0 ist in der AWS-Produktion und auf der öffentlichen Website bereitgestellt. Es baut
auf der hybriden Speicher-Engine auf (RDS als Wahrheitsspeicher, AWS SQS Worker Fan-out,
abgeleiteter Qdrant-Index, privater Qwen3-Embedding-Service, 7-Stream
`HybridSearchOrchestrator`), dem Dreaming-Butler-Speicherkonsolidierungs-Worker, der
Agent-Memory-Selbstverbesserungsschleife, den veröffentlichten SDK-Middleware-Paketen und
dem kommerziellen SaaS-Substrat, das über die v1.7–v2.0-Linie geliefert wurde.

| Fähigkeit | Status | Ort |
|---|---|---|
| Repo-Graph-API + MCP-Tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Produktion | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Code-Wissensgraph-Indexer | ✅ Produktion | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query kombiniert Speicher + Web + Repository + Tool-Traces | ✅ Produktion | `apps/api`, `docs/api-reference.md` |
| 7-Stream `HybridSearchOrchestrator` (FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki) | ✅ Produktion | `packages/search` |
| Cross-Encoder-Reranker (Post-Fusion, opt-in) | ✅ Produktion | `apps/api/src/rerankers/` |
| Dreaming-Butler-Speicherkonsolidierung (beschneiden / zusammenführen / auflösen / aufdecken) | ✅ Produktion, flag-gesteuert | `apps/api/src/workers/butler-v18.ts` |
| Agenten-Speicher-Selbstverbesserungsschleife + Kontextrezepte | ✅ Produktion, menschlich gesteuerter Aufstieg | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| SDK-Middleware (Auto-Inject + Auto-Retain für OpenAI / Anthropic-Clients) | ✅ Veröffentlicht | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Geheimtresor für KI-Agenten (MCP-nativ, Drei-Schaltflächen-Autorisierung) | ✅ Beta, Krypto-Audit ausstehend | `apps/mcp-server`, `apps/api` |
| Cloud-Speicher-Engine: RDS-Wahrheitsspeicher + SQS-Worker-Fan-out + Qdrant-Index | ✅ Produktion | `apps/api`, `apps/api/src/worker.ts` |
| Privater Qwen3-Embedding-0.6B 1024-dim Vektorservice | ✅ Produktion | `apps/api/src/embedding.ts` |
| Automatische Capture-Einspeisung und Memory-Inbox-Ausnahmen | ✅ Produktion | `apps/api`, `packages/capture` |
| Google-Anmeldung + persönlicher Tresor-Bootstrap | ✅ Produktion | `apps/api`, `apps/dashboard` |
| Kommerzieller SaaS: Einzelabonnements, Abrechnung, Kontingentsteuerung | ✅ Produktion | gehostete Cloud (`Lore-Context/lore-cloud`) |
| REST-API mit API-Schlüssel-Authentifizierung (reader/writer/admin) | ✅ Produktion | `apps/api` |
| OpenAPI 3.1-Vertrag unter `/openapi.json` (meldet `2.1.0`) | ✅ Produktion | `apps/api/src/openapi.ts` |
| MCP-stdio-Server (Legacy + offizieller SDK-Transport) | ✅ Produktion | `apps/mcp-server` |
| Next.js-Dashboard mit Google-Session + HTTP-Basic-Auth für Betreiber | ✅ Produktion | `apps/dashboard` |
| Evidence-Ledger-API + Dashboard-Zusammenfassung | ✅ Produktion | `apps/api`, `apps/dashboard` |
| Governance-Zustandsautomat + Prüfprotokoll | ✅ Produktion | `packages/governance` |
| Eval-Runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Produktion | `packages/eval` |
| MIF v0.2 Import/Export mit `supersedes` + `contradicts` | ✅ Produktion | `packages/mif` |
| Modell-Gateway (Multi-Provider Aufgabe→Modell-Routing) | ✅ Produktion | `packages/model-gateway` |
| `agentmemory`-Adapter mit Versions-Probe + Degraded-Modus | ✅ Produktion | `packages/agentmemory-adapter` |
| Rate-Limiting, strukturiertes JSON-Logging mit Feldmaskierung | ✅ Produktion | `apps/api` |
| Docker-Compose-Privatbereitstellung | ✅ Produktion | `docker-compose.yml` |
| `pnpm quickstart` lokaler Adoptionsassistent + Aktivierungsbericht | ✅ Produktion | `scripts/lore-quickstart.mjs` |
| Offizielles MCP-Registry + Distributions- / Launch- / Design-Partner-Dokumente | ✅ Produktion | `server.json`, `docs/distribution/`, `docs/launch/` |

Die vollständige Versionsgeschichte finden Sie in [CHANGELOG.md](../../../CHANGELOG.md).

## Aktueller Versionsstatus

`v2.1.0` ist die aktuelle Quell-, gehostete Produktions- und Release-Linie. Sie wurde
in der AWS-Produktion und auf der öffentlichen Website über den optimierten Release-Flow
bereitgestellt: unveränderliche arm64-first-Artefakte, Staging-API-Smoke, API-Deployment
in Produktion, isoliertes Website-Deployment, Post-Release-Audit und Tag/Release-Abschluss.
Externe Überprüfungen bestätigen, dass `https://api.lorecontext.com/health` `status=ok`
zurückgibt, `/openapi.json` `2.1.0` meldet und `https://lorecontext.com/status.html`
`v2.1.0` enthält.

Die Produktion behält die RDS / SQS / memory-worker / Qdrant-Cloud-Form von v1.1+ bei,
verwendet `lore_memories_v12` als Qdrant-Sammlung, behält 1024-dim pgvector für den
Postgres-Pfad bei und fügt das additive Repo-Graph-Schema hinzu
(`apps/api/src/db/schema-v21-repo-graph.sql`).

Siehe [docs/release-status.md](../../release-status.md) für den aktuellen öffentlich
sicheren Status-Snapshot und [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
für die vollständigen Versionshinweise.

## Versionsschwerpunkt

Das v2.1-Release macht Lores Repository-Graphen zu einer erstklassigen
Agenten-Speicheroberfläche. Das Ziel ist, Agenten die Beantwortung von „wo ist X definiert",
„was ruft das auf" und „was bricht, wenn ich das ändere" auf Basis eines deterministischen,
stabilen Projektkontextvertrags statt Ad-hoc-Textsuche zu ermöglichen:

- `@lore/repo-graph` — deterministisches TypeScript/JavaScript-Repository-Indexing
  für Dateien, Symbole, Importe, Aufrufe, Routen, Tests und Prozesshinweise.
- API-Routen: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact` und `POST /v1/repo/detect-changes`.
- MCP-Tools: `repo.graph_query`, `repo.symbol_context`, `repo.impact` und
  `repo.detect_changes` (schreibgeschützt).
- `context_query(repo)` verwendet jetzt providerseitig gestützte Repo-Graph-Evidenz,
  wenn verfügbar, mit einem ehrlichen „nicht verfügbar"-Fallback, wenn der
  Repo-Graph-Speicher nicht konfiguriert ist.
- Das Repo-Graph-Postgres-Schema ist additiv — es liegt über dem bestehenden
  Produktionsschema und wird während der Produktions-/Staging-Schema-Einrichtung angewendet.

Root- und API-Paketversionen melden `2.1.0`, damit `/openapi.json` mit dem Release-Tag
übereinstimmt. Der Release-Train verwendet die optimierten geteilten API/Website-Deployment-
Leitplanken, die nach v2.0.9 eingeführt wurden.

Siehe [docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md) und [docs/release-governance.md](../../release-governance.md).

## Integrationen

Lore Context unterstützt MCP und REST und lässt sich mit den meisten Agenten-IDEs und Chat-Frontends integrieren:

| Tool | Setup-Anleitung |
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
| Andere / generisches MCP | [docs/integrations/README.md](../../integrations/README.md) |

## Deployment

| Modus | Wann verwenden | Dokumentation |
|---|---|---|
| **Lokale dateibasierte** | Solo-Entwicklung, Prototyp, Smoke-Testing | Dieses README, Schnellstart oben |
| **Lokales Postgres+pgvector** | Einzelknoten-Lokalfallback und Migrationstests | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker-Compose-privat** | Self-hosted-Team-Deployment, isoliertes Netzwerk | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Gehostete Cloud** | RDS / SQS / memory-worker / Qdrant / privates Embedding plus den graph-augmentierten hybriden Recall-Stack und das kommerzielle SaaS-Substrat | [docs/release-status.md](../../release-status.md) |

Alle Deployment-Pfade erfordern explizite Secrets. Lokale/private Pfade benötigen
`POSTGRES_PASSWORD`, `LORE_API_KEYS` und Dashboard-Authentifizierung. Gehostete
Deployments benötigen zusätzlich RDS, SQS, Qdrant, Embedding-Service, OAuth,
Tunnel-Konfiguration und die Produktions-Runtime-Exporte. Das Skript
`scripts/check-env.mjs` verweigert den Produktionsstart, wenn ein Wert einem
Platzhalter-Muster entspricht.

## Sicherheit

v2.1.0 behält die lokale/private Deployment-Haltung und die gehosteten Cloud-Leitplanken
für den Zugriff normaler Benutzer bei:

- **Authentifizierung**: API-Schlüssel Bearer-Tokens mit Rollentrennung (`reader`/`writer`/`admin`) und projektbezogener Geltung. Der Leer-Schlüssel-Modus schlägt in der Produktion sicher fehl.
- **Rate-Limiting**: Duales Eimer-System pro IP + pro Schlüssel mit Auth-Fehler-Backoff (429 nach 5 Fehlern in 60s, 30s Sperrung).
- **Dashboard**: Google-Session-Flow für das gehostete Produkt; HTTP Basic Auth bleibt für lokale/private Betreiber-Deployments verfügbar.
- **Container**: Alle Dockerfiles laufen als Nicht-Root-Benutzer `node`; HEALTHCHECK auf api + dashboard.
- **Secrets**: Null hartcodierte Anmeldedaten; alle Standardwerte sind Pflicht-oder-Fehler-Variablen. `scripts/check-env.mjs` lehnt Platzhalterwerte in der Produktion ab.
- **Governance**: PII / API-Schlüssel / JWT / Private-Key-Regex-Scan auf Schreibvorgänge; risikobehaftete Inhalte werden automatisch zur Prüfwarteschlange geleitet; unveränderliches Prüfprotokoll bei jeder Zustandsänderung.
- **Speichervergiftung**: Heuristische Erkennung auf Konsens + imperativische Verbmuster.
- **MCP**: Zod-Schema-Validierung bei jeder Tool-Eingabe; mutierende Tools erfordern `reason` (≥8 Zeichen) und setzen `destructiveHint: true`; Upstream-Fehler werden vor der Client-Rückgabe bereinigt.
- **Worker-Isolation**: Capture-, Embedding-, Graph-, Connector- und Backfill-Jobs laufen über AWS-SQS-Queues mit DLQs; Qdrant ist ein abgeleiteter Index und RDS bleibt autoritativ.
- **Logging**: Strukturiertes JSON mit automatischer Maskierung der Felder `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Schwachstellen-Meldungen: [SECURITY.md](../../../SECURITY.md).

## Projektstruktur

```text
apps/
  api/                # REST-Steuerungsebene + Postgres + Governance + Eval + Repo-Graph
  dashboard/          # Next.js-Dashboard mit Google-Session + HTTP-Basic-Auth für Betreiber
  mcp-server/         # MCP-stdio-Server (Legacy + offizieller SDK-Transport)
  cli/                # lore-CLI (doctor, wiki-recompile, Dataset-Import/Export)
  browser-extension/  # Capture-Oberflächen-Gerüst
  web/                # Serverseitiger HTML-Renderer (Kein-JS-Fallback-UI)
  website/            # Marketing-Website (separat verwaltet)
packages/
  shared/             # Gemeinsame Typen, Fehler, ID/Token-Hilfsmittel
  agentmemory-adapter # Brücke zu Upstream-agentmemory + Versions-Probe
  search/             # 7-Stream HybridSearchOrchestrator + Rezept-Adapter
  repo-graph/         # Deterministisches Repository-Indexing (v2.1)
  code-indexer/       # Code-Wissensgraph-Indexer (TypeScript/JavaScript)
  code-indexer-python # Code-Wissensgraph-Indexer (Python)
  capture/            # Capture-Einspeisung-Primitive
  connectors/         # Externe Quell-Konnektoren
  model-gateway/      # Multi-Provider Aufgabe→Modell-Routing
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + Metrik-Primitive + Kontextrezepte
  governance/         # Zustandsautomat + Risikoscan + Vergiftung + Audit
  profile/            # Tresor / Kontoprofil-Typen
  sdk-typescript/     # TypeScript-Client-SDK
  sdk-python/         # Python-Client-SDK
  sdk-go/ sdk-java/ sdk-dotnet/   # Weitere Sprach-SDKs
  sdk-middleware-typescript/      # Auto-Inject + Auto-Retain Middleware (npm)
  sdk-middleware-python/          # Auto-Inject + Auto-Retain Middleware (PyPI)
docs/
  i18n/<lang>/        # Lokalisiertes README in 17 Sprachen
  integrations/       # Agenten-IDE-Integrations-Anleitungen
  deployment/         # Lokale, Docker-Compose- und Produktions-Automatisierungs-Runbooks
  legal/              # Datenschutz / AGB / Cookies (Singapurisches Recht)
scripts/
  check-env.mjs       # Umgebungsvariablen-Validierung im Produktionsmodus
  smoke-*.mjs         # End-to-End-Smoke-Tests
  apply-postgres-schema.mjs
```

## Anforderungen

- Node.js `>=22`
- pnpm `10.30.1`
- (Optionaler lokaler Fallback) Postgres 16 mit pgvector
- (Gehostet/erweitert) RDS PostgreSQL 16, AWS SQS, Qdrant und privater Embedding-Service

## Mitwirken

Beiträge sind willkommen. Bitte lesen Sie [CONTRIBUTING.md](../../../CONTRIBUTING.md) für den Entwicklungs-Workflow, das Commit-Message-Protokoll und die Review-Erwartungen.

Für Dokumentationsübersetzungen siehe den [i18n-Mitwirkenden-Leitfaden](../README.md).

## Betrieben von

Lore Context wird von **REDLAND PTE. LTD.** (Singapur, UEN 202304648K) betrieben. Unternehmensprofil, rechtliche Bedingungen und Datenverarbeitung sind unter [`docs/legal/`](../../legal/) dokumentiert.

## Lizenz

Das Lore-Context-Repository ist unter der [Apache License 2.0](../../../LICENSE) lizenziert. Einzelne Pakete unter `packages/*` deklarieren MIT, um den nachgelagerten Einsatz zu erleichtern. Siehe [NOTICE](../../../NOTICE) für die Upstream-Attribution.

## Danksagungen

Lore Context baut auf [agentmemory](https://github.com/agentmemory/agentmemory) als lokaler Speicher-Runtime auf. Details zum Upstream-Vertrag und zur Versionskompatibilitätsrichtlinie sind in [UPSTREAM.md](../../../UPSTREAM.md) dokumentiert.
