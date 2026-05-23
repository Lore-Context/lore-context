> 🤖 Dieses Dokument wurde maschinell aus dem Englischen übersetzt. Verbesserungen per PR sind willkommen — siehe [Übersetzungs-Beitragsleitfaden](../README.md).

# Sicherheitsrichtlinie

Lore Context verarbeitet Speicher, Traces, Audit-Protokolle und Integrations-Anmeldedaten.
Behandle Sicherheitsberichte als höchste Priorität.

## Sicherheitslücke melden

Öffne kein öffentliches Issue für vermutete Sicherheitslücken, geleakte Geheimnisse, Auth-Bypasses,
Datenlecks oder Mandanten-Isolierungsprobleme.

Bevorzugter Meldepfad:

1. Verwende **GitHub Private Vulnerability Reporting** für dieses Repository, wenn verfügbar.
2. Wenn privates Reporting nicht verfügbar ist, kontaktiere die Maintainer privat und
   schließe ein:
   - betroffene Version oder Commit,
   - Reproduktionsschritte,
   - erwartete Auswirkung,
   - ob echte Geheimnisse oder personenbezogene Daten beteiligt sind.

Wir streben an, glaubwürdige Berichte innerhalb von 72 Stunden zu bestätigen.

## Unterstützte Versionen

Lore Context ist derzeit Pre-1.0-Alpha-Software. Sicherheitsfixes zielen zuerst auf den `main`-Branch.
Tagged Releases können gezielte Patches erhalten, wenn ein öffentliches Release aktiv von nachgelagerten Betreibern verwendet wird.

| Version | Unterstützt |
|---|---|
| v0.4.x-alpha | ✅ Aktiv |
| v0.3.x und früher | ❌ Nur intern als Pre-Release |

## Eingebaute Härtung (v0.4.0-alpha)

Die Alpha wird mit den folgenden Defense-in-Depth-Kontrollen ausgeliefert. Betreiber sollten
sicherstellen, dass diese in ihrem Deployment aktiv sind.

### Authentifizierung

- **API-Schlüssel Bearer-Tokens** (`Authorization: Bearer <key>` oder
  `x-lore-api-key`-Header).
- **Rollentrennung**: `reader` / `writer` / `admin`.
- **Projektbezogenes Scoping**: `LORE_API_KEYS` JSON-Einträge können eine
  `projectIds: ["..."]`-Allowlist enthalten; Mutationen erfordern eine übereinstimmende `project_id`.
- **Leere-Schlüssel-Modus schlägt in Produktion fehl**: Mit `NODE_ENV=production` und keinen
  konfigurierten Schlüsseln verweigert die API alle Anfragen.
- **Loopback-Bypass entfernt**: Frühere Versionen vertrauten `Host: 127.0.0.1`; v0.4 verwendet
  nur Socket-Level-Remote-Adresse.

### Ratenbegrenzung

- **Pro-IP und Pro-Schlüssel Doppel-Bucket-Limiter** mit Auth-Fehler-Backoff.
- **Standardwerte**: 60 Anfragen/min pro IP für nicht-auth Pfade, 600 Anfragen/min pro authentifiziertem Schlüssel.
- **5 Auth-Fehler in 60s → 30s Sperrzeit** (gibt 429 zurück).
- Konfigurierbar: `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED=1` (nur Dev).

### Dashboard-Schutz

- **HTTP Basic Auth Middleware** (`apps/dashboard/middleware.ts`).
- **Produktionsstart verweigert den Beginn** ohne
  `DASHBOARD_BASIC_AUTH_USER` und `DASHBOARD_BASIC_AUTH_PASS`.
- `LORE_DASHBOARD_DISABLE_AUTH=1` wird nur außerhalb der Produktion respektiert.
- Server-seitiger Admin-Schlüssel-Fallback **entfernt**: Ein Benutzer muss sich über
  Basic Auth authentifizieren, bevor der Dashboard-Proxy Upstream-API-Anmeldedaten injiziert.

### Container-Härtung

- Alle Dockerfiles laufen als Nicht-Root-`node`-Benutzer.
- `apps/api/Dockerfile` und `apps/dashboard/Dockerfile` deklarieren `HEALTHCHECK`
  gegen `/health`.
- `apps/mcp-server` ist nur stdio — kein Netzwerk-Listener — und deklariert kein
  `HEALTHCHECK`.

### Geheimnissverwaltung

- **Keine fest codierten Anmeldedaten.** Alle `docker-compose.yml`,
  `docs/deployment/compose.private-demo.yml` und `.env.example`-Standardwerte verwenden
  `${VAR:?must be set}`-Form — Start schlägt schnell ohne explizite Werte fehl.
- `scripts/check-env.mjs` lehnt Platzhalter-Werte ab
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`,
  `dev`, `password`) wenn `NODE_ENV=production`.
- Alle Deployment-Dokumente und Beispiel-READMEs wurden von literalen Demo-Anmeldedaten bereinigt.

### Governance

- **Risiko-Tag-Scanning bei jedem Speicher-Schreibvorgang**: API-Schlüssel, AWS-Schlüssel, JWT-Tokens,
  private Schlüssel, Passwörter, E-Mails, Telefonnummern werden erkannt.
- **Sechszustands-Zustandsmaschine** mit expliziter Übergangstabelle; illegale Übergänge werfen Fehler.
- **Speichervergiftungs-Heuristiken**: Same-Source-Dominanz + Imperativ-Verb-Mustererkennung
  → `suspicious`-Flag.
- **Unveränderliches Audit-Protokoll** wird bei jeder Zustandsänderung angehängt.
- Hoch-Risiko-Inhalte werden automatisch zu `candidate` / `flagged` weitergeleitet und aus
  der Kontext-Komposition zurückgehalten bis zur Überprüfung.

### MCP-Härtung

- Jede MCP-Tool-Eingabe wird **gegen ein zod-Schema validiert** vor der Ausführung.
  Validierungsfehler geben JSON-RPC `-32602` mit bereinigter Problemliste zurück.
- **Alle mutierenden Tools** erfordern einen `reason`-String von mindestens 8 Zeichen und
  zeigen `destructiveHint: true` in ihrem Schema.
- Upstream-API-Fehler werden **bereinigt** bevor sie an MCP-Clients zurückgegeben werden —
  rohes SQL, Dateipfade und Stack-Traces werden entfernt.

### Logging

- **Strukturierte JSON-Ausgabe** mit `requestId`-Korrelation über die gesamte Handler-Kette.
- **Automatische Redaktion** von Feldern, die `content`, `query`, `memory`, `value`,
  `password`, `secret`, `token`, `key` entsprechen. Der tatsächliche Inhalt von Speicher-Datensätzen und
  Abfragen wird niemals in Protokolle geschrieben.

### Datengrenzen

- Der `agentmemory`-Adapter prüft die Upstream-Version bei der Initialisierung und warnt bei
  Inkompatibilität. `LORE_AGENTMEMORY_REQUIRED=0` schaltet den Adapter in stillen
  Degraded-Mode, wenn Upstream nicht erreichbar ist.
- `apps/api` Anfrage-Body-Parser erzwingt ein `LORE_MAX_JSON_BYTES`-Limit (Standard 1
  MiB); übergroße Anfragen geben 413 zurück.
- Postgres-Verbindungspool setzt `statement_timeout: 15000`, um die Abfragezeit zu begrenzen.
- `LORE_REQUEST_TIMEOUT_MS` (Standard 30s) begrenzt jeden Request-Handler;
  Timeouts geben 504 zurück.

## Deployment-Leitlinien

- Lore nicht öffentlich zugänglich machen ohne konfigurierte `LORE_API_KEYS`.
- **Rollentrennung** mit `reader` / `writer` / `admin`-Schlüsseln bevorzugen.
- **Immer setzen** `DASHBOARD_BASIC_AUTH_USER` und `DASHBOARD_BASIC_AUTH_PASS` in der Produktion.
- **Schlüssel mit `openssl rand -hex 32` generieren**. Niemals die in Beispielen gezeigten Platzhalter-Werte verwenden.
- Rohe `agentmemory`-Endpunkte privat halten; nur über Lore darauf zugreifen.
- Dashboard, Governance, Import/Export, Sync und Audit-Routen hinter einer
  Netzwerkzugangskontrollschicht (Cloudflare Access, AWS ALB, Tailscale ACL oder ähnliches) halten
  für jede Nicht-Loopback-Exposition.
- **`node scripts/check-env.mjs` ausführen bevor die API in der Produktion gestartet wird.**
- **Niemals commiten**: Produktions-`.env`-Dateien, Anbieter-API-Schlüssel, Cloud-Anmeldedaten,
  Eval-Daten mit Kundeninhalten oder private Speicher-Exporte.

## Offenlegungs-Timeline

Für bestätigte hochauswirkende Sicherheitslücken:

- 0 Tage: Bericht bestätigt.
- 7 Tage: Triage und Schweregrad-Klassifizierung mit dem Melder geteilt.
- 30 Tage: Koordinierte öffentliche Offenlegung (oder durch gegenseitige Vereinbarung verlängert).
- 30+ Tage: CVE-Ausstellung für mittleren oder höheren Schweregrad, wenn zutreffend.

Für Probleme mit geringerem Schweregrad wird eine Lösung innerhalb der nächsten Minor-Version erwartet.

## Härtungs-Roadmap

Geplante Punkte für nachfolgende Releases:

- **v0.5**: OpenAPI / Swagger-Spec; CI-Integration von `pnpm audit --high`,
  CodeQL-Statikanalyse und Dependabot.
- **v0.6**: Sigstore-signierte Container-Images, SLSA-Provenienz, npm-Veröffentlichung über
  GitHub OIDC statt langlebiger Tokens.
- **Future hosted hardening**: Verschlüsselung ruhender Speicher für `risk_tags`-markierte Speicherinhalte via KMS-Envelope-Verschlüsselung.
