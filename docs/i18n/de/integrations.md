> 🤖 Dieses Dokument wurde maschinell aus dem Englischen übersetzt. Verbesserungen per PR sind willkommen — siehe [Übersetzungs-Beitragsleitfaden](../README.md).

# Integrations-Leitfäden

Diese Leitfäden dokumentieren den Lore Context-Integrationsvertrag gegen das aktuelle lokale MVP.

## Aktueller Repository-Status

- Das Repository enthält jetzt eine lokale REST API, Kontext-Router/-Composer, optionale JSON-Datei-Persistenz, optionalen Postgres-Runtime-Store, Traces, Speicher-Import/-Export, Eval-Anbietervergleich, API-geliefertes Dashboard-HTML, eigenständiges Next.js-Dashboard und eine `agentmemory`-Adapter-Grenze.
- `apps/mcp-server/src/index.ts` stellt einen lauffähigen stdio JSON-RPC MCP-Launcher bereit, der Tools an die Lore REST API über `LORE_API_URL` proxied und `LORE_API_KEY` als Bearer-Token weiterleitet, wenn konfiguriert. Er unterstützt den Legacy-eingebauten stdio-Loop und den offiziellen `@modelcontextprotocol/sdk` stdio-Transport über `LORE_MCP_TRANSPORT=sdk`.
- Die unten stehenden Dokumente sind Integrationsverträge. API-First-Integrationen können heute den lokalen REST-Server verwenden; MCP-fähige Clients können den lokalen stdio-Launcher nach `pnpm build` verwenden.

## Gemeinsames Design

- MCP-fähige Clients sollten sich mit einem kleinen Lore MCP-Server verbinden, nicht mit rohem `agentmemory`.
- API-First-Clients sollten Lore REST-Endpunkte aufrufen, wobei `POST /v1/context/query` der Haupt-Lesepfad ist.
- `POST /v1/context/query` akzeptiert `mode`, `sources`, `freshness`, `token_budget`, `writeback_policy` und `include_sources`, damit Clients das Speicher/Web/Repo/Tool-Trace-Routing bei Bedarf erzwingen oder deaktivieren können.
- Lore umhüllt die lokale `agentmemory`-Runtime über `packages/agentmemory-adapter`.
- Lokales `agentmemory` wird unter `http://127.0.0.1:3111` erwartet.

## Verfügbare MCP-Oberfläche

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

## Verfügbare REST-Oberfläche

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` mit optionalem `project_id`, `scope`, `status`, `memory_type`, `q` und `limit`
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

## Lokaler API-Smoke

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

Der automatisierte Smoke-Pfad ist:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Lokaler MCP-Smoke

Der MCP-Launcher liest zeilengetrennte JSON-RPC über stdin und schreibt nur JSON-RPC-Nachrichten auf stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Diesen nicht über `pnpm start` von einem MCP-Client starten, weil Paketmanager-Banner stdout verschmutzen würden.

## Privates Deployment-Alignment

Das private Demo-Packaging in [docs/deployment/README.md](../../deployment/README.md) setzt voraus:

- Lore API und Dashboard laufen als langlaufende Container.
- Postgres ist der Standard-dauerhafte Store für gemeinsame Demos.
- Der MCP-Launcher bleibt ein stdio-Prozess nah am Client oder läuft als optionaler `mcp` Compose-Dienst auf Abruf.
- Demo-Seeding kommt von [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json), während Eval-Smoke von [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json) kommt.

Für private Deployments Client-Launcher auf die private API-URL zeigen und die kleinste passende Rolle angeben:

- `reader`: Dashboard und Nur-Lese-Copilots.
- `writer`: Agenten, die Speicher, Feedback oder Eval-Durchläufe schreiben sollen.
- `admin`: Import-, Export-, Governance-, Audit- und Vergessen-Flows.

## Deployment-bewusste Client-Vorlagen

### Claude Code

Einen Workstation-lokalen stdio-Prozess bevorzugen, der auf die private API zielt:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY=write-local \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

Wenn statt `node .../dist/index.js` der verpackte MCP-Container verwendet wird, das gleiche `LORE_API_URL` / `LORE_API_KEY`-Paar beibehalten und den stdio-Launcher via `docker compose run --rm mcp` ausführen.

### Cursor

Cursor-style MCP JSON sollte den Launcher lokal halten und nur das API-Ziel und den Schlüssel ändern:

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

Einen `writer`-Schlüssel nur verwenden, wenn Cursor-Workflows absichtlich dauerhaften Projektspeicher zurückschreiben.

### Qwen Code

Qwen-style `mcpServers` JSON folgt derselben Grenze:

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

`reader` für Nur-Suche-Abruf-Assistenten und `writer` für agentische Flows verwenden, die `memory_write`, `memory_update` oder `trace`-Feedback-Tools benötigen.

## Sichere Standardwerte

- Lokal `stdio` für MCP bevorzugen; authentifiziertes Streamable HTTP nur verwenden, wenn Remote-Transport erforderlich ist.
- SSE als Legacy-Kompatibilität behandeln, nicht als Standard-Pfad.
- Tools mit `includeTools` oder dem Client-Äquivalent auf Whitelist setzen.
- Keine breiten Vertrauensmodi standardmäßig aktivieren.
- `reason` bei mutierenden Operationen erfordern.
- `memory_forget` auf Soft-Delete belassen, außer ein Admin setzt absichtlich `hard_delete: true` für kontrollierte Entfernung.
- `LORE_API_KEYS`-Rollentrennung für gemeinsame lokale oder Remote-API-Exposition verwenden: `reader` für Nur-Lese-Clients, `writer` für Agenten-Writeback und `admin` nur für Sync/Import/Export/Vergessen/Governance/Audit-Operationen. `projectIds` hinzufügen, um Client-Schlüssel auf die Projekte zu begrenzen, die sie sehen oder mutieren dürfen.
- `agentmemory` an `127.0.0.1` gebunden belassen.
- Den rohen `agentmemory`-Viewer oder die Konsole nicht öffentlich exponieren.
- Aktueller Live-`agentmemory` 0.9.3-Vertrag: `remember`, `export`, `audit` und `forget(memoryId)` sind für Lore-Sync-/Vertragstests verwendbar; `smart-search` durchsucht Beobachtungen und sollte nicht als Beweis behandelt werden, dass neu gespeicherte Speicher-Datensätze direkt durchsuchbar sind.
