> 🤖 Ten dokument został przetłumaczony maszynowo z języka angielskiego. Ulepszenia poprzez PR są mile widziane — zobacz [przewodnik dla tłumaczy](../README.md).

# Pierwsze kroki

Ten przewodnik przeprowadzi Cię od zera do działającej instancji Lore Context z zapisaną pamięcią,
zapytaniem o kontekst i dostępnym dashboardem. Planuj ~15 minut łącznie, ~5 minut dla
podstawowej ścieżki.

## Wymagania wstępne

- **Node.js** `>=22` (użyj `nvm`, `mise` lub menedżera pakietów swojej dystrybucji)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Opcjonalnie) **Docker + Docker Compose** dla ścieżki Postgres+pgvector
- (Opcjonalnie) **psql** jeśli wolisz samodzielnie zastosować schemat

## 1. Sklonuj i zainstaluj

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Jeśli `pnpm test` nie jest zielony, nie kontynuuj — otwórz zgłoszenie z logiem błędu.

## 2. Wygeneruj prawdziwe sekrety

Lore Context odmawia uruchomienia w produkcji z wartościami placeholder. Generuj prawdziwe klucze
nawet do lokalnego developmentu, by utrzymać spójne nawyki.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Dla lokalnych konfiguracji wielorolowych:

```bash
export READER_KEY=$(openssl rand -hex 32)
export WRITER_KEY=$(openssl rand -hex 32)
export ADMIN_KEY=$(openssl rand -hex 32)
export LORE_API_KEYS='[
  {"key":"'"$READER_KEY"'","role":"reader","projectIds":["demo"]},
  {"key":"'"$WRITER_KEY"'","role":"writer","projectIds":["demo"]},
  {"key":"'"$ADMIN_KEY"'","role":"admin"}
]'
```

## 3. Uruchom API (plikowy backend, bez bazy danych)

Najprostsza ścieżka używa lokalnego pliku JSON jako backendu magazynowania. Odpowiednia do solowego
developmentu i smoke testów.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

W innej powłoce zweryfikuj stan:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Oczekiwany wynik: `{"status":"ok",...}`.

## 4. Zapisz pierwszą pamięć

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{
    "content": "Use Postgres pgvector for Lore Context production storage.",
    "memory_type": "project_rule",
    "project_id": "demo",
    "scope": "project"
  }' | jq
```

Oczekiwany wynik: odpowiedź `200` z `id` nowej pamięci i `governance.state` równym `active` lub
`candidate` (to drugie, jeśli zawartość pasowała do wzorca ryzyka, np. sekret).

## 5. Skomponuj kontekst

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{
    "query": "production storage",
    "project_id": "demo",
    "token_budget": 1200
  }' | jq
```

Powinieneś zobaczyć swoją pamięć cytowaną w tablicy `evidence.memory`, plus `traceId`, który
możesz później użyć do inspekcji routingu i informacji zwrotnej.

## 6. Uruchom dashboard

W nowym terminalu:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Otwórz http://127.0.0.1:3001 w przeglądarce. Przeglądarka poprosi o poświadczenia Basic Auth.
Po uwierzytelnieniu dashboard renderuje inwentarz pamięci, ślady, wyniki eval
i kolejkę przeglądu zarządzania.

## 7. (Opcjonalnie) Podłącz Claude Code przez MCP

Dodaj to do sekcji serwerów MCP `claude_desktop_config.json` Claude Code:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<wklej swój $LORE_API_KEY tutaj>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Uruchom ponownie Claude Code. Narzędzia MCP Lore Context (`context_query`, `memory_write` itp.)
stają się dostępne.

Dla innych środowisk IDE agentów (Cursor, Qwen, Dify, FastGPT itp.), zobacz macierz integracji w
[docs/integrations/README.md](../integrations.md).

## 8. (Opcjonalnie) Przełącz na Postgres + pgvector

Gdy magazynowanie w pliku JSON staje się za małe:

```bash
docker compose up -d postgres
pnpm db:schema   # stosuje apps/api/src/db/schema.sql przez psql
```

Następnie uruchom API z `LORE_STORE_DRIVER=postgres`:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Uruchom `pnpm smoke:postgres`, by zweryfikować, że round trip zapis-restart-odczyt przeżywa.

## 9. (Opcjonalnie) Zasilaj demonstracyjny zbiór danych i uruchom eval

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

Raport eval ląduje w `output/eval-reports/` jako Markdown i JSON.

## Następne kroki

- **Wdrożenie produkcyjne** — [docs/deployment/README.md](../deployment.md)
- **Dokumentacja API** — [docs/api-reference.md](../api-reference.md)
- **Szczegóły architektury** — [docs/architecture.md](../architecture.md)
- **Przepływ przeglądu zarządzania** — zobacz sekcję `Przepływ zarządzania` w
  [docs/architecture.md](../architecture.md)
- **Przenośność pamięci (MIF)** — `pnpm --filter @lore/mif test` pokazuje przykłady round-trip
- **Współtworzenie** — [CONTRIBUTING.md](../CONTRIBUTING.md)

## Typowe problemy

| Objaw | Przyczyna | Rozwiązanie |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Inny proces jest na porcie 3000 | `lsof -i :3000` by go znaleźć; lub ustaw `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Tryb produkcyjny bez `DASHBOARD_BASIC_AUTH_USER/PASS` | Eksportuj zmienne env lub przekaż `LORE_DASHBOARD_DISABLE_AUTH=1` (tylko dev) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Dowolne env pasowało do `admin-local` / `change-me` / `demo` itp. | Generuj prawdziwe wartości przez `openssl rand -hex 32` |
| `429 Too Many Requests` | Wyzwolony limit szybkości | Poczekaj okno cool-off (domyślnie 30s po 5 błędach uwierzytelniania); lub ustaw `LORE_RATE_LIMIT_DISABLED=1` w dev |
| `agentmemory adapter unhealthy` | Lokalne środowisko uruchomieniowe agentmemory nie działa | Uruchom agentmemory lub ustaw `LORE_AGENTMEMORY_REQUIRED=0` dla cichego pominięcia |
| Klient MCP widzi `-32602 Invalid params` | Wejście narzędzia nie przeszło walidacji schematu zod | Sprawdź tablicę `invalid_params` w treści błędu |
| Dashboard 401 na każdej stronie | Błędne poświadczenia Basic Auth | Ponownie eksportuj zmienne env i uruchom ponownie proces dashboardu |

## Uzyskiwanie pomocy

- Zgłoś błąd: https://github.com/Lore-Context/lore-context/issues
- Zgłoszenie bezpieczeństwa: zobacz [SECURITY.md](../SECURITY.md)
- Współtwórz dokumentację: zobacz [CONTRIBUTING.md](../CONTRIBUTING.md)
