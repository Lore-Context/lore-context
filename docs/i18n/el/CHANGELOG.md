> 🤖 Αυτό το έγγραφο μεταφράστηκε αυτόματα από τα Αγγλικά. Καλωσορίζονται βελτιώσεις μέσω PR — δείτε τον [οδηγό συνεισφοράς μετάφρασης](../README.md).

# Αρχείο αλλαγών

Όλες οι αξιοσημείωτες αλλαγές στο Lore Context τεκμηριώνονται εδώ. Η μορφή βασίζεται στο
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) και αυτό το έργο
συμμορφώνεται με το [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v0.4.0-alpha] — 2026-04-28

Πρώτο δημόσιο alpha. Ολοκληρώνει το sprint σκλήρυνσης παραγωγής που μετέτρεψε το
MVP που απέτυχε στον έλεγχο σε ένα alpha υποψήφιο έκδοσης. Όλα τα στοιχεία P0 ελέγχου
εκκαθαρίστηκαν, 12 από 13 στοιχεία P1 εκκαθαρίστηκαν (ένα μερικό — δείτε Σημειώσεις),
117+ tests περνούν, το monorepo build είναι καθαρό.

### Προστέθηκαν

- **`packages/eval/src/runner.ts`** — πραγματικός `EvalRunner` (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). Το Eval μπορεί τώρα να εκτελέσει αξιολόγηση ανάκτησης end-to-end
  σε σύνολο δεδομένων του χρήστη και να διατηρήσει εκτελέσεις ως JSON για ανίχνευση παλινδρόμησης
  cross-time.
- **`packages/governance/src/state.ts`** — μηχανή κατάστασης διακυβέρνησης έξι καταστάσεων
  (`candidate / active / flagged / redacted / superseded / deleted`) με ρητό νομικό πίνακα
  μεταβάσεων. Παράνομες μεταβάσεις ρίχνουν εξαίρεση.
- **`packages/governance/src/audit.ts`** — βοηθός προσάρτησης αμετάβλητου αρχείου ελέγχου
  ενσωματωμένος με τον τύπο `AuditLog` του `@lore/shared`.
- **`packages/governance/detectPoisoning`** — ευρετική για ανίχνευση δηλητηρίασης μνήμης
  χρησιμοποιώντας κυριαρχία ίδιας πηγής (>80%) και αντιστοίχιση μοτίβου imperative-verb.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — ανίχνευση έκδοσης upstream
  βασισμένη στο semver με χειροποίητη σύγκριση (χωρίς νέα εξάρτηση). Τιμά
  `LORE_AGENTMEMORY_REQUIRED=0` για λειτουργία αθόρυβης παράλειψης degraded mode.
- **`packages/mif`** — πεδία `supersedes: string[]` και `contradicts: string[]` προστέθηκαν
  στο `LoreMemoryItem`. Ο κύκλος μεταφοράς διατηρείται σε μορφές JSON και Markdown.
- **`apps/api/src/logger.ts`** — δομημένος JSON logger με αυτόματη απόκρυψη
  ευαίσθητων πεδίων (`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`). Το `requestId` διαχέεται σε κάθε αίτηση.
- **`apps/dashboard/middleware.ts`** — ενδιάμεσο λογισμικό HTTP Basic Auth. Η εκκίνηση
  παραγωγής αρνείται να ξεκινήσει χωρίς `DASHBOARD_BASIC_AUTH_USER` και `DASHBOARD_BASIC_AUTH_PASS`.
- **`scripts/check-env.mjs`** — επικυρωτής env παραγωγής-λειτουργίας. Αρνείται να ξεκινήσει
  την εφαρμογή αν οποιαδήποτε τιμή περιβάλλοντος ταιριάζει με μοτίβο placeholder (`read-local`,
  `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`).
- **Όριο ρυθμού** — περιοριστής token διπλού κάδου ανά IP και ανά key με backoff αποτυχίας
  πιστοποίησης (5 αποτυχίες σε 60s → κλείδωμα 30s → απόκριση 429). Διαμορφώσιμο μέσω
  `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED`.
- **Ομαλός τερματισμός** — οι χειριστές SIGTERM/SIGINT εξαντλούν τα in-flight αιτήματα έως 10s,
  εκκαθαρίζουν εκκρεμείς εγγραφές Postgres, κλείνουν pool, αναγκαστική έξοδος στα 15s.
- **Ευρετήρια βάσης δεδομένων** — B-tree ευρετήρια σε `(project_id)` / `(status)` /
  `(created_at)` για `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs`. GIN ευρετήρια σε jsonb `content` και `metadata`.
- **MCP zod input validation** — κάθε εργαλείο MCP εκτελεί τώρα `safeParse` σε
  ένα zod schema ανά εργαλείο· οι αποτυχίες επιστρέφουν JSON-RPC `-32602` με εκκαθαρισμένα ζητήματα.
- **MCP `destructiveHint` + απαιτούμενο `reason`** — κάθε εργαλείο μεταβολής
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) απαιτεί ένα
  `reason` τουλάχιστον 8 χαρακτήρων και εμφανίζει `destructiveHint: true`.
- 117+ νέες δοκιμαστικές περιπτώσεις σε `apps/api`, `apps/mcp-server`, `packages/eval`,
  `packages/governance`, `packages/mif`, `packages/agentmemory-adapter`.
- Πολύγλωσση τεκμηρίωση: README σε 17 γλώσσες στο `docs/i18n/<lang>/`.
- `CHANGELOG.md` (αυτό το αρχείο).
- `docs/getting-started.md` — γρήγορη εκκίνηση 5 λεπτών για προγραμματιστές.
- `docs/api-reference.md` — αναφορά endpoint REST API.
- `docs/i18n/README.md` — οδηγός συνεισφοράς μετάφρασης.

### Άλλαξαν

- **`packages/mif`** έκδοση envelope `"0.1"` → `"0.2"`. Συμβατή εισαγωγή με προηγούμενες εκδόσεις.
- **`LORE_POSTGRES_AUTO_SCHEMA`** προεπιλογή `true` → `false`. Οι αναπτύξεις παραγωγής
  πρέπει να επιλέγουν ρητά την αυτόματη εφαρμογή schema ή να εκτελούν `pnpm db:schema`.
- **`apps/api`** ο parser σώματος αιτήματος είναι τώρα streaming με σκληρό όριο μεγέθους ωφέλιμου φορτίου
  (`LORE_MAX_JSON_BYTES`, προεπιλογή 1 MiB). Υπερμεγέθη αιτήματα επιστρέφουν 413.
- **Loopback authentication** άλλαξε: αφαιρέθηκε η εξάρτηση από την κεφαλίδα URL `Host`· η
  ανίχνευση loopback χρησιμοποιεί τώρα μόνο `req.socket.remoteAddress`. Στην παραγωγή χωρίς
  διαμορφωμένα API keys, το API αποτυγχάνει κλειστά και αρνείται αιτήματα (πριν: χορηγούνταν
  αθόρυβα admin).
- **Scoped API keys** πρέπει τώρα να παρέχουν `project_id` για `/v1/memory/list`,
  `/v1/eval/run`, και `/v1/memory/import` (πριν: το undefined `project_id` παρακαμπτόταν).
- **Όλα τα Dockerfiles** εκτελούνται τώρα ως μη-root χρήστης `node`. Τα `apps/api/Dockerfile` και
  `apps/dashboard/Dockerfile` δηλώνουν `HEALTHCHECK`.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` χρησιμοποιεί τώρα `${POSTGRES_PASSWORD:?must
  be set}` — η εκκίνηση αποτυγχάνει γρήγορα χωρίς ρητό κωδικό πρόσβασης.
- **`docs/deployment/compose.private-demo.yml`** — ίδιο μοτίβο required-or-fail.
- **`.env.example`** — όλες οι demo προεπιλογές αφαιρέθηκαν και αντικαταστάθηκαν με placeholders
  `# REQUIRED`. Νέες μεταβλητές τεκμηριώθηκαν για όριο ρυθμού, timeout αιτήματος, όριο ωφέλιμου φορτίου,
  λειτουργία agentmemory required, dashboard basic auth.

### Διορθώθηκαν

- **Ευπάθεια παράκαμψης loopback authentication** (P0). Ο εισβολέας μπορούσε να στείλει `Host: 127.0.0.1`
  για να πλαστογραφήσει ανίχνευση loopback και να αποκτήσει ρόλο admin χωρίς API key.
- **Confused-deputy στο dashboard proxy** (P0). Το dashboard proxy εισήγαγε
  `LORE_API_KEY` για μη πιστοποιημένα αιτήματα, χορηγώντας δικαιώματα admin σε οποιονδήποτε
  μπορούσε να φτάσει τη θύρα 3001.
- **Άμυνα brute-force** (P0). Demo keys (`admin-local`, `read-local`, `write-local`)
  που εμφανίζονταν στο README/`.env.example` μπορούσαν να απαριθμηθούν επ' αόριστον· το όριο
  ρυθμού και οι αφαιρεθείσες προεπιλογές αμύνονται πλέον κατά αυτού.
- **JSON parse crash σε κακόμορφο `LORE_API_KEYS`** — η διεργασία τώρα τερματίζει με σαφές
  σφάλμα αντί να ρίχνει stack trace.
- **OOM μέσω μεγάλου σώματος αιτήματος** — τα σώματα πάνω από το ρυθμισμένο όριο επιστρέφουν
  τώρα 413 αντί να συντρίβουν τη διεργασία Node.
- **MCP error leak** — τα σφάλματα upstream API που περιλάμβαναν raw SQL, διαδρομές αρχείων ή
  stack traces εκκαθαρίζονται τώρα σε `{code, generic-message}` πριν φτάσουν στους MCP clients.
- **Dashboard JSON parse crash** — οι μη έγκυρες απαντήσεις JSON δεν συντρίβουν πλέον το UI·
  τα σφάλματα εμφανίζονται ως ορατή κατάσταση χρήστη.
- **MCP `memory_update` / `memory_supersede`** προηγουμένως δεν απαιτούσαν `reason`·
  αυτό επιβάλλεται τώρα από το zod schema.
- **Postgres pool**: το `statement_timeout` ορίζεται τώρα στα 15s· προηγουμένως υπήρχε
  απεριόριστος κίνδυνος χρόνου ερωτήματος υπό κακόμορφα jsonb ερωτήματα.

### Ασφάλεια

- Όλα τα ευρήματα ελέγχου P0 (loopback bypass / dashboard auth / rate limit / demo
  secrets) εκκαθαρίστηκαν. Δείτε public release notes για το πλήρες αρχείο ελέγχου.
- Το `pnpm audit --prod` αναφέρει μηδέν γνωστές ευπάθειες κατά τη στιγμή της έκδοσης.
- Τα demo credentials αφαιρέθηκαν από όλα τα templates ανάπτυξης και τα παραδειγματικά READMEs.
- Τα images container εκτελούνται τώρα ως μη-root από προεπιλογή.

### Σημειώσεις / Γνωστοί περιορισμοί

- **Μερικό P1-1**: το `/v1/context/query` διατηρεί επιτρεπτή συμπεριφορά scoped-key για
  να αποφευχθεί η διακοπή υφιστάμενων consumer tests. Άλλες επηρεαζόμενες διαδρομές (`/v1/memory/list`,
  `/v1/eval/run`, `/v1/memory/import`) επιβάλλουν `project_id`. Παρακολουθείται για το v0.5.
- **Hosted multi-tenant cloud sync** δεν υλοποιείται στο v0.4.0-alpha. Μόνο τοπικές
  και Compose-private αναπτύξεις.
- **Ποιότητα μετάφρασης**: οι τοπικοποιήσεις README είναι LLM-generated και σαφώς
  επισημασμένες· PRs κοινότητας για βελτίωση κάθε locale είναι ευπρόσδεκτα (δείτε
  [`docs/i18n/README.md`](../../i18n/README.md)).
- **OpenAPI / Swagger spec** δεν έχει ακόμη συσκευαστεί. Η REST επιφάνεια τεκμηριώνεται
  σε πεζογραφία στο [`docs/api-reference.md`](../../api-reference.md). Παρακολουθείται για το v0.5.

### Ευχαριστίες

Αυτή η έκδοση είναι το αποτέλεσμα ενός sprint σκλήρυνσης παραγωγής μιας ημέρας που
περιλάμβανε παράλληλη εκτέλεση sub-agent σε σχέδιο ελέγχου δομημένο. Το σχέδιο και τα

## [v0.0.0] — pre-release

Εσωτερικά ορόσημα ανάπτυξης, δεν κυκλοφόρησαν δημόσια. Υλοποιήθηκαν:

- Scaffold πακέτων workspace (TypeScript monorepo, pnpm workspaces).
- Κοινός pipeline build/test TypeScript.
- Σύστημα τύπων μνήμης / πλαισίου / eval / ελέγχου στο `@lore/shared`.
- Σύνορο adapter `agentmemory`.
- Τοπικό REST API με context router και composer.
- JSON-file persistence + προαιρετικό Postgres runtime store με αυξητικό upsert.
- Ροές λεπτομέρειας / επεξεργασίας / αντικατάστασης / λήθης μνήμης με ρητή σκληρή διαγραφή.
- Πραγματική λογιστική χρήσης μνήμης (`useCount`, `lastUsedAt`).
- Ανατροφοδότηση ίχνους (`useful` / `wrong` / `outdated` / `sensitive`).
- MIF-like JSON + Markdown εισαγωγή/εξαγωγή με πεδία διακυβέρνησης.
- Σύνολο regex σάρωσης secrets.
- Μετρικά eval βασισμένα σε συνεδρία· eval runs σύγκρισης παρόχων· λίστα eval runs.
- Προστασία API-key με διαχωρισμό ρόλων reader/writer/admin.
- Ουρά ελέγχου διακυβέρνησης· API αρχείου ελέγχου.
- API-served dashboard HTML· standalone Next.js dashboard.
- Demo seed data· δημιουργία config ενσωμάτωσης.
- Ιδιωτική συσκευασία Docker/Compose.
- Legacy + official-SDK stdio MCP transports.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
