<div align="center">

> 🤖 Dieses Dokument wurde maschinell aus dem Englischen übersetzt. Verbesserungen per PR sind willkommen — siehe [Übersetzungs-Beitragsleitfaden](../README.md).

# Lore Context

**Die Steuerungsebene für KI-Agenten-Speicher, Evaluation und Governance.**

Wisse, was jeder Agent gespeichert hat, verwendet hat und vergessen sollte — bevor Speicher zum Produktionsrisiko wird.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Erste Schritte](../../getting-started.md) · [API-Referenz](../../api-reference.md) · [Architektur](../../architecture.md) · [Integrationen](../../integrations/README.md) · [Deployment](../../deployment/README.md) · [Changelog](../../../CHANGELOG.md)

🌐 **In deiner Sprache lesen**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Deutsch](./README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## Was ist Lore Context

Lore Context ist eine **Open-Core-Steuerungsebene** für KI-Agenten-Speicher: Sie kombiniert Kontext aus Speicher, Suche und Tool-Traces; bewertet die Abrufqualität auf eigenen Datensätzen; leitet Governance-Prüfungen für sensible Inhalte weiter; und exportiert Speicher als portables Austauschformat, das zwischen Backends übertragen werden kann.

Es versucht nicht, eine weitere Speicherdatenbank zu sein. Der einzigartige Mehrwert liegt in dem, was oberhalb des Speichers sitzt:

- **Context Query** — ein einziger Endpunkt kombiniert Speicher + Web + Repository + Tool-Traces, gibt einen bewerteten Kontext-Block mit Herkunftsnachweis zurück.
- **Memory Eval** — führt Recall@K, Precision@K, MRR, stale-hit-rate und p95-Latenz auf eigenen Datensätzen aus; speichert Durchläufe und vergleicht sie zur Regressionserkennung.
- **Governance Review** — Sechszustands-Lebenszyklus (`candidate / active / flagged / redacted / superseded / deleted`), Risiko-Tag-Scanning, Vergiftungsheuristiken, unveränderliches Audit-Protokoll.
- **MIF-ähnliche Portabilität** — JSON + Markdown Export/Import mit Erhalt von `provenance / validity / confidence / source_refs / supersedes / contradicts`. Funktioniert als Migrationsformat zwischen Speicher-Backends.
- **Multi-Agent-Adapter** — erstklassige `agentmemory`-Integration mit Versions-Probe und Degraded-Mode-Fallback; klarer Adapter-Vertrag für weitere Runtimes.

## Wann verwenden

| Lore Context verwenden, wenn... | Speicherdatenbank verwenden (agentmemory, Mem0, Supermemory), wenn... |
|---|---|
| Du **nachweisen** musst, was dein Agent gespeichert hat, warum, und ob es verwendet wurde | Du nur rohen Speicher benötigst |
| Du mehrere Agenten betreibst (Claude Code, Cursor, Qwen, Hermes, Dify) und gemeinsamen vertrauenswürdigen Kontext benötigst | Du einen einzelnen Agenten aufbaust und mit einer anbieterspezifischen Speicherschicht einverstanden bist |
| Du lokale oder private Deployments für Compliance benötigst | Du einen gehosteten SaaS bevorzugst |
| Du Evaluierungen auf eigenen Datensätzen benötigst, nicht auf Anbieter-Benchmarks | Anbieter-Benchmarks ausreichende Signale liefern |
| Du Speicher zwischen Systemen migrieren möchtest | Du nie vorhast, Backends zu wechseln |

## Schnellstart

```bash
# 1. Klonen + installieren
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Echten API-Schlüssel generieren (keine Platzhalter in irgendeiner Umgebung außer rein lokalem Dev)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. API starten (dateibasiert, kein Postgres erforderlich)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Speicher schreiben
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Kontext abfragen
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Für die vollständige Einrichtung (Postgres, Docker Compose, Dashboard, MCP-Integration) siehe [docs/getting-started.md](../../getting-started.md).

## Architektur

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

Für Details siehe [docs/architecture.md](../../architecture.md).

## Was ist in v0.4.0-alpha

| Funktion | Status | Wo |
|---|---|---|
| REST API mit API-Schlüssel-Authentifizierung (reader/writer/admin) | ✅ Produktion | `apps/api` |
| MCP stdio-Server (Legacy + offizieller SDK-Transport) | ✅ Produktion | `apps/mcp-server` |
| Next.js-Dashboard mit HTTP Basic Auth | ✅ Produktion | `apps/dashboard` |
| Postgres + pgvector inkrementelle Persistenz | ✅ Optional | `apps/api/src/db/` |
| Governance-Zustandsmaschine + Audit-Protokoll | ✅ Produktion | `packages/governance` |
| Eval-Runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Produktion | `packages/eval` |
| MIF v0.2 Import/Export mit `supersedes` + `contradicts` | ✅ Produktion | `packages/mif` |
| `agentmemory`-Adapter mit Versions-Probe + Degraded-Mode | ✅ Produktion | `packages/agentmemory-adapter` |
| Ratenbegrenzung (pro IP + pro Schlüssel mit Backoff) | ✅ Produktion | `apps/api` |
| Strukturiertes JSON-Logging mit Redaktion sensibler Felder | ✅ Produktion | `apps/api/src/logger.ts` |
| Docker Compose Private Deployment | ✅ Produktion | `docker-compose.yml` |
| Demo-Datensatz + Smoke-Tests + Playwright-UI-Test | ✅ Produktion | `examples/`, `scripts/` |
| Gehostete Multi-Mandanten-Cloud-Synchronisierung | ⏳ Roadmap | — |

Siehe [CHANGELOG.md](../../../CHANGELOG.md) für die vollständigen v0.4.0-alpha-Release-Notes.

## Integrationen

Lore Context unterstützt MCP und REST und lässt sich mit den meisten Agenten-IDEs und Chat-Frontends integrieren:

| Tool | Setup-Leitfaden |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](../../../docs/integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](../../../docs/integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](../../../docs/integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](../../../docs/integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](../../../docs/integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](../../../docs/integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](../../../docs/integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](../../../docs/integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](../../../docs/integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](../../../docs/integrations/openwebui.md) |
| Andere / generisches MCP | [docs/integrations/README.md](../../../docs/integrations/README.md) |

## Deployment

| Modus | Verwenden wenn | Doku |
|---|---|---|
| **Lokal dateibasiert** | Solo-Entwicklung, Prototyp, Smoke-Tests | Diese README, Schnellstart oben |
| **Lokal Postgres+pgvector** | Produktionsreifer Einzelknoten, semantische Suche im großen Maßstab | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose privat** | Self-hosted Team-Deployment, isoliertes Netzwerk | [docs/deployment/compose.private-demo.yml](../../../docs/deployment/compose.private-demo.yml) |
| **Cloud-verwaltet** | Kommt in v0.6 | — |

Alle Deployment-Pfade erfordern explizite Geheimnisse: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. Das Skript `scripts/check-env.mjs` verweigert den Produktionsstart, wenn ein Wert einem Platzhalter-Muster entspricht.

## Sicherheit

v0.4.0-alpha implementiert eine Defense-in-Depth-Strategie, die für nicht-öffentliche Alpha-Deployments geeignet ist:

- **Authentifizierung**: API-Schlüssel Bearer-Tokens mit Rollentrennung (`reader`/`writer`/`admin`) und Projekt-Scoping. Leere-Schlüssel-Modus schlägt im Produktionsbetrieb fehl.
- **Ratenbegrenzung**: Pro-IP + Pro-Schlüssel Doppel-Bucket mit Auth-Fehler-Backoff (429 nach 5 Fehlern in 60s, 30s Sperrzeit).
- **Dashboard**: HTTP Basic Auth Middleware. Verweigert den Start in der Produktion ohne `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Container**: Alle Dockerfiles laufen als Nicht-Root-`node`-Benutzer; HEALTHCHECK auf api + dashboard.
- **Geheimnisse**: Keine fest codierten Anmeldedaten; alle Standardwerte sind Pflicht-oder-Fehlschlag-Variablen. `scripts/check-env.mjs` lehnt Platzhalter-Werte in der Produktion ab.
- **Governance**: PII / API-Schlüssel / JWT / Private-Key-Regex-Scanning bei Schreibvorgängen; risikobehaftete Inhalte automatisch an die Überprüfungswarteschlange weitergeleitet; unveränderliches Audit-Protokoll bei jeder Zustandsänderung.
- **Speichervergiftung**: Heuristische Erkennung bei Konsens- und Imperativ-Verb-Mustern.
- **MCP**: zod-Schema-Validierung bei jeder Tool-Eingabe; mutierende Tools erfordern `reason` (≥8 Zeichen) und zeigen `destructiveHint: true`; Upstream-Fehler werden vor der Client-Rückgabe bereinigt.
- **Logging**: Strukturiertes JSON mit automatischer Redaktion der Felder `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Sicherheitslücken melden: [SECURITY.md](../../../SECURITY.md).

## Projektstruktur

```text
apps/
  api/                # REST API + Postgres + governance + eval (TypeScript)
  dashboard/          # Next.js 16 Dashboard mit Basic Auth Middleware
  mcp-server/         # MCP stdio-Server (Legacy + offizielle SDK-Transporte)
  web/                # Server-seitiger HTML-Renderer (No-JS Fallback-UI)
  website/            # Marketing-Website (separat verwaltet)
packages/
  shared/             # Gemeinsame Typen, Fehler, ID/Token-Hilfsprogramme
  agentmemory-adapter # Brücke zu upstream agentmemory + Versions-Probe
  search/             # Pluggable Suchanbieter (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + Metrik-Primitive
  governance/         # Zustandsmaschine + Risiko-Scan + Vergiftung + Audit
docs/
  i18n/<lang>/        # Lokalisierte README in 17 Sprachen
  integrations/       # 11 Agenten-IDE-Integrations-Leitfäden
  deployment/         # Lokal + Postgres + Docker Compose
  legal/              # Datenschutz / AGB / Cookies (Singapur-Recht)
scripts/
  check-env.mjs       # Produktionsmodus-Umgebungsvalidierung
  smoke-*.mjs         # End-to-End-Smoke-Tests
  apply-postgres-schema.mjs
```

## Anforderungen

- Node.js `>=22`
- pnpm `10.30.1`
- (Optional) Postgres 16 mit pgvector für semantischen Speicher in Produktionsqualität

## Mitwirken

Beiträge sind willkommen. Bitte lies [CONTRIBUTING.md](../../../CONTRIBUTING.md) für den Entwicklungsworkflow, das Commit-Message-Protokoll und die Review-Erwartungen.

Für Dokumentationsübersetzungen siehe den [i18n-Beitragsleitfaden](../README.md).

## Betrieben von

Lore Context wird von **REDLAND PTE. LTD.** (Singapur, UEN 202304648K) betrieben. Firmenprofil, rechtliche Bedingungen und Datenverarbeitung sind unter [`docs/legal/`](../../../docs/legal/) dokumentiert.

## Lizenz

Das Lore Context-Repository ist unter der [Apache License 2.0](../../../LICENSE) lizenziert. Einzelne Pakete unter `packages/*` deklarieren MIT, um die nachgelagerte Nutzung zu ermöglichen. Siehe [NOTICE](../../../NOTICE) für Upstream-Attribution.

## Danksagungen

Lore Context baut auf [agentmemory](https://github.com/agentmemory/agentmemory) als lokale Speicher-Runtime auf. Details zum Upstream-Vertrag und zur Versions-Kompatibilitätsrichtlinie sind in [UPSTREAM.md](../../../UPSTREAM.md) dokumentiert.
