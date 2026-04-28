> 🤖 Dieses Dokument wurde maschinell aus dem Englischen übersetzt. Verbesserungen per PR sind willkommen — siehe [Übersetzungs-Beitragsleitfaden](../README.md).

# Erste Schritte

Dieser Leitfaden führt dich von null zu einer laufenden Lore Context-Instanz mit geschriebenem Speicher,
abgefragtem Kontext und erreichbarem Dashboard. Plane ~15 Minuten insgesamt, ~5 Minuten für den
Kernpfad.

## Voraussetzungen

- **Node.js** `>=22` (verwende `nvm`, `mise` oder den Paketmanager deiner Distribution)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Optional) **Docker + Docker Compose** für den Postgres+pgvector-Pfad
- (Optional) **psql** wenn du das Schema lieber selbst anwendest

## 1. Klonen und installieren

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Wenn `pnpm test` nicht grün ist, nicht fortfahren — ein Issue mit dem Fehlerprotokoll öffnen.

## 2. Echte Geheimnisse generieren

Lore Context verweigert den Start in der Produktion mit Platzhalter-Werten. Echte Schlüssel
auch für lokale Entwicklung generieren, um konsistente Gewohnheiten zu erhalten.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Für Multi-Rollen-lokale Setups:

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

## 3. API starten (dateibasiert, keine Datenbank)

Der einfachste Pfad verwendet eine lokale JSON-Datei als Speicher-Backend. Geeignet für Solo-Entwicklung und Smoke-Tests.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

In einer anderen Shell den Health-Status prüfen:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Erwartet: `{"status":"ok",...}`.

## 4. Ersten Speicher schreiben

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

Erwartet: eine `200`-Antwort mit der `id` des neuen Speichers und `governance.state` entweder
`active` oder `candidate` (letzteres wenn der Inhalt einem Risiko-Muster wie einem Geheimnis entsprach).

## 5. Kontext zusammenstellen

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

Du solltest deinen Speicher im `evidence.memory`-Array zitiert sehen, plus eine `traceId`, die
du später verwenden kannst, um das Routing und Feedback zu inspizieren.

## 6. Dashboard starten

In einem neuen Terminal:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

http://127.0.0.1:3001 im Browser öffnen. Der Browser fordert Basic-Auth-Anmeldedaten an.
Nach der Authentifizierung rendert das Dashboard Speicher-Inventar, Traces, Eval-Ergebnisse und die Governance-Überprüfungswarteschlange.

## 7. (Optional) Claude Code über MCP verbinden

Dies zu Claude Codes `claude_desktop_config.json` MCP-Server-Abschnitt hinzufügen:

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

Claude Code neu starten. Die Lore Context MCP-Tools (`context_query`, `memory_write` usw.)
werden verfügbar.

Für andere Agenten-IDEs (Cursor, Qwen, Dify, FastGPT usw.) die Integrationsmatrix in
[docs/integrations/README.md](../../integrations/README.md) ansehen.

## 8. (Optional) Auf Postgres + pgvector wechseln

Wenn du den JSON-Datei-Speicher überwächst:

```bash
docker compose up -d postgres
pnpm db:schema   # wendet apps/api/src/db/schema.sql via psql an
```

Dann die API mit `LORE_STORE_DRIVER=postgres` starten:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

`pnpm smoke:postgres` ausführen, um einen Schreiben-Neustart-Lesen-Round-Trip zu verifizieren.

## 9. (Optional) Demo-Datensatz laden und Eval ausführen

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

Der Eval-Bericht landet in `output/eval-reports/` als Markdown und JSON.

## Nächste Schritte

- **Produktions-Deployment** — [docs/deployment/README.md](../../deployment/README.md)
- **API-Referenz** — [docs/api-reference.md](../../api-reference.md)
- **Architektur-Vertiefung** — [docs/architecture.md](../../architecture.md)
- **Governance-Review-Workflow** — siehe den Abschnitt `Governance-Flow` in
  [docs/architecture.md](../../architecture.md)
- **Speicher-Portabilität (MIF)** — `pnpm --filter @lore/mif test` zeigt Round-Trip-Beispiele
- **Mitwirken** — [CONTRIBUTING.md](../../../CONTRIBUTING.md)

## Häufige Fallstricke

| Symptom | Ursache | Lösung |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Ein anderer Prozess ist auf Port 3000 | `lsof -i :3000` um ihn zu finden; oder `PORT=3010` setzen |
| `503 Dashboard Basic Auth not configured` | Produktionsmodus ohne `DASHBOARD_BASIC_AUTH_USER/PASS` | Env-Variablen exportieren oder `LORE_DASHBOARD_DISABLE_AUTH=1` übergeben (nur Dev) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Irgendein Env entsprach `admin-local` / `change-me` / `demo` usw. | Echte Werte via `openssl rand -hex 32` generieren |
| `429 Too Many Requests` | Ratenbegrenzung ausgelöst | Abkühlungsfenster abwarten (Standard 30s nach 5 Auth-Fehlern); oder `LORE_RATE_LIMIT_DISABLED=1` in Dev setzen |
| `agentmemory adapter unhealthy` | Lokale agentmemory-Runtime läuft nicht | agentmemory starten oder `LORE_AGENTMEMORY_REQUIRED=0` für stillen Skip setzen |
| MCP-Client sieht `-32602 Invalid params` | Tool-Eingabe hat zod-Schema-Validierung nicht bestanden | Das `invalid_params`-Array im Fehler-Body prüfen |
| Dashboard 401 auf jeder Seite | Falsche Basic-Auth-Anmeldedaten | Env-Variablen neu exportieren und Dashboard-Prozess neu starten |

## Hilfe erhalten

- Bug melden: https://github.com/Lore-Context/lore-context/issues
- Sicherheits-Offenlegung: siehe [SECURITY.md](../../../SECURITY.md)
- Dokumentation beitragen: siehe [CONTRIBUTING.md](../../../CONTRIBUTING.md)
