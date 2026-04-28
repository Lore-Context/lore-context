> 🤖 Ten dokument został przetłumaczony maszynowo z języka angielskiego. Ulepszenia poprzez PR są mile widziane — zobacz [przewodnik dla tłumaczy](../README.md).

# Wdrożenie prywatne

> **Generuj klucze za pomocą `openssl rand -hex 32` — nigdy nie używaj poniższych placeholderów w produkcji.**

Ten fragment pakuje Lore do prywatnej demonstracji lub wewnętrznego wdrożenia zespołowego bez zmiany ścieżek kodu aplikacji. Pakiet wdrożeniowy składa się z:

- `apps/api/Dockerfile`: obraz REST API.
- `apps/dashboard/Dockerfile`: samodzielny obraz dashboardu Next.js.
- `Dockerfile`: opcjonalny obraz launchera MCP dla klientów stdio.
- `docs/deployment/compose.private-demo.yml`: stos compose do skopiowania dla Postgres, API, dashboardu i usługi MCP na żądanie.
- `examples/demo-dataset/**`: dane seed dla przepływów file-store, importu i eval.

## Zalecana topologia

- `postgres`: trwały magazyn dla współdzielonych lub wielooperatorskich demonstracji.
- `api`: Lore REST API w wewnętrznej sieci mostkowej, domyślnie publikowany na loopback.
- `dashboard`: interfejs operatora, domyślnie publikowany na loopback i proxy do API przez `LORE_API_URL`.
- `mcp`: opcjonalny kontener stdio dla operatorów Claude, Cursor i Qwen, którzy chcą skonteneryzowanego launchera zamiast `node apps/mcp-server/dist/index.js` na hoście.

Stos compose celowo utrzymuje wąskie publiczne wystawienie. Postgres, API i dashboard domyślnie wiążą się z `127.0.0.1` przez zmiennoparametryczne mapowania portów.

## Preflight

1. Skopiuj `.env.example` do prywatnego pliku uruchomieniowego, np. `.env.private`.
2. Zastąp `POSTGRES_PASSWORD`.
3. Preferuj `LORE_API_KEYS` zamiast pojedynczego `LORE_API_KEY`.
4. Ustaw `DASHBOARD_LORE_API_KEY` na klucz `admin` dla pełnego przepływu pracy operatora lub na zakresowy klucz `reader` dla demonstracji tylko do odczytu. Ustaw `MCP_LORE_API_KEY` na klucz `writer` lub `reader` w zależności od tego, czy klient powinien mutować pamięć.

Przykładowe rozdzielenie ról:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
DASHBOARD_BASIC_AUTH_USER=admin
DASHBOARD_BASIC_AUTH_PASS=<YOUR_DASHBOARD_PASSWORD>
```

## Uruchom stos

Zbuduj i uruchom prywatny stos demonstracyjny z głównego katalogu repozytorium:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Sprawdzenie stanu:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl -u "${DASHBOARD_BASIC_AUTH_USER}:${DASHBOARD_BASIC_AUTH_PASS}" \
  http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Zasilaj danymi demonstracyjnymi

Dla stosu compose z Postgres, zaimportuj spakowane demonstracyjne pamięci po tym, jak API jest gotowe:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Uruchom spakowane żądanie eval:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Jeśli chcesz demonstrację bez bazy danych na jednym hoście, wskaż API na snapshot file-store:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## Wzorce launchera MCP

Preferowany wzorzec:

- Uruchom launcher MCP blisko klienta.
- Wskaż `LORE_API_URL` na prywatny URL API.
- Dostarcz najmniejszy odpowiedni klucz API do launchera.

Launcher oparty na hoście:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Skonteneryzowany launcher:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

Skonteneryzowany launcher jest przydatny do reprodukowalnej konfiguracji stacji roboczej, ale nadal jest procesem stdio, a nie długo działającą publiczną usługą sieciową.

## Domyślne ustawienia bezpieczeństwa

- Utrzymuj `API_BIND_HOST`, `DASHBOARD_BIND_HOST` i `POSTGRES_BIND_HOST` na `127.0.0.1`, chyba że uwierzytelniony reverse proxy jest już przed stosem.
- Preferuj `LORE_API_KEYS` z rozdzieleniem `reader` / `writer` / `admin` zamiast ponownego używania jednego globalnego klucza admin wszędzie.
- Używaj kluczy zakresowanych na projekt dla klientów demonstracyjnych. Spakowane id projektu demonstracyjnego to `demo-private`.
- Utrzymuj `AGENTMEMORY_URL` na loopback i nie wystawiaj surowego `agentmemory` bezpośrednio.
- Zostaw `LORE_AGENTMEMORY_REQUIRED=0`, chyba że prywatne wdrożenie naprawdę zależy od działającego środowiska uruchomieniowego agentmemory.
- Utrzymuj `LORE_POSTGRES_AUTO_SCHEMA=true` tylko dla kontrolowanych środowisk wewnętrznych. Gdy bootstrapping schematu jest częścią Twojego procesu wydawania, możesz przypiąć go do `false`.

## Pliki do ponownego użycia

- Przykład compose: [compose.private-demo.yml](../../../docs/deployment/compose.private-demo.yml)
- Obraz API: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Obraz dashboardu: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- Obraz MCP: [Dockerfile](../../../Dockerfile)
- Dane demonstracyjne: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
