> 🤖 Dieses Dokument wurde maschinell aus dem Englischen übersetzt. Verbesserungen per PR sind willkommen — siehe [Übersetzungs-Beitragsleitfaden](../README.md).

# Changelog

Alle nennenswerten Änderungen an Lore Context werden hier dokumentiert. Das Format basiert auf
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) und dieses Projekt
hält sich an [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v0.4.0-alpha] — 2026-04-28

Erste öffentliche Alpha. Schließt den Produktionshärtungs-Sprint ab, der das fehlgeschlagene Audit-MVP in einen Release-Candidate-Alpha verwandelt hat. Alle P0-Audit-Punkte behoben, 12 von 13 P1-Punkten behoben (einer teilweise — siehe Hinweise), 117+ Tests bestanden, vollständiges Monorepo-Build sauber.

### Hinzugefügt

- **`packages/eval/src/runner.ts`** — echter `EvalRunner` (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). Eval kann jetzt eine End-to-End-Abruf-Evaluierung gegen
  einen benutzereigenen Datensatz durchführen und Durchläufe als JSON zur zeitübergreifenden Regressionserkennung speichern.
- **`packages/governance/src/state.ts`** — Sechszustands-Governance-Zustandsmaschine
  (`candidate / active / flagged / redacted / superseded / deleted`) mit expliziter
  Übergangstabelle. Illegale Übergänge werfen Fehler.
- **`packages/governance/src/audit.ts`** — unveränderlicher Audit-Protokoll-Append-Helfer, integriert
  mit `@lore/shared` `AuditLog`-Typ.
- **`packages/governance/detectPoisoning`** — Heuristik zur Speichervergiftungserkennung
  mittels Same-Source-Dominanz (>80%) und Imperativ-Verb-Mustererkennung.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — semver-basierte Upstream-
  Versions-Probe mit handcodiertem Vergleich (keine neue Abhängigkeit). Respektiert
  `LORE_AGENTMEMORY_REQUIRED=0` für stillen-Skip-Degraded-Mode.
- **`packages/mif`** — `supersedes: string[]` und `contradicts: string[]` Felder hinzugefügt
  zu `LoreMemoryItem`. Round-Trip über JSON- und Markdown-Formate erhalten.
- **`apps/api/src/logger.ts`** — strukturierter JSON-Logger mit automatischer Redaktion von
  sensiblen Feldern (`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`). `requestId` fließt durch jede Anfrage.
- **`apps/dashboard/middleware.ts`** — HTTP Basic Auth Middleware. Produktionsstart
  verweigert den Beginn ohne `DASHBOARD_BASIC_AUTH_USER` und `DASHBOARD_BASIC_AUTH_PASS`.
- **`scripts/check-env.mjs`** — Produktionsmodus-Umgebungsvalidator. Verweigert den App-Start,
  wenn ein Umgebungswert einem Platzhalter-Muster entspricht (`read-local`,
  `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`).
- **Ratenbegrenzung** — Pro-IP und Pro-Schlüssel Doppel-Bucket Token-Limiter mit Auth-Fehler-
  Backoff (5 Fehler in 60s → 30s Sperrzeit → 429-Antwort). Konfigurierbar über
  `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED`.
- **Geordnetes Herunterfahren** — SIGTERM/SIGINT-Handler leeren laufende Anfragen bis zu 10s,
  spülen ausstehende Postgres-Schreibvorgänge, schließen Pool, erzwingen Exit bei 15s.
- **Datenbankindizes** — B-tree-Indizes auf `(project_id)` / `(status)` /
  `(created_at)` für `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs`. GIN-Indizes auf jsonb `content` und `metadata`.
- **MCP zod-Eingabevalidierung** — jedes MCP-Tool führt jetzt `safeParse` gegen ein
  Tool-spezifisches zod-Schema durch; Fehler geben JSON-RPC `-32602` mit bereinigten Problemen zurück.
- **MCP `destructiveHint` + erforderliches `reason`** — jedes mutierende Tool
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) erfordert ein
  `reason` von mindestens 8 Zeichen und zeigt `destructiveHint: true`.
- 117+ neue Testfälle in `apps/api`, `apps/mcp-server`, `packages/eval`,
  `packages/governance`, `packages/mif`, `packages/agentmemory-adapter`.
- Mehrsprachige Dokumentation: README in 17 Sprachen unter `docs/i18n/<lang>/`.
- `CHANGELOG.md` (diese Datei).
- `docs/getting-started.md` — 5-Minuten-Entwickler-Schnellstart.
- `docs/api-reference.md` — REST-API-Endpunkt-Referenz.
- `docs/i18n/README.md` — Übersetzungs-Beitragsleitfaden.

### Geändert

- **`packages/mif`** Envelope-Version `"0.1"` → `"0.2"`. Rückwärtskompatibles Import.
- **`LORE_POSTGRES_AUTO_SCHEMA`** Standard `true` → `false`. Produktions-Deployments
  müssen explizit die automatische Schema-Anwendung aktivieren oder `pnpm db:schema` ausführen.
- **`apps/api`** Anfrage-Body-Parser ist jetzt Streaming mit einem harten Payload-Größenlimit
  (`LORE_MAX_JSON_BYTES`, Standard 1 MiB). Übergroße Anfragen geben 413 zurück.
- **Loopback-Authentifizierung** geändert: Abhängigkeit von URL-`Host`-Header entfernt; Loopback-
  Erkennung verwendet jetzt nur `req.socket.remoteAddress`. In Produktion ohne konfigurierte API-Schlüssel
  schlägt die API fehl und verweigert Anfragen (vorher: still Admin gewährt).
- **Bereichsbezogene API-Schlüssel** müssen jetzt `project_id` für `/v1/memory/list`,
  `/v1/eval/run` und `/v1/memory/import` angeben (vorher: undefinierte `project_id` wurde kurzgeschlossen).
- **Alle Dockerfiles** laufen jetzt als Nicht-Root-`node`-Benutzer. `apps/api/Dockerfile` und
  `apps/dashboard/Dockerfile` deklarieren `HEALTHCHECK`.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` verwendet jetzt `${POSTGRES_PASSWORD:?must
  be set}` — Start schlägt schnell ohne explizites Passwort fehl.
- **`docs/deployment/compose.private-demo.yml`** — gleiches Pflicht-oder-Fehlschlag-Muster.
- **`.env.example`** — alle Demo-Standardwerte entfernt und durch `# REQUIRED`-Platzhalter ersetzt.
  Neue Variablen für Ratenbegrenzung, Request-Timeout, Payload-Limit, agentmemory-Pflichtmodus, Dashboard Basic Auth dokumentiert.

### Behoben

- **Loopback-Bypass-Auth-Sicherheitslücke** (P0). Angreifer konnten `Host: 127.0.0.1` senden,
  um die Loopback-Erkennung zu fälschen und Admin-Rolle ohne API-Schlüssel zu erhalten.
- **Confused-Deputy im Dashboard-Proxy** (P0). Dashboard-Proxy injizierte
  `LORE_API_KEY` für nicht authentifizierte Anfragen und gewährte Admin-Rechte jedem, der
  Port 3001 erreichen konnte.
- **Brute-Force-Abwehr** (P0). Demo-Schlüssel (`admin-local`, `read-local`, `write-local`)
  aus README/`.env.example` konnten unbegrenzt enumiert werden; Ratenbegrenzung und
  entfernte Standardwerte schützen jetzt dagegen.
- **JSON-Parse-Absturz bei fehlerhaftem `LORE_API_KEYS`** — Prozess beendet sich jetzt mit einer klaren
  Fehlermeldung anstatt einen Stack-Trace zu werfen.
- **OOM durch großen Anfrage-Body** — Bodies über dem konfigurierten Limit geben jetzt 413
  zurück anstatt den Node-Prozess zum Absturz zu bringen.
- **MCP-Fehlerleck** — Upstream-API-Fehler, die rohes SQL, Dateipfade oder
  Stack-Traces enthielten, werden jetzt zu `{code, generic-message}` bereinigt, bevor sie MCP-Clients erreichen.
- **Dashboard-JSON-Parse-Absturz** — ungültige JSON-Antworten bringen die UI nicht mehr zum Absturz;
  Fehler werden als benutzerssichtbarer Zustand angezeigt.
- **MCP `memory_update` / `memory_supersede`** erforderten bisher kein
  `reason`; dies wird jetzt durch zod-Schema erzwungen.
- **Postgres-Pool**: `statement_timeout` jetzt auf 15s gesetzt; vorher unbegrenztes
  Abfragezeitrisiko bei fehlerhaften jsonb-Abfragen.

### Sicherheit

- Alle P0-Audit-Befunde (Loopback-Bypass / Dashboard-Auth / Ratenbegrenzung / Demo-Geheimnisse)
  behoben. Siehe public release notes für den vollständigen Audit-Trail.
- `pnpm audit --prod` meldet zum Zeitpunkt der Veröffentlichung null bekannte Sicherheitslücken.
- Demo-Anmeldedaten aus allen Deployment-Vorlagen und Beispiel-READMEs entfernt.
- Container-Images laufen jetzt standardmäßig als Nicht-Root.

### Hinweise / Bekannte Einschränkungen

- **Teilweises P1-1**: `/v1/context/query` behält permissives Scoped-Key-Verhalten bei,
  um bestehende Consumer-Tests nicht zu unterbrechen. Andere betroffene Routen (`/v1/memory/list`,
  `/v1/eval/run`, `/v1/memory/import`) erzwingen `project_id`. Geplant für v0.5.
- **Gehostete Multi-Mandanten-Cloud-Synchronisierung** ist in v0.4.0-alpha nicht implementiert.
  Nur lokale und Compose-Private-Deployments.
- **Übersetzungsqualität**: README-Lokalisierungen sind LLM-generiert und klar
  gekennzeichnet; Community-PRs zur Verbesserung der einzelnen Locale sind willkommen (siehe
  [`docs/i18n/README.md`](../README.md)).
- **OpenAPI / Swagger-Spec** ist noch nicht verpackt. Die REST-Oberfläche ist in
  Prosa unter [`docs/api-reference.md`](../../api-reference.md) dokumentiert. Geplant für v0.5.

### Danksagungen

Dieses Release ist das Ergebnis eines eintägigen Produktionshärtungs-Sprints mit
paralleler Sub-Agent-Ausführung gegen einen strukturierten Audit-Plan. Plan- und Audit-

## [v0.0.0] — Pre-Release

Interne Entwicklungsmeilensteine, nicht öffentlich veröffentlicht. Implementiert:

- Workspace-Paket-Gerüste (TypeScript-Monorepo, pnpm-Workspaces).
- Gemeinsame TypeScript Build/Test-Pipeline.
- Speicher / Kontext / Eval / Audit-Typsystem in `@lore/shared`.
- `agentmemory`-Adapter-Grenze.
- Lokale REST API mit Kontext-Router und Composer.
- JSON-Datei-Persistenz + optionaler Postgres-Runtime-Store mit inkrementellem Upsert.
- Speicher-Detail / Bearbeiten / Ersetzen / Vergessen-Flows mit explizitem Hard-Delete.
- Echte Speicher-Nutzungsabrechnung (`useCount`, `lastUsedAt`).
- Trace-Feedback (`useful` / `wrong` / `outdated` / `sensitive`).
- MIF-ähnlicher JSON + Markdown Import/Export mit Governance-Feldern.
- Secret-Scanning-Regex-Satz.
- Direkte sitzungsbasierte Eval-Metriken; Anbietervergleichs-Eval-Durchläufe; Eval-Durchlauf-Listing.
- API-Schlüssel-Schutz mit reader/writer/admin-Rollentrennung.
- Governance-Überprüfungswarteschlange; Audit-Protokoll-API.
- API-geliefertes Dashboard-HTML; eigenständiges Next.js-Dashboard.
- Demo-Seed-Daten; Integrations-Konfigurationsgenerierung.
- Private Docker/Compose-Verpackung.
- Legacy + offizieller SDK stdio MCP-Transport.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
