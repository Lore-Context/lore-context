> 🤖 Ten dokument został przetłumaczony maszynowo z języka angielskiego. Ulepszenia poprzez PR są mile widziane — zobacz [przewodnik dla tłumaczy](../README.md).

# Changelog

Wszystkie istotne zmiany w Lore Context są tutaj udokumentowane. Format jest oparty na
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), a projekt
przestrzega [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v0.4.0-alpha] — 2026-04-28

Pierwsza publiczna wersja alpha. Zamyka sprint utwardzania produkcyjnego, który zamienił
MVP po nieudanym audycie w kandydata na wydanie alpha. Wszystkie pozycje P0 audytu wyczyszczone, 12 z 13 pozycji P1
wyczyszczonych (jedna częściowo — patrz Uwagi), 117+ testów przechodzi, pełny build monorepo czysty.

### Dodano

- **`packages/eval/src/runner.ts`** — prawdziwy `EvalRunner` (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). Ewaluacja może teraz przeprowadzić kompleksową ocenę pobierania na
  zbiorze danych będącym własnością użytkownika i utrwalić przebiegi jako JSON do wykrywania regresji w czasie.
- **`packages/governance/src/state.ts`** — sześcioetapowa maszyna stanów zarządzania
  (`candidate / active / flagged / redacted / superseded / deleted`) z jawną tabelą
  legalnych przejść. Nielegalne przejścia zgłaszają wyjątek.
- **`packages/governance/src/audit.ts`** — niezmienny pomocnik dołączający do dziennika audytu zintegrowany
  z typem `AuditLog` z `@lore/shared`.
- **`packages/governance/detectPoisoning`** — heurystyka wykrywania zatruwania pamięci
  przy użyciu dominacji źródła (>80%) i dopasowywania wzorców czasowników rozkazujących.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — sonda wersji upstream oparta na semver
  z ręcznie napisanym porównaniem (bez nowych zależności). Honoruje
  `LORE_AGENTMEMORY_REQUIRED=0` dla trybu zdegradowanego z cichym pominięciem.
- **`packages/mif`** — pola `supersedes: string[]` i `contradicts: string[]` dodane
  do `LoreMemoryItem`. Pełen round-trip zachowany w formatach JSON i Markdown.
- **`apps/api/src/logger.ts`** — strukturalny logger JSON z automatyczną redakcją
  pól wrażliwych (`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`). `requestId` przepływa przez każde żądanie.
- **`apps/dashboard/middleware.ts`** — oprogramowanie pośredniczące HTTP Basic Auth. Uruchomienie produkcyjne
  odmawia rozpoczęcia bez `DASHBOARD_BASIC_AUTH_USER` i `DASHBOARD_BASIC_AUTH_PASS`.
- **`scripts/check-env.mjs`** — walidator środowiska w trybie produkcyjnym. Odmawia uruchomienia
  aplikacji, jeśli dowolna wartość środowiskowa odpowiada wzorcowi placeholdera (`read-local`,
  `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`).
- **Limit szybkości** — ogranicznik tokenów per-IP i per-key z podwójnym kubełkiem z backoffem przy błędach uwierzytelniania
  (5 błędów w 60s → blokada 30s → odpowiedź 429). Konfigurowalny przez
  `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED`.
- **Łagodne wyłączanie** — handlery SIGTERM/SIGINT odsączają żądania w locie do 10s,
  opróżniają oczekujące zapisy Postgres, zamykają pulę, wymuszają wyjście po 15s.
- **Indeksy bazy danych** — indeksy B-tree na `(project_id)` / `(status)` /
  `(created_at)` dla `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs`. Indeksy GIN na jsonb `content` i `metadata`.
- **Walidacja wejść MCP zod** — każde narzędzie MCP uruchamia teraz `safeParse` na
  per-tool schemacie zod; błędy zwracają JSON-RPC `-32602` z oczyszczonymi problemami.
- **MCP `destructiveHint` + wymagany `reason`** — każde narzędzie mutujące
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) wymaga
  `reason` co najmniej 8 znaków i ujawnia `destructiveHint: true`.
- 117+ nowych przypadków testowych w `apps/api`, `apps/mcp-server`, `packages/eval`,
  `packages/governance`, `packages/mif`, `packages/agentmemory-adapter`.
- Wielojęzyczna dokumentacja: README w 17 językach w `docs/i18n/<lang>/`.
- `CHANGELOG.md` (ten plik).
- `docs/getting-started.md` — 5-minutowy szybki start dla deweloperów.
- `docs/api-reference.md` — dokumentacja REST API.
- `docs/i18n/README.md` — przewodnik dla tłumaczy.

### Zmieniono

- Wersja envelope **`packages/mif`** `"0.1"` → `"0.2"`. Import wstecznie kompatybilny.
- Domyślna wartość **`LORE_POSTGRES_AUTO_SCHEMA`** `true` → `false`. Wdrożenia produkcyjne
  muszą jawnie włączyć automatyczne stosowanie schematu lub uruchomić `pnpm db:schema`.
- Parser treści żądania **`apps/api`** jest teraz strumieniowy z twardym limitem rozmiaru ładunku
  (`LORE_MAX_JSON_BYTES`, domyślnie 1 MiB). Zbyt duże żądania zwracają 413.
- **Uwierzytelnianie loopback** zmienione: usunięto poleganie na nagłówku URL `Host`; wykrywanie loopback
  używa teraz wyłącznie `req.socket.remoteAddress`. W produkcji bez skonfigurowanych kluczy API
  API zamyka się i odmawia żądań (poprzednio: cicho przyznawało rolę admin).
- **Klucze API z zakresem** muszą teraz podawać `project_id` dla `/v1/memory/list`,
  `/v1/eval/run` i `/v1/memory/import` (poprzednio: niezdefiniowany `project_id` powodował obejście).
- **Wszystkie Dockerfile** uruchamiają się teraz jako nieuprzywilejowany użytkownik `node`. `apps/api/Dockerfile` i
  `apps/dashboard/Dockerfile` deklarują `HEALTHCHECK`.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` używa teraz `${POSTGRES_PASSWORD:?must
  be set}` — uruchomienie kończy się szybko bez jawnego hasła.
- **`docs/deployment/compose.private-demo.yml`** — ten sam wzorzec wymaganego lub powodującego błąd.
- **`.env.example`** — wszystkie domyślne demo usunięte i zastąpione placeholderami `# REQUIRED`.
  Nowe zmienne udokumentowane dla limitu szybkości, timeoutu żądania, limitu ładunku,
  wymaganego trybu agentmemory, basic auth dashboardu.

### Naprawiono

- **Podatność na ominięcie uwierzytelniania loopback** (P0). Atakujący mógł wysłać `Host: 127.0.0.1`
  by sfałszować wykrywanie loopback i uzyskać rolę admin bez klucza API.
- **Atak confused-deputy w proxy dashboardu** (P0). Proxy dashboardu wstrzykiwało
  `LORE_API_KEY` dla nieuwierzytelnionych żądań, dając uprawnienia admin każdemu, kto mógł
  dotrzeć do portu 3001.
- **Obrona przed brute-force** (P0). Klucze demo (`admin-local`, `read-local`, `write-local`)
  pokazane w README/`.env.example` mogły być wyliczane bez ograniczeń; limit szybkości i
  usunięte domyślne wartości bronią teraz przed tym.
- **Awaria parsowania JSON przy uszkodzonym `LORE_API_KEYS`** — proces wychodzi teraz z jasnym
  błędem zamiast wyrzucać stack trace.
- **OOM przez duże ciało żądania** — ciała powyżej skonfigurowanego limitu zwracają teraz 413
  zamiast crashować proces Node.
- **Wyciek błędów MCP** — błędy upstream API zawierające surowy SQL, ścieżki plików lub
  stack trace są teraz sanityzowane do `{code, generic-message}` przed dotarciem do klientów MCP.
- **Awaria parsowania JSON dashboardu** — nieprawidłowe odpowiedzi JSON nie crashują już interfejsu;
  błędy są widoczne dla użytkownika jako stan.
- **MCP `memory_update` / `memory_supersede`** poprzednio nie wymagały
  `reason`; jest to teraz egzekwowane przez schemat zod.
- **Pula Postgres**: `statement_timeout` ustawiony teraz na 15s; poprzednio nieograniczony
  czas zapytania przy uszkodzonych zapytaniach jsonb.

### Bezpieczeństwo

- Wszystkie ustalenia audytu P0 (obejście loopback / uwierzytelnianie dashboardu / limit szybkości / sekrety demo)
  wyczyszczone. Zobacz public release notes po pełny ślad audytu.
- `pnpm audit --prod` zgłasza zero znanych podatności w momencie wydania.
- Poświadczenia demo usunięte ze wszystkich szablonów wdrożeniowych i przykładowych README.
- Obrazy kontenerów uruchamiają się teraz domyślnie jako nieuprzywilejowane.

### Uwagi / Znane ograniczenia

- **Częściowe P1-1**: `/v1/context/query` zachowuje permisywne zachowanie kluczy z zakresem,
  aby nie łamać istniejących testów konsumentów. Inne dotknięte trasy (`/v1/memory/list`,
  `/v1/eval/run`, `/v1/memory/import`) wymuszają `project_id`. Śledzone dla v0.5.
- **Hostowana wielodostępna synchronizacja w chmurze** nie jest zaimplementowana w v0.4.0-alpha. Tylko wdrożenia
  lokalne i Compose-private.
- **Jakość tłumaczeń**: lokalizacje README są generowane przez LLM i wyraźnie
  oznaczone; PR społeczności do doprecyzowania każdego języka są mile widziane (zobacz
  [`docs/i18n/README.md`](../../i18n/README.md)).
- **Specyfikacja OpenAPI / Swagger** nie jest jeszcze spakowana. Powierzchnia REST jest udokumentowana
  w prozie w [`docs/api-reference.md`](../../api-reference.md). Śledzone dla v0.5.

### Podziękowania

To wydanie jest wynikiem jednodniowego sprintu utwardzania produkcyjnego z
równoległym wykonaniem pod-agentów na podstawie ustrukturyzowanego planu audytu. Plan i artefakty audytu

## [v0.0.0] — pre-release

Wewnętrzne kamienie milowe rozwoju, nieupublicznione. Zaimplementowano:

- Szablony pakietów przestrzeni roboczej (monorepo TypeScript, przestrzenie robocze pnpm).
- Współdzielony pipeline build/test TypeScript.
- System typów pamięci / kontekstu / eval / audytu w `@lore/shared`.
- Granica adaptera `agentmemory`.
- Lokalny REST API z routerem i kompozytorem kontekstu.
- Trwałość w pliku JSON + opcjonalny magazyn uruchomieniowy Postgres z inkrementalnym upsert.
- Przepływy szczegółów / edycji / zastępowania / zapominania pamięci z jawnym twardym usunięciem.
- Prawdziwe rozliczanie użycia pamięci (`useCount`, `lastUsedAt`).
- Informacja zwrotna o śladzie (`useful` / `wrong` / `outdated` / `sensitive`).
- Import/eksport JSON + Markdown podobny do MIF z polami zarządzania.
- Zestaw regex do skanowania sekretów.
- Bezpośrednie metryki eval oparte na sesji; przebiegi eval porównujące dostawców; listowanie przebiegów eval.
- Ochrona kluczem API z rozdzieleniem ról reader/writer/admin.
- Kolejka przeglądu zarządzania; API dziennika audytu.
- HTML dashboardu serwowany przez API; samodzielny dashboard Next.js.
- Demonstracyjne dane seed; generowanie konfiguracji integracji.
- Prywatne pakowanie Docker/Compose.
- Transporty MCP stdio legacy + oficjalny SDK.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
