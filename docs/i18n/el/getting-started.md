> 🤖 Αυτό το έγγραφο μεταφράστηκε αυτόματα από τα Αγγλικά. Καλωσορίζονται βελτιώσεις μέσω PR — δείτε τον [οδηγό συνεισφοράς μετάφρασης](../README.md).

# Ξεκινώντας

Αυτός ο οδηγός σας οδηγεί από το μηδέν σε μια λειτουργική εγκατάσταση Lore Context με
μνήμη γραμμένη, πλαίσιο ερωτημένο και το dashboard προσβάσιμο. Σχεδιάστε ~15 λεπτά
συνολικά, ~5 λεπτά για τη βασική διαδρομή.

## Προαπαιτούμενα

- **Node.js** `>=22` (χρησιμοποιήστε `nvm`, `mise`, ή τον package manager της διανομής σας)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Προαιρετικό) **Docker + Docker Compose** για τη διαδρομή Postgres+pgvector
- (Προαιρετικό) **psql** αν προτιμάτε να εφαρμόσετε το schema μόνοι σας

## 1. Clone και εγκατάσταση

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Αν το `pnpm test` δεν είναι πράσινο, μην συνεχίσετε — ανοίξτε ένα ζήτημα με το log αποτυχίας.

## 2. Δημιουργήστε πραγματικά secrets

Το Lore Context αρνείται να ξεκινήσει στην παραγωγή με τιμές placeholder. Δημιουργήστε
πραγματικά keys ακόμα και για τοπική ανάπτυξη για να διατηρήσετε συνεπείς συνήθειες.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Για τοπικές ρυθμίσεις πολλαπλών ρόλων:

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

## 3. Ξεκινήστε το API (file-backed, χωρίς βάση δεδομένων)

Η απλούστερη διαδρομή χρησιμοποιεί ένα τοπικό αρχείο JSON ως backend αποθήκευσης. Κατάλληλο
για solo ανάπτυξη και smoke testing.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Σε άλλο κέλυφος, επαληθεύστε την υγεία:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Αναμενόμενο: `{"status":"ok",...}`.

## 4. Γράψτε την πρώτη σας μνήμη

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

Αναμενόμενο: απόκριση `200` με το `id` της νέας μνήμης και `governance.state` είτε
`active` είτε `candidate` (το δεύτερο αν το περιεχόμενο ταιριάζει ένα μοτίβο κινδύνου
όπως ένα secret).

## 5. Συνθέστε πλαίσιο

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

Θα πρέπει να δείτε τη μνήμη σας αναφερόμενη στον πίνακα `evidence.memory`, συν ένα `traceId`
που μπορείτε αργότερα να χρησιμοποιήσετε για να επιθεωρήσετε τη δρομολόγηση και την ανατροφοδότηση.

## 6. Ξεκινήστε το dashboard

Σε νέο τερματικό:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Ανοίξτε το http://127.0.0.1:3001 στον browser σας. Ο browser θα ζητήσει credentials Basic Auth.
Μόλις πιστοποιηθείτε, το dashboard εμφανίζει inventory μνήμης, ίχνη, αποτελέσματα eval
και την ουρά ελέγχου διακυβέρνησης.

## 7. (Προαιρετικό) Συνδέστε το Claude Code μέσω MCP

Προσθέστε αυτό στην ενότητα MCP servers του `claude_desktop_config.json` του Claude Code:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<paste your $LORE_API_KEY here>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Επανεκκινήστε το Claude Code. Τα εργαλεία Lore Context MCP (`context_query`, `memory_write`, κ.λπ.)
γίνονται διαθέσιμα.

Για άλλα agent IDE (Cursor, Qwen, Dify, FastGPT, κ.λπ.), δείτε τη μήτρα ενσωμάτωσης στο
[docs/integrations/README.md](integrations.md).

## 8. (Προαιρετικό) Μεταβείτε σε Postgres + pgvector

Όταν ξεπεράσετε την αποθήκευση JSON-file:

```bash
docker compose up -d postgres
pnpm db:schema   # applies apps/api/src/db/schema.sql via psql
```

Στη συνέχεια ξεκινήστε το API με `LORE_STORE_DRIVER=postgres`:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Εκτελέστε `pnpm smoke:postgres` για να επαληθεύσετε ότι ένας κύκλος write-restart-read επιβιώνει.

## 9. (Προαιρετικό) Σπείρετε το demo dataset και εκτελέστε eval

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

Η αναφορά eval προσγειώνεται στο `output/eval-reports/` ως Markdown και JSON.

## Επόμενα Βήματα

- **Ανάπτυξη παραγωγής** — [docs/deployment/README.md](deployment.md)
- **Αναφορά API** — [docs/api-reference.md](api-reference.md)
- **Βαθιά ανάλυση αρχιτεκτονικής** — [docs/architecture.md](architecture.md)
- **Ροή εργασίας ελέγχου διακυβέρνησης** — δείτε την ενότητα `Governance Flow` στο
  [docs/architecture.md](architecture.md)
- **Φορητότητα μνήμης (MIF)** — το `pnpm --filter @lore/mif test` δείχνει παραδείγματα
  κύκλου μεταφοράς
- **Συνεισφορά** — [CONTRIBUTING.md](CONTRIBUTING.md)

## Κοινές Παγίδες

| Σύμπτωμα | Αιτία | Διόρθωση |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Άλλη διεργασία είναι στη θύρα 3000 | `lsof -i :3000` για να την εντοπίσετε· ή ορίστε `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Λειτουργία παραγωγής χωρίς `DASHBOARD_BASIC_AUTH_USER/PASS` | Εξαγάγετε τις env vars ή περάστε `LORE_DASHBOARD_DISABLE_AUTH=1` (μόνο dev) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Κάποιο env ταίριαξε `admin-local` / `change-me` / `demo` κ.λπ | Δημιουργήστε πραγματικές τιμές μέσω `openssl rand -hex 32` |
| `429 Too Many Requests` | Ενεργοποιήθηκε το όριο ρυθμού | Περιμένετε το παράθυρο cool-off (προεπιλογή 30s μετά από 5 αποτυχίες πιστοποίησης)· ή ορίστε `LORE_RATE_LIMIT_DISABLED=1` στο dev |
| `agentmemory adapter unhealthy` | Το τοπικό agentmemory runtime δεν εκτελείται | Ξεκινήστε agentmemory ή ορίστε `LORE_AGENTMEMORY_REQUIRED=0` για αθόρυβη παράλειψη |
| MCP client βλέπει `-32602 Invalid params` | Η είσοδος εργαλείου απέτυχε στην επικύρωση zod schema | Ελέγξτε τον πίνακα `invalid_params` στο σώμα σφάλματος |
| Dashboard 401 σε κάθε σελίδα | Λανθασμένα credentials Basic Auth | Εξαγάγετε ξανά τις env vars και επανεκκινήστε τη διεργασία dashboard |

## Λήψη Βοήθειας

- Αναφέρετε ένα bug: https://github.com/Lore-Context/lore-context/issues
- Αποκάλυψη ασφαλείας: δείτε το [SECURITY.md](SECURITY.md)
- Συνεισφέρετε τεκμηρίωση: δείτε το [CONTRIBUTING.md](CONTRIBUTING.md)
