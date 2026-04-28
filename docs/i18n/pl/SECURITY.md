> 🤖 Ten dokument został przetłumaczony maszynowo z języka angielskiego. Ulepszenia poprzez PR są mile widziane — zobacz [przewodnik dla tłumaczy](../README.md).

# Polityka bezpieczeństwa

Lore Context obsługuje pamięć, ślady, dzienniki audytu i poświadczenia integracyjne. Traktuj
zgłoszenia bezpieczeństwa jako priorytetowe.

## Zgłaszanie podatności

Nie otwieraj publicznego zgłoszenia w przypadku podejrzanych podatności, wyciekłych sekretów, obejść uwierzytelniania,
ujawnienia danych lub problemów z izolacją dzierżawców.

Preferowana ścieżka zgłaszania:

1. Użyj **prywatnego zgłaszania podatności GitHub** dla tego repozytorium, gdy jest dostępne.
2. Jeśli prywatne zgłaszanie jest niedostępne, skontaktuj się z opiekunami prywatnie i
   dołącz:
   - wersję lub commit, którego dotyczy problem,
   - kroki reprodukcji,
   - oczekiwany wpływ,
   - czy zaangażowane są prawdziwe sekrety lub dane osobowe.

Dążymy do potwierdzenia wiarygodnych zgłoszeń w ciągu 72 godzin.

## Obsługiwane wersje

Lore Context jest obecnie oprogramowaniem alpha w wersji przed 1.0. Poprawki bezpieczeństwa trafiają najpierw do gałęzi `main`.
Oznaczone wydania mogą otrzymywać ukierunkowane łatki, gdy dane publiczne wydanie jest
aktywnie używane przez operatorów downstream.

| Wersja | Obsługiwana |
|---|---|
| v0.4.x-alpha | ✅ Aktywna |
| v0.3.x i wcześniejsze | ❌ Wyłącznie wewnętrzne pre-release |

## Wbudowane zabezpieczenia (v0.4.0-alpha)

Wersja alpha zawiera następujące mechanizmy ochrony warstwowej. Operatorzy powinni
zweryfikować, czy są aktywne w ich wdrożeniu.

### Uwierzytelnianie

- **Tokeny nośne kluczy API** (`Authorization: Bearer <key>` lub nagłówek
  `x-lore-api-key`).
- **Rozdzielenie ról**: `reader` / `writer` / `admin`.
- **Zakresowanie per projekt**: wpisy JSON `LORE_API_KEYS` mogą zawierać
  listę zezwoleń `projectIds: ["..."]`; mutacje wymagają pasującego `project_id`.
- **Tryb pustych kluczy zamyka się w produkcji**: przy `NODE_ENV=production` i braku
  skonfigurowanych kluczy API odmawia wszystkich żądań.
- **Obejście loopback usunięte**: poprzednie wersje ufały `Host: 127.0.0.1`; v0.4 używa
  wyłącznie adresu zdalnego na poziomie gniazda.

### Limit szybkości

- **Podwójny kubeł per-IP i per-key** z backoffem przy błędach uwierzytelniania.
- **Wartości domyślne**: 60 req/min per IP dla ścieżek nieuwierzytelnionych, 600 req/min per uwierzytelniony klucz.
- **5 błędów uwierzytelniania w 60s → blokada 30s** (zwraca 429).
- Konfigurowalny: `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED=1` (wyłącznie dev).

### Ochrona dashboardu

- **Oprogramowanie pośredniczące HTTP Basic Auth** (`apps/dashboard/middleware.ts`).
- **Uruchomienie produkcyjne odmawia rozpoczęcia** bez
  `DASHBOARD_BASIC_AUTH_USER` i `DASHBOARD_BASIC_AUTH_PASS`.
- `LORE_DASHBOARD_DISABLE_AUTH=1` jest honorowane wyłącznie poza produkcją.
- Awaryjny klucz admin po stronie serwera **usunięty**: użytkownik musi być uwierzytelniony przez
  Basic Auth, zanim proxy dashboardu wstrzyknie poświadczenia API upstream.

### Utwardzanie kontenerów

- Wszystkie Dockerfile uruchamiają się jako nieuprzywilejowany użytkownik `node`.
- `apps/api/Dockerfile` i `apps/dashboard/Dockerfile` deklarują `HEALTHCHECK`
  na `/health`.
- `apps/mcp-server` jest wyłącznie stdio — bez nasłuchiwacza sieciowego — i nie deklaruje
  `HEALTHCHECK`.

### Zarządzanie sekretami

- **Zero zakodowanych na stałe poświadczeń.** Wszystkie `docker-compose.yml`,
  `docs/deployment/compose.private-demo.yml` i domyślne `.env.example` używają
  formy `${VAR:?must be set}` — uruchomienie kończy się szybko bez jawnych wartości.
- `scripts/check-env.mjs` odrzuca wartości placeholder
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`,
  `dev`, `password`) gdy `NODE_ENV=production`.
- Wszystkie dokumenty wdrożeniowe i przykładowe README zostały oczyszczone z dosłownych poświadczeń demo.

### Zarządzanie

- **Skanowanie znaczników ryzyka przy każdym zapisie pamięci**: wykrywane klucze API, klucze AWS, tokeny JWT,
  klucze prywatne, hasła, e-maile, numery telefonów.
- **Sześcioetapowa maszyna stanów** z jawną tabelą legalnych przejść; nielegalne
  przejścia zgłaszają wyjątek.
- **Heurystyki zatruwania pamięci**: dominacja tego samego źródła + dopasowywanie wzorców czasowników rozkazujących
  → flaga `suspicious`.
- **Niezmienny dziennik audytu** dołączany przy każdej zmianie stanu.
- Treści wysokiego ryzyka automatycznie kierowane do `candidate` / `flagged` i wstrzymywane od
  kompozycji kontekstu do czasu przeglądu.

### Utwardzanie MCP

- Każde wejście narzędzia MCP jest **walidowane względem schematu zod** przed wywołaniem.
  Błędy walidacji zwracają JSON-RPC `-32602` z oczyszczoną listą problemów.
- **Wszystkie narzędzia mutujące** wymagają ciągu `reason` co najmniej 8 znaków i
  ujawniają `destructiveHint: true` w swoim schemacie.
- Błędy API upstream są **sanityzowane** przed zwróceniem klientom MCP —
  surowy SQL, ścieżki plików i stack trace są usuwane.

### Logowanie

- **Strukturalne wyjście JSON** z korelacją `requestId` przez cały łańcuch handlerów.
- **Automatyczna redakcja** pól pasujących do `content`, `query`, `memory`, `value`,
  `password`, `secret`, `token`, `key`. Rzeczywista zawartość rekordów pamięci i
  zapytań nigdy nie jest zapisywana do logów.

### Granice danych

- Adapter `agentmemory` sonduje wersję upstream przy inicjalizacji i ostrzega o
  niezgodności. `LORE_AGENTMEMORY_REQUIRED=0` przełącza adapter w tryb cichego zdegradowanego
  jeśli upstream jest nieosiągalny.
- Parser treści żądania `apps/api` egzekwuje limit `LORE_MAX_JSON_BYTES` (domyślnie 1
  MiB); zbyt duże żądania zwracają 413.
- Pula połączeń Postgres ustawia `statement_timeout: 15000` by ograniczyć czas zapytania.
- `LORE_REQUEST_TIMEOUT_MS` (domyślnie 30s) ogranicza każdy handler żądania;
  timeouty zwracają 504.

## Wskazówki dotyczące wdrożenia

- Nie wystawiaj Lore zdalnie bez skonfigurowanego `LORE_API_KEYS`.
- Preferuj klucze `reader` / `writer` / `admin` z **rozdzieleniem ról**.
- **Zawsze ustawiaj** `DASHBOARD_BASIC_AUTH_USER` i `DASHBOARD_BASIC_AUTH_PASS` w
  produkcji.
- **Generuj klucze za pomocą `openssl rand -hex 32`**. Nigdy nie używaj wartości placeholder
  pokazanych w przykładach.
- Utrzymuj surowe punkty końcowe `agentmemory` prywatne; uzyskuj do nich dostęp tylko przez Lore.
- Utrzymuj trasy dashboardu, zarządzania, importu/eksportu, synchronizacji i audytu za
  warstwą kontroli dostępu do sieci (Cloudflare Access, AWS ALB, Tailscale ACL,
  podobne) dla każdego wystawienia innego niż loopback.
- **Uruchom `node scripts/check-env.mjs` przed uruchomieniem API w produkcji.**
- **Nigdy nie commituj** produkcyjnych plików `.env`, kluczy API dostawców, poświadczeń chmury,
  danych eval zawierających treści klientów lub prywatnych eksportów pamięci.

## Harmonogram ujawniania

Dla potwierdzonych podatności o wysokim wpływie:

- 0 dni: zgłoszenie potwierdzone.
- 7 dni: triażowanie i klasyfikacja powagi udostępnione zgłaszającemu.
- 30 dni: koordynowane publiczne ujawnienie (lub przedłużone za obopólną zgodą).
- 30+ dni: wydanie CVE dla powagi medium+ jeśli dotyczy.

Dla problemów o niższej powadze, oczekuj rozwiązania w następnym wydaniu minor.

## Mapa drogowa utwardzania

Pozycje planowane na kolejne wydania:

- **v0.5**: specyfikacja OpenAPI / Swagger; integracja CI `pnpm audit --high`,
  statyczna analiza CodeQL i dependabot.
- **v0.6**: obrazy kontenerów podpisane przez Sigstore, proweniencja SLSA, publikacja npm przez
  GitHub OIDC zamiast długo żyjących tokenów.
- **v0.7**: Szyfrowanie w spoczynku dla zawartości pamięci oznaczonej `risk_tags` przez szyfrowanie
  kopertowe KMS.
