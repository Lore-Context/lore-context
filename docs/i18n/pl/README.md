<div align="center">

# Lore Context

**Płaszczyzna sterowania pamięcią agenta AI, ewaluacją i zarządzaniem.**

Wiesz, co każdy agent zapamiętał, wykorzystał i powinien zapomnieć — zanim pamięć stanie się ryzykiem produkcyjnym.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Pierwsze kroki](../../getting-started.md) · [Szybki start na stronie](https://lorecontext.com/quickstart/) · [Metodologia benchmarków](https://lorecontext.com/benchmark/) · [Dokumentacja API](../../api-reference.md) · [Architektura](../../architecture.md) · [Plan projektu](../../project-plan.md) · [Status wydania](../../release-status.md) · [Mapa drogowa](../../roadmap.md) · [Integracje](../../integrations/README.md) · [Wdrożenie](../../deployment/README.md) · [Changelog](../../../CHANGELOG.md)

🌐 **Czytaj w swoim języku**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

Zlokalizowana dokumentacja może być opóźniona względem bieżących anglojęzycznych informacji o wydaniu; kanoniczną dokumentacją v2.1 jest angielski README i zestaw `docs/`.

</div>

---

> Ten dokument został przetłumaczony maszynowo z języka angielskiego, może być opóźniony względem najnowszego wydania i zapraszamy do zgłaszania PR — zob. przewodnik dla tłumaczy: [../README.md](../README.md).

## Czym jest Lore Context

Lore Context to **open-core'owa płaszczyzna sterowania** pamięcią agentów AI: komponuje kontekst z pamięci, wyszukiwania, grafów repozytoriów i śladów narzędzi; ocenia jakość pobierania na własnych zbiorach danych; kieruje treści wrażliwe do przeglądu zarządzania; eksportuje pamięć w przenośnym formacie wymiany, który można przenosić między backendami.

Nie próbuje być kolejną bazą danych pamięci. Unikalna wartość leży w tym, co znajduje się nad pamięcią:

- **Context Query** — pojedynczy endpoint komponuje pamięć + sieć + repozytorium + ślady narzędzi, zwraca oceniony blok kontekstu z proweniencją.
- **Memory Eval** — uruchamia Recall@K, Precision@K, MRR, stale-hit-rate, p95 latency na zbiorach danych będących Twoją własnością; utrwala przebiegi i porównuje je do wykrywania regresji.
- **Governance Review** — sześcioetapowy cykl życia (`candidate / active / flagged / redacted / superseded / deleted`), skanowanie znaczników ryzyka, heurystyki zatruwania pamięci, niezmienny dziennik audytu.
- **Przenośność w stylu MIF** — eksport/import JSON + Markdown zachowujący `provenance / validity / confidence / source_refs / supersedes / contradicts`. Działa jako format migracji między backendami pamięci.
- **Repo Graph** — deterministyczne indeksowanie repozytorium (pliki, symbole, importy, wywołania, trasy, testy), udostępniane przez trasy API i narzędzia MCP tylko do odczytu, aby agenci mogli opierać odpowiedzi o repozytorium na stabilnym kontrakcie kontekstu projektu.
- **Adapter Multi-Agent** — pierwszorzędna integracja `agentmemory` z sondą wersji i awaryjnym trybem zdegradowanym; przejrzysty kontrakt adaptera dla dodatkowych środowisk uruchomieniowych.

## Kiedy używać

| Użyj Lore Context gdy... | Użyj bazy danych pamięci (agentmemory, Mem0, Supermemory) gdy... |
|---|---|
| Musisz **udowodnić**, co Twój agent zapamiętał, dlaczego i czy to zostało wykorzystane | Potrzebujesz tylko surowego magazynu pamięci |
| Prowadzisz wiele agentów (Claude Code, Cursor, Qwen, Hermes, Dify) i chcesz wspólnego, godnego zaufania kontekstu | Budujesz jednego agenta i nie przeszkadza Ci poziom pamięci powiązany z dostawcą |
| Wymagasz lokalnego lub prywatnego wdrożenia ze względu na zgodność z przepisami | Wolisz hostowaną usługę SaaS |
| Potrzebujesz ewaluacji na własnych zbiorach danych, nie na benchmarkach dostawcy | Benchmarki dostawcy wystarczą jako sygnał |
| Chcesz migrować pamięć między systemami | Nie planujesz zmieniać backendów |

## Szybki start

```bash
# 1. Clone + install
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Run the quickstart helper and inspect the activation report
pnpm quickstart -- --dry-run --activation-report

# 3. Generate a real API key (do not use placeholders in any environment beyond local-only dev)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. Start the API (file-backed, no Postgres required)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Write a memory
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Query context, then inspect the returned traceId in the Evidence Ledger
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Szybki start na publicznej stronie — zob.
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). Pełna
konfiguracja (Postgres, Docker Compose, Dashboard, integracja MCP) — zob.
[docs/getting-started.md](../../getting-started.md).

Kanoniczny szybki start dla alpha to `git clone` + `pnpm quickstart`. Lore
nie publikuje obecnie i nie rości sobie prawa do publicznego pakietu npm
`@lore-context/quickstart`. Serwer MCP stdio jest publikowany osobno jako
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
dla dystrybucji w rejestrze i klientach, a SDK middleware dostarczane jest jako
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) i `lore-context-middleware` (PyPI).

Dla wyszukiwalności przez agentów AI strona publikuje `/llms.txt` i `/llms-full.txt`
wyłącznie z publicznej dokumentacji. Wpis w oficjalnym rejestrze MCP jest opublikowany,
a dodatkowe wersje robocze dystrybucji znajdują się w [docs/distribution](../../distribution/).
Wersje robocze startu znajdują się w [docs/launch](../../launch/), a przyjmowanie
partnerów projektowych — w [docs/design-partners](../../design-partners/). Publiczna
strona benchmarków to odtwarzalna metodologia i mały raport z uruchomienia próbnego,
a nie twierdzenie o wygranej w benchmarku konkurencyjnym.

## Architektura

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

Szczegóły — zob. [docs/architecture.md](../../architecture.md).

## Co nowego w v2.1.0

`v2.1.0` to wydanie **Repo Graph API and MCP Tools**. Sprawia ono, że własny
graf repozytorium Lore staje się pierwszorzędną powierzchnią pamięci agenta:
deterministyczne indeksowanie repozytorium TypeScript/JavaScript dla plików,
symboli, importów, wywołań, tras, testów i wskazówek dotyczących procesów,
udostępniane przez trasy API i narzędzia MCP tylko do odczytu, aby agenci
mogli opierać odpowiedzi o repozytorium na stabilnym kontrakcie kontekstu
projektu zamiast na doraźnym wyszukiwaniu tekstu.

v2.1.0 jest wdrożony w AWS production i na publicznej stronie. Buduje na
hybrydowym silniku pamięci (RDS truth store, AWS SQS worker fan-out, Qdrant
derived index, prywatna usługa embeddingów Qwen3, 7-strumieniowy
`HybridSearchOrchestrator`), pracowniku konsolidacji pamięci dreaming butler,
pętli samodoskonalenia pamięci agenta, opublikowanych pakietach SDK middleware
i komercyjnym podłożu SaaS dostarczonym w linii v1.7–v2.0.

| Funkcjonalność | Status | Lokalizacja |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Production | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Indeksator grafu wiedzy o kodzie | ✅ Production | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query komponujący pamięć + web + repo + ślady narzędzi | ✅ Production | `apps/api`, `docs/api-reference.md` |
| 7-strumieniowy `HybridSearchOrchestrator` (FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki) | ✅ Production | `packages/search` |
| Cross-encoder reranker (po fuzji, opcjonalny) | ✅ Production | `apps/api/src/rerankers/` |
| Konsolidacja pamięci dreaming butler (prune / merge / resolve / surface) | ✅ Production, z flagą | `apps/api/src/workers/butler-v18.ts` |
| Pętla samodoskonalenia pamięci agenta + receptury kontekstu | ✅ Production, z zatwierdzeniem człowieka | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| SDK middleware (auto-inject + auto-retain dla klientów OpenAI / Anthropic) | ✅ Opublikowany | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Skarbiec sekretów dla agentów AI (MCP-native, autoryzacja na trzy przyciski) | ✅ Beta, oczekujący audytu krypto | `apps/mcp-server`, `apps/api` |
| Silnik pamięci w chmurze: RDS truth store + SQS worker fan-out + Qdrant index | ✅ Production | `apps/api`, `apps/api/src/worker.ts` |
| Prywatna usługa wektorów Qwen3-Embedding-0.6B 1024-dim | ✅ Production | `apps/api/src/embedding.ts` |
| Automatyczne pozyskiwanie zrzutów i wyjątki Memory Inbox | ✅ Production | `apps/api`, `packages/capture` |
| Google sign-in + bootstrap osobistego skarbca | ✅ Production | `apps/api`, `apps/dashboard` |
| Komercyjny SaaS: indywidualne subskrypcje, rozliczenia, limitowanie | ✅ Production | hosted cloud (`Lore-Context/lore-cloud`) |
| REST API z uwierzytelnianiem kluczem API (reader/writer/admin) | ✅ Production | `apps/api` |
| Kontrakt OpenAPI 3.1 pod `/openapi.json` (raportuje `2.1.0`) | ✅ Production | `apps/api/src/openapi.ts` |
| Serwer MCP stdio (transport legacy + oficjalny SDK) | ✅ Production | `apps/mcp-server` |
| Dashboard Next.js z sesją Google + operator Basic Auth | ✅ Production | `apps/dashboard` |
| Evidence Ledger API + podsumowanie w Dashboard | ✅ Production | `apps/api`, `apps/dashboard` |
| Maszyna stanów zarządzania + dziennik audytu | ✅ Production | `packages/governance` |
| Ewaluator (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Production | `packages/eval` |
| Import/eksport MIF v0.2 z `supersedes` + `contradicts` | ✅ Production | `packages/mif` |
| Brama modeli (routing zadanie→model od wielu dostawców) | ✅ Production | `packages/model-gateway` |
| Adapter `agentmemory` z sondą wersji + trybem zdegradowanym | ✅ Production | `packages/agentmemory-adapter` |
| Limit szybkości, strukturalne logowanie JSON z redakcją pól | ✅ Production | `apps/api` |
| Prywatne wdrożenie Docker Compose | ✅ Production | `docker-compose.yml` |
| Pomocnik lokalnego wdrożenia `pnpm quickstart` + raport aktywacji | ✅ Production | `scripts/lore-quickstart.mjs` |
| Oficjalny rejestr MCP + dokumentacja dystrybucji / startu / partnerów projektowych | ✅ Production | `server.json`, `docs/distribution/`, `docs/launch/` |

Zobacz [CHANGELOG.md](../../../CHANGELOG.md) po pełną historię wydań.

## Aktualny status wydania

`v2.1.0` to bieżący kod źródłowy, hostowany production i linia wydań. Zostało
wdrożone w AWS production i na publicznej stronie przez zoptymizowany przepływ
wydań: niezmienne artefakty arm64-first, smoke staging API, wdrożenie production
API, izolowane wdrożenie strony, audyt po wydaniu i zamknięcie tagu/wydania.
Zewnętrzne weryfikacje potwierdzają, że `https://api.lorecontext.com/health`
zwraca `status=ok`, `/openapi.json` raportuje `2.1.0`, a
`https://lorecontext.com/status.html` zawiera `v2.1.0`.

Production zachowuje kształt RDS / SQS / memory-worker / Qdrant cloud z v1.1+,
używa `lore_memories_v12` jako kolekcji Qdrant, zachowuje 1024-dim pgvector
dla ścieżki Postgres i dodaje addytywny schemat grafu repozytorium
(`apps/api/src/db/schema-v21-repo-graph.sql`).

Zob. [docs/release-status.md](../../release-status.md) po bieżącą publicznie
bezpieczną migawkę statusu i [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
po pełne informacje o wydaniu.

## Fokus wydania

Wydanie v2.1 sprawia, że graf repozytorium Lore staje się pierwszorzędną
powierzchnią pamięci agenta. Celem jest umożliwienie agentom odpowiadania na
pytania „gdzie X jest zdefiniowany", „co to wywołuje" i „co się zepsuje przy
zmianie tego" na podstawie deterministycznego, stabilnego kontraktu kontekstu
projektu, a nie doraźnego wyszukiwania tekstu:

- `@lore/repo-graph` — deterministyczne indeksowanie repozytorium TypeScript/JavaScript
  dla plików, symboli, importów, wywołań, tras, testów i wskazówek dotyczących procesów.
- Trasy API: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact` i `POST /v1/repo/detect-changes`.
- Narzędzia MCP: `repo.graph_query`, `repo.symbol_context`, `repo.impact` i
  `repo.detect_changes` (tylko do odczytu).
- `context_query(repo)` używa teraz dowodów z grafu repozytorium od dostawcy,
  gdy są dostępne, z uczciwym rezerwowym komunikatem o niedostępności, gdy
  magazyn grafu repozytorium nie jest skonfigurowany.
- Schemat Postgres grafu repozytorium jest addytywny — spoczywa na istniejącym
  schemacie production i jest stosowany podczas konfiguracji schematu production/staging.

Wersje pakietu głównego i pakietu API raportują `2.1.0`, aby `/openapi.json`
odpowiadał tagowi wydania. Pociąg wydań używa zoptymizowanych barier wdrożenia
API/strony wprowadzonych po v2.0.9.

Zob. [docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md)
i [docs/release-governance.md](../../release-governance.md).

## Integracje

Lore Context posługuje się MCP i REST i integruje się z większością środowisk
IDE agentów oraz frontendów czatu:

| Narzędzie | Przewodnik konfiguracji |
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
| Inne / generyczne MCP | [docs/integrations/README.md](../../integrations/README.md) |

## Wdrożenie

| Tryb | Kiedy używać | Dokumentacja |
|---|---|---|
| **Lokalny plikowy** | Developerzy solo, prototypy, smoke testy | Ten README, Szybki start powyżej |
| **Lokalny Postgres+pgvector** | Jednowęzłowy lokalny fallback i testowanie migracji | [docs/deployment/README.md](../../deployment/README.md) |
| **Prywatny Docker Compose** | Samodzielnie hostowane wdrożenie zespołowe, izolowana sieć | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Hosted cloud** | RDS / SQS / memory-worker / Qdrant / prywatne embeddingi plus hybrydowy stos recall wzbogacony grafami i komercyjne podłoże SaaS | [docs/release-status.md](../../release-status.md) |

Wszystkie ścieżki wdrożenia wymagają jawnych sekretów. Lokalne/prywatne ścieżki
wymagają `POSTGRES_PASSWORD`, `LORE_API_KEYS` i uwierzytelniania dashboardu.
Wdrożenia hostowane wymagają dodatkowo RDS, SQS, Qdrant, usługi embeddingów, OAuth,
konfiguracji tunelu i eksportów środowiska uruchomieniowego production. Skrypt
`scripts/check-env.mjs` odmawia uruchomienia produkcyjnego, jeśli dowolna wartość
odpowiada wzorcowi placeholdera.

## Bezpieczeństwo

v2.1.0 utrzymuje postawę lokalnego/prywatnego wdrożenia i zabezpieczenia chmury
dla zwykłego dostępu użytkowników:

- **Uwierzytelnianie**: tokeny nośne kluczy API z rozdzieleniem ról (`reader`/`writer`/`admin`) i zakresowaniem per projekt. Tryb pustych kluczy w produkcji kończy się zamknięciem.
- **Limit szybkości**: podwójny kubeł per-IP + per-key z backoffem przy błędach uwierzytelniania (429 po 5 błędach w 60s, blokada 30s).
- **Dashboard**: przepływ sesji Google dla produktu hostowanego; HTTP Basic Auth pozostaje dostępny dla lokalnych/prywatnych wdrożeń operatorskich.
- **Kontenery**: wszystkie Dockerfile uruchamiają się jako nieuprzywilejowany użytkownik `node`; HEALTHCHECK na api + dashboard.
- **Sekrety**: zero zakodowanych na stałe poświadczeń; wszystkie wartości domyślne są zmiennymi wymaganymi lub powodującymi błąd. `scripts/check-env.mjs` odrzuca placeholdery w produkcji.
- **Zarządzanie**: skanowanie regex PII / klucza API / JWT / klucza prywatnego przy zapisach; treści z oznaczeniem ryzyka automatycznie kierowane do kolejki przeglądu; niezmienny dziennik audytu przy każdej zmianie stanu.
- **Zatruwanie pamięci**: heurystyczna detekcja na wzorcach konsensusu + czasowników rozkazujących.
- **MCP**: walidacja schematu zod na każdym wejściu narzędzia; narzędzia mutujące wymagają `reason` (≥8 znaków) i ujawniają `destructiveHint: true`; błędy upstream są sanityzowane przed zwróceniem klientowi.
- **Izolacja worker**: zadania przechwytywania, embeddingów, grafu, konektora i backfill uruchamiane są przez kolejki AWS SQS z DLQ; Qdrant jest indeksem pochodnym, a RDS pozostaje autorytatywny.
- **Logowanie**: strukturalny JSON z automatyczną redakcją pól `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Zgłaszanie podatności: [SECURITY.md](../../../SECURITY.md).

## Struktura projektu

```text
apps/
  api/                # REST płaszczyzna sterowania + Postgres + zarządzanie + eval + repo graph
  dashboard/          # Dashboard Next.js z sesją Google + operator Basic Auth
  mcp-server/         # Serwer MCP stdio (transporty legacy + oficjalny SDK)
  cli/                # lore CLI (doctor, wiki-recompile, import/eksport zbiorów danych)
  browser-extension/  # Szkielet powierzchni przechwytywania
  web/                # Renderer HTML po stronie serwera (interfejs zastępczy bez JS)
  website/            # Strona marketingowa (obsługiwana oddzielnie)
packages/
  shared/             # Współdzielone typy, błędy, narzędzia ID/token
  agentmemory-adapter # Most do upstream agentmemory + sonda wersji
  search/             # 7-strumieniowy HybridSearchOrchestrator + adapter receptur
  repo-graph/         # Deterministyczne indeksowanie repozytorium (v2.1)
  code-indexer/       # Indeksator grafu wiedzy o kodzie (TypeScript/JavaScript)
  code-indexer-python # Indeksator grafu wiedzy o kodzie (Python)
  capture/            # Prymitywy pozyskiwania zrzutów
  connectors/         # Konektory zewnętrznych źródeł
  model-gateway/      # Routing zadanie→model od wielu dostawców
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + prymitywy metryk + receptury kontekstu
  governance/         # Maszyna stanów + skan ryzyka + zatruwanie + audyt
  profile/            # Typy skarbca / profilu konta
  sdk-typescript/     # TypeScript SDK klienta
  sdk-python/         # Python SDK klienta
  sdk-go/ sdk-java/ sdk-dotnet/   # SDK dla dodatkowych języków
  sdk-middleware-typescript/      # Auto-inject + auto-retain middleware (npm)
  sdk-middleware-python/          # Auto-inject + auto-retain middleware (PyPI)
docs/
  i18n/<lang>/        # Zlokalizowane README w 17 językach
  integrations/       # Przewodniki integracji agent-IDE
  deployment/         # Lokalne, Docker Compose i runbooki automatyzacji production
  legal/              # Prywatność / Warunki / Cookies (prawo Singapuru)
scripts/
  check-env.mjs       # Walidacja środowiska w trybie produkcyjnym
  smoke-*.mjs         # Testy smoke end-to-end
  apply-postgres-schema.mjs
```

## Wymagania

- Node.js `>=22`
- pnpm `10.30.1`
- (Opcjonalny lokalny fallback) Postgres 16 z pgvector
- (Hosted/zaawansowany) RDS PostgreSQL 16, AWS SQS, Qdrant i prywatna usługa embeddingów

## Współtworzenie

Wkłady są mile widziane. Przeczytaj [CONTRIBUTING.md](../../../CONTRIBUTING.md)
w sprawie przepływu pracy deweloperskiej, protokołu wiadomości commit i oczekiwań
dotyczących przeglądu.

Tłumaczenia dokumentacji — zob. [przewodnik dla tłumaczy i18n](../README.md).

## Operowane przez

Lore Context jest obsługiwany przez **REDLAND PTE. LTD.** (Singapur, UEN 202304648K). Profil firmy, warunki prawne i obsługa danych są udokumentowane w [`docs/legal/`](../../legal/).

## Licencja

Repozytorium Lore Context jest licencjonowane na [Apache License 2.0](../../../LICENSE). Poszczególne pakiety w `packages/*` deklarują MIT, aby umożliwić konsumpcję przez podmioty zewnętrzne. Zobacz [NOTICE](../../../NOTICE) w sprawie atrybucji upstream.

## Podziękowania

Lore Context jest zbudowany na bazie [agentmemory](https://github.com/agentmemory/agentmemory) jako lokalne środowisko uruchomieniowe pamięci. Szczegóły kontraktu upstream i polityka kompatybilności wersji są udokumentowane w [UPSTREAM.md](../../../UPSTREAM.md).
