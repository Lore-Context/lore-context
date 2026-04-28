> 🤖 Αυτό το έγγραφο μεταφράστηκε αυτόματα από τα Αγγλικά. Καλωσορίζονται βελτιώσεις μέσω PR — δείτε τον [οδηγό συνεισφοράς μετάφρασης](../README.md).

# Ιδιωτική Ανάπτυξη

> **Δημιουργήστε keys με `openssl rand -hex 32` — ποτέ μη χρησιμοποιείτε τα placeholders παρακάτω στην παραγωγή.**

Αυτό το τμήμα συσκευάζει το Lore για ένα ιδιωτικό demo ή εσωτερική ανάπτυξη ομάδας χωρίς
αλλαγή των διαδρομών κώδικα εφαρμογής. Το bundle ανάπτυξης αποτελείται από:

- `apps/api/Dockerfile`: image REST API.
- `apps/dashboard/Dockerfile`: standalone Next.js dashboard image.
- `Dockerfile`: προαιρετικό MCP launcher image για stdio clients.
- `docs/deployment/compose.private-demo.yml`: αντιγραφή-επικόλληση compose stack για Postgres,
  API, dashboard και on-demand MCP service.
- `examples/demo-dataset/**`: seed data για file-store, import και eval flows.

## Συνιστώμενη Τοπολογία

- `postgres`: ανθεκτικό store για κοινόχρηστα ή multi-operator demos.
- `api`: Lore REST API σε εσωτερικό bridge network, δημοσιευμένο στο loopback από προεπιλογή.
- `dashboard`: UI operator, δημοσιευμένο στο loopback από προεπιλογή και proxy στο API
  μέσω `LORE_API_URL`.
- `mcp`: προαιρετικό stdio container για operators Claude, Cursor και Qwen που θέλουν ένα
  containerized launcher αντί `node apps/mcp-server/dist/index.js` στον host.

Το compose stack διατηρεί σκόπιμα στενή δημόσια έκθεση. Τα Postgres, API και dashboard
δεσμεύονται στο `127.0.0.1` από προεπιλογή μέσω variableized port mappings.

## Έλεγχος πριν την εκκίνηση

1. Αντιγράψτε το `.env.example` σε ένα ιδιωτικό runtime αρχείο όπως `.env.private`.
2. Αντικαταστήστε το `POSTGRES_PASSWORD`.
3. Προτιμήστε `LORE_API_KEYS` αντί για ένα μόνο `LORE_API_KEY`.
4. Ορίστε `DASHBOARD_LORE_API_KEY` σε ένα `admin` key για την πλήρη ροή εργασίας operator,
   ή σε ένα scoped `reader` key για read-only demos. Ορίστε `MCP_LORE_API_KEY` σε ένα `writer`
   ή `reader` key ανάλογα με το αν ο client πρέπει να μεταβάλλει μνήμη.

Παράδειγμα διαχωρισμού ρόλων:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
```

## Εκκίνηση του Stack

Χτίστε και ξεκινήστε το ιδιωτικό demo stack από τη ρίζα του repo:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Έλεγχοι υγείας:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Σπορά Demo Data

Για το Postgres-backed compose stack, εισαγάγετε τις συσκευασμένες demo μνήμες αφού το
API είναι υγιές:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Εκτελέστε το συσκευασμένο eval αίτημα:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Αν θέλετε ένα demo μηδενικής βάσης δεδομένων single-host αντί, δείξτε το API στο file-store
snapshot:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## Μοτίβα MCP Launcher

Προτιμώμενο μοτίβο:

- Εκτελέστε το MCP launcher κοντά στον client.
- Δείξτε `LORE_API_URL` στο ιδιωτικό API URL.
- Παρέχετε το μικρότερο κατάλληλο API key στον launcher.

Host-based launcher:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Containerized launcher:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

Ο containerized launcher είναι χρήσιμος για αναπαραγώγιμη ρύθμιση workstation, αλλά είναι
ακόμα μια stdio διεργασία, όχι μια μακροχρόνια δημόσια network υπηρεσία.

## Προεπιλογές Ασφαλείας

- Διατηρήστε `API_BIND_HOST`, `DASHBOARD_BIND_HOST` και `POSTGRES_BIND_HOST` στο `127.0.0.1`
  εκτός αν ένα πιστοποιημένο reverse proxy είναι ήδη μπροστά από το stack.
- Προτιμήστε `LORE_API_KEYS` με διαχωρισμό `reader` / `writer` / `admin` αντί να
  επαναχρησιμοποιείτε ένα μόνο global admin key παντού.
- Χρησιμοποιήστε project-scoped keys για demo clients. Το συσκευασμένο demo project id
  είναι `demo-private`.
- Διατηρήστε `AGENTMEMORY_URL` στο loopback και μην εκθέτετε raw `agentmemory` απευθείας.
- Αφήστε `LORE_AGENTMEMORY_REQUIRED=0` εκτός αν η ιδιωτική ανάπτυξη εξαρτάται πραγματικά
  από ένα live agentmemory runtime.
- Διατηρήστε `LORE_POSTGRES_AUTO_SCHEMA=true` μόνο για ελεγχόμενα εσωτερικά περιβάλλοντα.
  Μόλις η εκκίνηση schema γίνει μέρος της διαδικασίας έκδοσής σας, μπορείτε να το καρφιτσώσετε
  στο `false`.

## Αρχεία για Επαναχρησιμοποίηση

- Compose sample: [compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- API image: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Dashboard image: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- MCP image: [Dockerfile](../../../Dockerfile)
- Demo data: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
