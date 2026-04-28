<div align="center">

> 🤖 Ten dokument został przetłumaczony maszynowo z języka angielskiego. Ulepszenia poprzez PR są mile widziane — zobacz [przewodnik dla tłumaczy](../README.md).

# Lore Context

**Płaszczyzna sterowania pamięcią agenta AI, ewaluacją i zarządzaniem.**

Wiesz, co każdy agent zapamiętał, wykorzystał i powinien zapomnieć — zanim pamięć stanie się ryzykiem produkcyjnym.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Pierwsze kroki](../../getting-started.md) · [Dokumentacja API](../../api-reference.md) · [Architektura](../../architecture.md) · [Integracje](../../integrations/README.md) · [Wdrożenie](../../deployment/README.md) · [Changelog](../../../CHANGELOG.md)

🌐 **Czytaj w swoim języku**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](./README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## Czym jest Lore Context

Lore Context to **open-core'owa płaszczyzna sterowania** pamięcią agentów AI: komponuje kontekst z pamięci, wyszukiwania i śladów narzędzi; ocenia jakość pobierania na własnych zbiorach danych; kieruje treści wrażliwe do przeglądu zarządzania; eksportuje pamięć w przenośnym formacie wymiany, który można przenosić między backendami.

Nie próbuje być kolejną bazą danych pamięci. Unikalna wartość leży w tym, co znajduje się nad pamięcią:

- **Context Query** — pojedynczy endpoint komponuje pamięć + sieć + repozytorium + ślady narzędzi, zwraca oceniony blok kontekstu z proweniencją.
- **Memory Eval** — uruchamia Recall@K, Precision@K, MRR, stale-hit-rate, p95 latency na zbiorach danych będących Twoją własnością; utrwala przebiegi i porównuje je do wykrywania regresji.
- **Governance Review** — sześcioetapowy cykl życia (`candidate / active / flagged / redacted / superseded / deleted`), skanowanie znaczników ryzyka, heurystyki zatruwania pamięci, niezmienny dziennik audytu.
- **Przenośność w stylu MIF** — eksport/import JSON + Markdown zachowujący `provenance / validity / confidence / source_refs / supersedes / contradicts`. Działa jako format migracji między backendami pamięci.
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
# 1. Sklonuj i zainstaluj
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Wygeneruj prawdziwy klucz API (nie używaj placeholderów w żadnym środowisku poza wyłącznie lokalnym developmentem)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. Uruchom API (plikowy backend, bez Postgres)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Zapisz pamięć
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Zapytaj o kontekst
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Pełna konfiguracja (Postgres, Docker Compose, Dashboard, integracja MCP) — zobacz [docs/getting-started.md](../../getting-started.md).

## Architektura

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

Szczegóły — zobacz [docs/architecture.md](../../architecture.md).

## Co nowego w v0.4.0-alpha

| Funkcjonalność | Status | Lokalizacja |
|---|---|---|
| REST API z uwierzytelnianiem kluczem API (reader/writer/admin) | ✅ Produkcyjny | `apps/api` |
| Serwer MCP stdio (transport legacy + oficjalny SDK) | ✅ Produkcyjny | `apps/mcp-server` |
| Dashboard Next.js z bramką HTTP Basic Auth | ✅ Produkcyjny | `apps/dashboard` |
| Inkrementalna trwałość Postgres + pgvector | ✅ Opcjonalny | `apps/api/src/db/` |
| Maszyna stanów zarządzania + dziennik audytu | ✅ Produkcyjny | `packages/governance` |
| Ewaluator (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Produkcyjny | `packages/eval` |
| Import/eksport MIF v0.2 z `supersedes` + `contradicts` | ✅ Produkcyjny | `packages/mif` |
| Adapter `agentmemory` z sondą wersji + trybem zdegradowanym | ✅ Produkcyjny | `packages/agentmemory-adapter` |
| Limit szybkości (per-IP + per-key z backoffem) | ✅ Produkcyjny | `apps/api` |
| Strukturalne logowanie JSON z redakcją pól wrażliwych | ✅ Produkcyjny | `apps/api/src/logger.ts` |
| Prywatne wdrożenie Docker Compose | ✅ Produkcyjny | `docker-compose.yml` |
| Demonstracyjny zbiór danych + smoke testy + test UI Playwright | ✅ Produkcyjny | `examples/`, `scripts/` |
| Hostowana wielodostępna synchronizacja w chmurze | ⏳ Mapa drogowa | — |

Zobacz [CHANGELOG.md](../../../CHANGELOG.md) po pełne informacje o wydaniu v0.4.0-alpha.

## Integracje

Lore Context posługuje się MCP i REST i integruje się z większością środowisk IDE agentów oraz frontendów czatu:

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
| **Lokalny Postgres+pgvector** | Produkcyjny węzeł pojedynczy, semantyczne wyszukiwanie w skali | [docs/deployment/README.md](../../deployment/README.md) |
| **Prywatny Docker Compose** | Samodzielnie hostowane wdrożenie zespołowe, izolowana sieć | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Zarządzany w chmurze** | Dostępny w v0.6 | — |

Wszystkie ścieżki wdrożenia wymagają jawnych sekretów: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. Skrypt `scripts/check-env.mjs` odmawia uruchomienia produkcyjnego, jeśli dowolna wartość odpowiada wzorcowi placeholdera.

## Bezpieczeństwo

v0.4.0-alpha implementuje podejście ochrony warstwowej odpowiednie dla niepublicznych wdrożeń alpha:

- **Uwierzytelnianie**: tokeny nośne kluczy API z rozdzieleniem ról (`reader`/`writer`/`admin`) i zakresowaniem per projekt. Tryb pustych kluczy w produkcji kończy się zamknięciem.
- **Limit szybkości**: podwójny kubeł per-IP + per-key z backoffem przy błędach uwierzytelniania (429 po 5 błędach w 60s, blokada 30s).
- **Dashboard**: oprogramowanie pośredniczące HTTP Basic Auth. Odmawia uruchomienia w produkcji bez `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Kontenery**: wszystkie Dockerfile uruchamiają się jako nieuprzywilejowany użytkownik `node`; HEALTHCHECK na api + dashboard.
- **Sekrety**: zero zakodowanych na stałe poświadczeń; wszystkie wartości domyślne są zmiennymi wymaganymi lub powodującymi błąd. `scripts/check-env.mjs` odrzuca placeholder'y w produkcji.
- **Zarządzanie**: skanowanie regex PII / klucza API / JWT / klucza prywatnego przy zapisach; treści z oznaczeniem ryzyka automatycznie kierowane do kolejki przeglądu; niezmienny dziennik audytu przy każdej zmianie stanu.
- **Zatruwanie pamięci**: heurystyczna detekcja na wzorcach dominacji źródła + czasowników rozkazujących.
- **MCP**: walidacja schematu zod na każdym wejściu narzędzia; narzędzia mutujące wymagają `reason` (≥8 znaków) i ujawniają `destructiveHint: true`; błędy upstream są sanityzowane przed zwróceniem klientowi.
- **Logowanie**: strukturalny JSON z automatyczną redakcją pól `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Zgłaszanie podatności: [SECURITY.md](../../../SECURITY.md).

## Struktura projektu

```text
apps/
  api/                # REST API + Postgres + zarządzanie + eval (TypeScript)
  dashboard/          # Dashboard Next.js 16 z oprogramowaniem pośredniczącym Basic Auth
  mcp-server/         # Serwer MCP stdio (transporty legacy + oficjalny SDK)
  web/                # Renderer HTML po stronie serwera (interfejs zastępczy bez JS)
  website/            # Strona marketingowa (obsługiwana oddzielnie)
packages/
  shared/             # Współdzielone typy, błędy, narzędzia ID/token
  agentmemory-adapter # Most do upstream agentmemory + sonda wersji
  search/             # Wtykowe dostawcy wyszukiwania (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + prymitywy metryk
  governance/         # Maszyna stanów + skan ryzyka + zatruwanie + audyt
docs/
  i18n/<lang>/        # Zlokalizowane README w 17 językach
  integrations/       # 11 przewodników integracji agent-IDE
  deployment/         # Lokalnie + Postgres + Docker Compose
  legal/              # Prywatność / Warunki / Cookies (prawo Singapuru)
scripts/
  check-env.mjs       # Walidacja środowiska w trybie produkcyjnym
  smoke-*.mjs         # Testy smoke end-to-end
  apply-postgres-schema.mjs
```

## Wymagania

- Node.js `>=22`
- pnpm `10.30.1`
- (Opcjonalnie) Postgres 16 z pgvector dla pamięci z wyszukiwaniem semantycznym

## Współtworzenie

Wkłady są mile widziane. Przeczytaj [CONTRIBUTING.md](../../../CONTRIBUTING.md) w sprawie przepływu pracy deweloperskiej, protokołu wiadomości commit i oczekiwań dotyczących przeglądu.

Tłumaczenia dokumentacji — zobacz [przewodnik dla tłumaczy i18n](../README.md).

## Operowane przez

Lore Context jest obsługiwany przez **REDLAND PTE. LTD.** (Singapur, UEN 202304648K). Profil firmy, warunki prawne i obsługa danych są udokumentowane w [`docs/legal/`](../../../docs/legal/).

## Licencja

Repozytorium Lore Context jest licencjonowane na [Apache License 2.0](../../../LICENSE). Poszczególne pakiety w `packages/*` deklarują MIT, aby umożliwić konsumpcję przez podmioty zewnętrzne. Zobacz [NOTICE](../../../NOTICE) w sprawie atrybucji upstream.

## Podziękowania

Lore Context jest zbudowany na bazie [agentmemory](https://github.com/agentmemory/agentmemory) jako lokalne środowisko uruchomieniowe pamięci. Szczegóły kontraktu upstream i polityka kompatybilności wersji są udokumentowane w [UPSTREAM.md](../../../UPSTREAM.md).
