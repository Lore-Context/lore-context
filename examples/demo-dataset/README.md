# Demo Dataset

The files in this directory provide a self-contained private-demo seed for Lore.

## Files

- `store/lore-demo-store.json`: full local store snapshot for `LORE_STORE_PATH`.
- `import/lore-demo-memories.json`: Lore memory export JSON for `POST /v1/memory/import`.
- `eval/lore-demo-eval-dataset.json`: bare `dataset` payload for `POST /v1/eval/run`.
- `eval/lore-demo-eval-request.json`: ready-to-send eval request body with `project_id`.

## Suggested Usage

Use the file-store snapshot for a zero-database local demo:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

Use the import payload to seed a private Postgres-backed deployment after the API is healthy:

```bash
curl -X POST http://127.0.0.1:3000/v1/memory/import \
  -H "Authorization: Bearer admin-local" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Run the packaged eval request against the same seeded project:

```bash
curl -X POST http://127.0.0.1:3000/v1/eval/run \
  -H "Authorization: Bearer write-local" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

All sample data uses the shared demo project id `demo-private`.
