> 🤖 Ten dokument został przetłumaczony maszynowo z języka angielskiego. Ulepszenia poprzez PR są mile widziane — zobacz [przewodnik dla tłumaczy](../README.md).

# Przewodniki integracji

Te przewodniki dokumentują kontrakt integracji Lore Context z bieżącym lokalnym MVP.

## Bieżący status repozytorium

- Repozytorium zawiera teraz lokalny REST API, router/kompozytor kontekstu, opcjonalną trwałość w pliku JSON, opcjonalny magazyn uruchomieniowy Postgres, ślady, import/eksport pamięci, porównanie dostawców eval, HTML dashboardu serwowany przez API, samodzielny dashboard Next.js i granicę adaptera `agentmemory`.
- `apps/mcp-server/src/index.ts` dostarcza uruchamialny launcher MCP stdio JSON-RPC, który proxy'uje narzędzia do Lore REST API przez `LORE_API_URL` i przekazuje `LORE_API_KEY` jako token Bearer gdy jest skonfigurowany. Obsługuje starszą wbudowaną pętlę stdio i oficjalny transport stdio `@modelcontextprotocol/sdk` przez `LORE_MCP_TRANSPORT=sdk`.
- Poniższe dokumenty to kontrakty integracji. Integracje API-first mogą używać lokalnego serwera REST już dziś; klienci obsługujący MCP mogą używać lokalnego launchera stdio po `pnpm build`.

## Wspólny projekt

- Klienci obsługujący MCP powinni łączyć się z małym serwerem MCP Lore, nie z surowym `agentmemory`.
- Klienci API-first powinni wywoływać punkty końcowe Lore REST, przy czym `POST /v1/context/query` jest główną ścieżką odczytu.
- `POST /v1/context/query` przyjmuje `mode`, `sources`, `freshness`, `token_budget`, `writeback_policy` i `include_sources`, więc klienci mogą wymusić lub wyłączyć routing pamięci/sieci/repozytorium/śladu-narzędzia gdy potrzeba.
- Lore owija lokalne środowisko uruchomieniowe `agentmemory` przez `packages/agentmemory-adapter`.
- Lokalne `agentmemory` jest oczekiwane pod `http://127.0.0.1:3111`.

## Dostępna powierzchnia MCP

- `context_query`
- `memory_write`
- `memory_search`
- `memory_forget`
- `memory_list`
- `memory_get`
- `memory_update`
- `memory_supersede`
- `memory_export`
- `eval_run`
- `trace_get`

## Dostępna powierzchnia REST

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` z opcjonalnymi `project_id`, `scope`, `status`, `memory_type`, `q` i `limit`
- `GET /v1/memory/:id`
- `PATCH /v1/memory/:id`
- `POST /v1/memory/:id/supersede`
- `GET /v1/memory/export`
- `POST /v1/memory/import`
- `GET /v1/governance/review-queue`
- `POST /v1/governance/memory/:id/approve`
- `POST /v1/governance/memory/:id/reject`
- `POST /v1/events/ingest`
- `POST /v1/eval/run`
- `GET /v1/eval/providers`
- `GET /v1/eval/runs`
- `GET /v1/eval/runs/:id`
- `GET /v1/traces`
- `GET /v1/traces/:id`
- `POST /v1/traces/:id/feedback`
- `GET /v1/audit-logs`

## Lokalny smoke test API

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

Automatyczna ścieżka smoke:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Lokalny smoke test MCP

Launcher MCP odczytuje JSON-RPC rozdzielony znakiem nowej linii ze stdin i zapisuje tylko wiadomości JSON-RPC na stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Nie uruchamiaj tego przez `pnpm start` z klienta MCP, ponieważ banery menedżera pakietów zanieczyszczyłyby stdout.

## Wyrównanie prywatnego wdrożenia

Prywatne pakowanie demonstracyjne w [docs/deployment/README.md](../deployment.md) zakłada:

- API Lore i dashboard działają jako długo żyjące kontenery.
- Postgres jest domyślnym trwałym magazynem dla współdzielonych demonstracji.
- Launcher MCP pozostaje procesem stdio blisko klienta lub działa jako opcjonalna usługa compose `mcp` na żądanie.
- Zasilanie demonstracyjne pochodzi z [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json), podczas gdy smoke eval pochodzi z [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json).

Dla prywatnych wdrożeń wskaż launchery klientów na prywatny URL API i dostarcz najmniejszą rolę, która pasuje:

- `reader`: dashboard i copiloty tylko do odczytu.
- `writer`: agenty, które powinny zapisywać pamięć, informację zwrotną lub przebiegi eval.
- `admin`: przepływy importu, eksportu, zarządzania, audytu i zapominania.

## Szablony klientów uwzględniające wdrożenie

### Claude Code

Preferuj lokalny dla stacji roboczej proces stdio kierowany na prywatne API:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY="${WRITE_KEY:?set WRITE_KEY}" \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

Jeśli używasz spakowanego kontenera MCP zamiast `node .../dist/index.js`, zachowaj tę samą parę `LORE_API_URL` / `LORE_API_KEY` i uruchom launcher stdio przez `docker compose run --rm mcp`.

### Cursor

JSON MCP w stylu Cursor powinien utrzymywać launcher lokalnie i zmieniać tylko cel API i klucz:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_READER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Używaj klucza `writer` tylko gdy przepływy pracy Cursor celowo zapisują trwałą pamięć projektu.

### Qwen Code

JSON `mcpServers` w stylu Qwen podąża za tą samą granicą:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_WRITER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Używaj `reader` dla asystentów do wyszukiwania tylko i `writer` dla agentycznych przepływów wymagających narzędzi `memory_write`, `memory_update` lub ślad.

## Bezpieczne wartości domyślne

- Preferuj `stdio` lokalnie dla MCP; używaj uwierzytelnionego streamable HTTP tylko gdy wymagany jest transport zdalny.
- Traktuj SSE jako starszą kompatybilność, nie domyślną ścieżkę.
- Biała lista narzędzi za pomocą `includeTools` lub odpowiednika klienta.
- Nie włączaj domyślnie trybów szerokiego zaufania.
- Wymagaj `reason` przy operacjach mutujących.
- Utrzymuj `memory_forget` na miękkim usunięciu, chyba że admin celowo ustawia `hard_delete: true` dla kontrolowanego usunięcia.
- Używaj rozdzielenia ról `LORE_API_KEYS` dla współdzielonego lokalnego lub zdalnego wystawienia API: `reader` dla klientów tylko do odczytu, `writer` dla zapisu agenta, i `admin` tylko dla operacji synchronizacji/importu/eksportu/zapominania/zarządzania/audytu. Dodaj `projectIds`, by zakresować klucze klientów do projektów, które mogą widzieć lub mutować.
- Utrzymuj `agentmemory` powiązany z `127.0.0.1`.
- Nie wystawiaj publicznie surowej przeglądarki lub konsoli `agentmemory`.
- Bieżący kontrakt live `agentmemory` 0.9.3: `remember`, `export`, `audit` i `forget(memoryId)` są użyteczne dla testów synchronizacji/kontraktu Lore; `smart-search` przeszukuje obserwacje i nie powinno być traktowane jako dowód, że nowo zapamiętane rekordy pamięci są bezpośrednio przeszukiwalne.
