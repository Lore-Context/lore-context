> 🤖 Dieses Dokument wurde maschinell aus dem Englischen übersetzt. Verbesserungen per PR sind willkommen — siehe [Übersetzungs-Beitragsleitfaden](../README.md).

# Privates Deployment

> **Schlüssel mit `openssl rand -hex 32` generieren — die Platzhalter unten niemals in der Produktion verwenden.**

Dieses Paket verpackt Lore für eine private Demo oder ein internes Team-Rollout, ohne die Anwendungs-Code-Pfade zu ändern. Das Deployment-Bundle besteht aus:

- `apps/api/Dockerfile`: REST API-Image.
- `apps/dashboard/Dockerfile`: eigenständiges Next.js-Dashboard-Image.
- `Dockerfile`: optionales MCP-Launcher-Image für stdio-Clients.
- `docs/deployment/compose.private-demo.yml`: Copy-Paste Compose-Stack für Postgres, API, Dashboard und einen On-Demand-MCP-Dienst.
- `examples/demo-dataset/**`: Seed-Daten für File-Store-, Import- und Eval-Flows.

## Empfohlene Topologie

- `postgres`: dauerhafter Store für gemeinsame oder Multi-Operator-Demos.
- `api`: Lore REST API in einem internen Bridge-Netzwerk, standardmäßig an Loopback veröffentlicht.
- `dashboard`: Operator-UI, standardmäßig an Loopback veröffentlicht und über `LORE_API_URL` an die API proxying.
- `mcp`: optionaler stdio-Container für Claude, Cursor und Qwen-Operatoren, die einen containerisierten Launcher statt `node apps/mcp-server/dist/index.js` auf dem Host möchten.

Der Compose-Stack hält die öffentliche Exposition bewusst eng. Postgres, API und Dashboard binden standardmäßig über variabilisierte Port-Mappings an `127.0.0.1`.

## Vorabprüfung

1. `.env.example` in eine private Runtime-Datei wie `.env.private` kopieren.
2. `POSTGRES_PASSWORD` ersetzen.
3. `LORE_API_KEYS` gegenüber einem einzelnen `LORE_API_KEY` bevorzugen.
4. `DASHBOARD_LORE_API_KEY` auf einen `admin`-Schlüssel für den vollständigen Operator-Workflow setzen, oder auf einen bereichsbezogenen `reader`-Schlüssel für Nur-Lese-Demos. `MCP_LORE_API_KEY` auf einen `writer`- oder `reader`-Schlüssel setzen, je nachdem ob der Client Speicher mutieren soll.

Beispiel-Rollentrennung:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
```

## Stack starten

Den privaten Demo-Stack aus dem Repository-Root bauen und starten:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Health-Checks:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Demo-Daten laden

Für den Postgres-gestützten Compose-Stack die verpackten Demo-Speicher importieren, nachdem die API gesund ist:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Die verpackte Eval-Anfrage ausführen:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Für eine Zero-Datenbank-Single-Host-Demo stattdessen die API auf den File-Store-Snapshot zeigen:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## MCP-Launcher-Muster

Bevorzugtes Muster:

- Den MCP-Launcher nah am Client betreiben.
- `LORE_API_URL` auf die private API-URL zeigen.
- Den kleinsten geeigneten API-Schlüssel an den Launcher übergeben.

Host-basierter Launcher:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Containerisierter Launcher:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

Der containerisierte Launcher ist nützlich für reproduzierbare Workstation-Setups, ist aber weiterhin ein stdio-Prozess, kein langlaufender öffentlicher Netzwerkdienst.

## Sicherheits-Standardwerte

- `API_BIND_HOST`, `DASHBOARD_BIND_HOST` und `POSTGRES_BIND_HOST` auf `127.0.0.1` belassen, außer ein authentifizierter Reverse-Proxy ist bereits vor dem Stack.
- `LORE_API_KEYS` mit `reader` / `writer` / `admin`-Trennung statt eines einzelnen globalen Admin-Schlüssels überall bevorzugen.
- Projektbezogene Schlüssel für Demo-Clients verwenden. Die verpackte Demo-Projekt-ID ist `demo-private`.
- `AGENTMEMORY_URL` auf Loopback belassen und rohes `agentmemory` nicht direkt exponieren.
- `LORE_AGENTMEMORY_REQUIRED=0` belassen, außer das private Deployment hängt wirklich von einer Live-agentmemory-Runtime ab.
- `LORE_POSTGRES_AUTO_SCHEMA=true` nur für kontrollierte interne Umgebungen belassen. Sobald Schema-Bootstrapping Teil deines Release-Prozesses ist, kannst du es auf `false` pinnen.

## Wiederverwendbare Dateien

- Compose-Beispiel: [compose.private-demo.yml](../../../docs/deployment/compose.private-demo.yml)
- API-Image: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Dashboard-Image: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- MCP-Image: [Dockerfile](../../../Dockerfile)
- Demo-Daten: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
