> 🤖 Αυτό το έγγραφο μεταφράστηκε αυτόματα από τα Αγγλικά. Καλωσορίζονται βελτιώσεις μέσω PR — δείτε τον [οδηγό συνεισφοράς μετάφρασης](../README.md).

# Οδηγοί Ενσωμάτωσης

Αυτοί οι οδηγοί τεκμηριώνουν το συμβόλαιο ενσωμάτωσης Lore Context έναντι του τρέχοντος
τοπικού MVP.

## Τρέχουσα Κατάσταση Repo

- Το repo τώρα περιλαμβάνει ένα τοπικό REST API, context router/composer, προαιρετική JSON-file
  persistence, προαιρετικό Postgres runtime store, ίχνη, εισαγωγή/εξαγωγή μνήμης, σύγκριση
  eval provider, API-served dashboard HTML, standalone Next.js dashboard και ένα σύνορο
  adapter `agentmemory`.
- Το `apps/mcp-server/src/index.ts` παρέχει ένα εκτελέσιμο stdio JSON-RPC MCP launcher που
  κάνει proxy εργαλεία στο Lore REST API μέσω `LORE_API_URL` και προωθεί `LORE_API_KEY` ως
  Bearer token όταν ρυθμίζεται. Υποστηρίζει το legacy built-in stdio loop και το official
  `@modelcontextprotocol/sdk` stdio transport μέσω `LORE_MCP_TRANSPORT=sdk`.
- Τα έγγραφα παρακάτω είναι συμβόλαια ενσωμάτωσης. Οι ενσωματώσεις API-first μπορούν να
  χρησιμοποιήσουν σήμερα τον τοπικό REST server· οι MCP-capable clients μπορούν να
  χρησιμοποιήσουν τον τοπικό stdio launcher μετά από `pnpm build`.

## Κοινός Σχεδιασμός

- Οι MCP-capable clients πρέπει να συνδέονται σε ένα μικρό Lore MCP server, όχι στο raw
  `agentmemory`.
- Οι API-first clients πρέπει να καλούν Lore REST endpoints, με `POST /v1/context/query`
  ως κύρια διαδρομή ανάγνωσης.
- Το `POST /v1/context/query` αποδέχεται `mode`, `sources`, `freshness`, `token_budget`,
  `writeback_policy` και `include_sources` ώστε οι clients να μπορούν να εξαναγκάζουν ή να
  απενεργοποιούν δρομολόγηση memory/web/repo/tool-trace όταν χρειάζεται.
- Το Lore τυλίγει το τοπικό `agentmemory` runtime μέσω `packages/agentmemory-adapter`.
- Το τοπικό `agentmemory` αναμένεται στο `http://127.0.0.1:3111`.

## Διαθέσιμη MCP Επιφάνεια

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

## Διαθέσιμη REST Επιφάνεια

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` με προαιρετικά `project_id`, `scope`, `status`, `memory_type`, `q` και `limit`
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

## Τοπικό API Smoke

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

Η αυτοματοποιημένη διαδρομή smoke είναι:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Τοπικό MCP Smoke

Ο MCP launcher διαβάζει newline-delimited JSON-RPC από stdin και γράφει μόνο μηνύματα JSON-RPC
στο stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Μην εκκινήσετε αυτό μέσω `pnpm start` από έναν MCP client επειδή τα banners package-manager
θα μόλυναν το stdout.

## Ευθυγράμμιση Ιδιωτικής Ανάπτυξης

Η ιδιωτική συσκευασία demo στο [docs/deployment/README.md](deployment.md) υποθέτει:

- Το Lore API και dashboard εκτελούνται ως μακροχρόνιοι containers.
- Το Postgres είναι το προεπιλεγμένο ανθεκτικό store για κοινόχρηστα demos.
- Ο MCP launcher παραμένει μια stdio διεργασία κοντά στον client, ή εκτελείται ως το
  προαιρετικό `mcp` compose service on demand.
- Η σπορά demo προέρχεται από
  [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json),
  ενώ το eval smoke προέρχεται από
  [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json).

Για ιδιωτικές αναπτύξεις, δείξτε τους client launchers στο ιδιωτικό API URL και παρέχετε
τον μικρότερο ρόλο που ταιριάζει:

- `reader`: dashboard και read-only copilots.
- `writer`: agents που πρέπει να γράφουν μνήμη, ανατροφοδότηση ή eval runs.
- `admin`: ροές import, export, governance, audit και forget.

## Templates Client με Επίγνωση Ανάπτυξης

### Claude Code

Προτιμήστε μια τοπική stdio διεργασία workstation που στοχεύει το ιδιωτικό API:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY=write-local \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

Αν χρησιμοποιείτε τον συσκευασμένο MCP container αντί για `node .../dist/index.js`, διατηρήστε
το ίδιο ζεύγος `LORE_API_URL` / `LORE_API_KEY` και εκτελέστε τον stdio launcher μέσω
`docker compose run --rm mcp`.

### Cursor

Το Cursor-style MCP JSON πρέπει να διατηρεί τον launcher τοπικό και να αλλάζει μόνο το
API target και key:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "read-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Χρησιμοποιήστε ένα `writer` key μόνο όταν οι ροές εργασίας Cursor γράφουν σκόπιμα ανθεκτική
μνήμη έργου.

### Qwen Code

Το Qwen-style `mcpServers` JSON ακολουθεί το ίδιο σύνορο:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "write-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Χρησιμοποιήστε `reader` για search-only retrieval assistants και `writer` για agentic flows
που χρειάζονται εργαλεία `memory_write`, `memory_update` ή `trace` feedback.

## Ασφαλείς Προεπιλογές

- Προτιμήστε `stdio` τοπικά για MCP· χρησιμοποιήστε πιστοποιημένο streamable HTTP μόνο
  όταν απαιτείται remote transport.
- Αντιμετωπίστε SSE ως compat κληρονομιάς, όχι ως προεπιλεγμένη διαδρομή.
- Whitelist εργαλεία με `includeTools` ή το αντίστοιχο client.
- Μην ενεργοποιείτε broad trust modes από προεπιλογή.
- Απαιτήστε `reason` σε εργασίες μεταβολής.
- Διατηρήστε `memory_forget` σε soft delete εκτός αν ένας admin ορίζει σκόπιμα
  `hard_delete: true` για ελεγχόμενη αφαίρεση.
- Χρησιμοποιήστε διαχωρισμό ρόλων `LORE_API_KEYS` για κοινόχρηστη τοπική ή remote
  API έκθεση: `reader` για read-only clients, `writer` για agent writeback και `admin`
  μόνο για λειτουργίες sync/import/export/forget/governance/audit. Προσθέστε `projectIds`
  για να εμβελεύσετε client keys στα projects που μπορούν να δουν ή να μεταβάλουν.
- Διατηρήστε `agentmemory` δεσμευμένο στο `127.0.0.1`.
- Μην εκθέτετε δημόσια τον raw `agentmemory` viewer ή console.
- Τρέχον live `agentmemory` 0.9.3 συμβόλαιο: τα `remember`, `export`, `audit` και
  `forget(memoryId)` είναι χρήσιμα για Lore sync/contract tests· το `smart-search` αναζητά
  παρατηρήσεις και δεν πρέπει να αντιμετωπίζεται ως απόδειξη ότι τα freshly remembered
  memory records είναι απευθείας αναζητήσιμα.
