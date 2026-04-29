> 🤖 Ten dokument został przetłumaczony maszynowo z języka angielskiego. Ulepszenia poprzez PR są mile widziane — zobacz [przewodnik dla tłumaczy](../README.md).

# Współtworzenie Lore Context

Dziękujemy za ulepszanie Lore Context. Ten projekt jest płaszczyzną sterowania kontekstem agenta AI w fazie alpha,
więc zmiany powinny zachować operację local-first, audytowalność i bezpieczeństwo wdrożenia.

## Kodeks postępowania

Ten projekt stosuje się do [Contributor Covenant](../../CODE_OF_CONDUCT.md). Uczestnicząc
zgadzasz się go przestrzegać.

## Konfiguracja środowiska deweloperskiego

Wymagania:

- Node.js 22 lub nowszy
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (Opcjonalnie) Docker dla ścieżki Postgres
- (Opcjonalnie) `psql` jeśli wolisz samodzielnie zastosować schemat

Typowe polecenia:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # wymaga docker compose up -d postgres
pnpm run doctor
```

Dla pracy per pakiet:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore-context/server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Oczekiwania dotyczące Pull Request

- **Utrzymuj zmiany skoncentrowane i odwracalne.** Jeden problem per PR; jeden PR per problem.
- **Dodawaj testy** dla zmian zachowania. Preferuj prawdziwe asercje nad snapshotami.
- **Uruchom `pnpm build` i `pnpm test`** przed prośbą o przegląd. CI też je uruchamia,
  ale lokalnie jest szybciej.
- **Uruchom odpowiedni smoke test** przy zmianie zachowania API, dashboardu, MCP, Postgres,
  importu/eksportu, eval lub wdrożenia.
- **Nie commituj** wygenerowanych wyników budowania, lokalnych magazynów, plików `.env`,
  poświadczeń lub prywatnych danych klientów. `.gitignore` pokrywa większość ścieżek;
  jeśli tworzysz nowe artefakty, upewnij się, że są wykluczone.
- **Pozostań w zakresie swojego PR.** Nie refaktoryzuj niepowiązanego kodu przy okazji.

## Architektoniczne ograniczenia

Są one niezbywalne dla v0.4.x. Jeśli PR je narusza, oczekuj prośby o
podział lub przepracowanie:

- **Local-first pozostaje priorytetem.** Nowa funkcjonalność musi działać bez hostowanej
  usługi lub zewnętrznej zależności SaaS.
- **Brak nowych obejść powierzchni uwierzytelniania.** Każda trasa pozostaje chroniona przez klucz API + rolę.
  Loopback nie jest szczególnym przypadkiem w produkcji.
- **Brak bezpośredniego dostępu do `agentmemory`.** Zewnętrzni wywołujący uzyskują dostęp do pamięci wyłącznie przez punkty końcowe Lore.
- **Integralność dziennika audytu.** Każda mutacja wpływająca na stan pamięci zapisuje
  wpis audytu.
- **Zamknij się przy brakującej konfiguracji.** Uruchomienie w trybie produkcyjnym odmawia rozpoczęcia, jeśli
  wymagane zmienne środowiskowe są placeholderami lub brakuje ich.

## Wiadomości commit

Lore Context używa małego, skostniałego formatu commit inspirowanego wytycznymi jądra Linux.

### Format

```text
<type>: <krótkie podsumowanie w trybie rozkazującym>

<opcjonalne ciało wyjaśniające, dlaczego ta zmiana jest potrzebna i jakie kompromisy obowiązują>

<opcjonalne stopki>
```

### Typy

- `feat` — nowa widoczna dla użytkownika funkcjonalność lub punkt końcowy API
- `fix` — poprawka błędu
- `refactor` — restrukturyzacja kodu bez zmiany zachowania
- `chore` — higiena repozytorium (zależności, narzędzia, przenoszenie plików)
- `docs` — tylko dokumentacja
- `test` — tylko zmiany testów
- `perf` — poprawa wydajności z mierzalnym wpływem
- `revert` — cofanie poprzedniego commita

### Styl

- **Małe litery** dla typu i pierwszego słowa podsumowania.
- **Bez końcowej kropki** w linii podsumowania.
- **≤72 znaków** w linii podsumowania; zawijaj ciało co 80.
- **Tryb rozkazujący**: "fix loopback bypass", nie "fixed" lub "fixes".
- **Dlaczego zamiast co**: diff pokazuje co się zmieniło; ciało powinno wyjaśniać dlaczego.
- **Nie dołączaj** stopek `Co-Authored-By`, atrybucji AI lub
  wierszy signed-off-by, chyba że jest to wyraźnie wymagane przez użytkownika.

### Przydatne stopki

Gdy dotyczy, dodaj stopki, aby uchwycić ograniczenia i kontekst dla recenzenta:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### Przykład

```text
fix: loopback bypass — remove host-header trust, fail closed in production

Previous versions trusted the Host header for loopback detection, allowing a
remote attacker to spoof "Host: 127.0.0.1" and obtain admin role with no API
key when LORE_API_KEYS was unset. Loopback detection now uses
req.socket.remoteAddress only, and production with empty keys returns 401.

Constraint: Local development without keys still works on loopback
Confidence: high
Scope-risk: narrow (auth path only)
Tested: pnpm test (added loopback-bypass test case), pnpm smoke:api
```

## Granularność commitów

- Jedna logiczna zmiana per commit. Recenzenci mogą cofać atomowo bez
  szkód ubocznych.
- Scal trywialne poprawki (`typo`, `lint`, `prettier`) do commita nadrzędnego
  przed otwarciem lub aktualizacją PR.
- Wieloplikowe refaktoryzacje są dopuszczalne w jednym commicie, jeśli mają jeden wspólny
  powód.

## Proces przeglądu

- Opiekun przejrzy Twój PR w ciągu 7 dni podczas typowej aktywności.
- Adresuj wszystkie blokujące komentarze przed ponownym prośbą o przegląd.
- Dla nieblokujących komentarzy, odpowiedź inline z uzasadnieniem lub zgłoszenie follow-up
  jest akceptowalne.
- Opiekunowie mogą dodać etykietę `merge-queue` po zatwierdzeniu PR; nie rób rebase
  ani force-push po zastosowaniu tej etykiety.

## Tłumaczenia dokumentacji

Jeśli chcesz ulepszyć przetłumaczony README lub plik dokumentacji, zobacz
[przewodnik dla tłumaczy i18n](../../i18n/README.md).

## Zgłaszanie błędów

- Zgłoś publiczne zgłoszenie na https://github.com/Lore-Context/lore-context/issues
  chyba że błąd jest podatnością bezpieczeństwa.
- W przypadku problemów bezpieczeństwa, postępuj zgodnie z [SECURITY.md](../../../SECURITY.md).
- Dołącz: wersję lub commit, środowisko, reprodukcję, oczekiwane vs rzeczywiste,
  logi (z redaktowaną wrażliwą zawartością).

## Podziękowania

Lore Context to mały projekt próbujący zrobić coś przydatnego dla infrastruktury agentów AI.
Każdy dobrze ukierunkowany PR go napędza.
