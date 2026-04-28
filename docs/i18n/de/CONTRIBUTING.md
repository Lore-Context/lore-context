> 🤖 Dieses Dokument wurde maschinell aus dem Englischen übersetzt. Verbesserungen per PR sind willkommen — siehe [Übersetzungs-Beitragsleitfaden](../README.md).

# Zu Lore Context beitragen

Danke, dass du Lore Context verbesserst. Dieses Projekt ist eine KI-Agenten-Kontext-Steuerungsebene im Alpha-Stadium, daher sollten Änderungen den Local-First-Betrieb, die Auditierbarkeit und die Deployment-Sicherheit erhalten.

## Verhaltenskodex

Dieses Projekt folgt dem [Contributor Covenant](../../../CODE_OF_CONDUCT.md). Durch deine Teilnahme stimmst du zu, ihn einzuhalten.

## Entwicklungsumgebung einrichten

Voraussetzungen:

- Node.js 22 oder neuer
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (Optional) Docker für den Postgres-Pfad
- (Optional) `psql` wenn du das Schema lieber selbst anwendest

Häufige Befehle:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # erfordert docker compose up -d postgres
pnpm run doctor
```

Für paketspezifische Arbeit:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore/mcp-server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Pull-Request-Erwartungen

- **Änderungen fokussiert und umkehrbar halten.** Ein Anliegen pro PR; ein PR pro Anliegen.
- **Tests hinzufügen** für Verhaltensänderungen. Echte Assertions gegenüber Snapshots bevorzugen.
- **`pnpm build` und `pnpm test` ausführen** bevor du einen Review anforderst. CI führt sie auch aus, aber lokal ist schneller.
- **Den relevanten Smoke-Test ausführen** bei Änderungen an API, Dashboard, MCP, Postgres, Import/Export, Eval oder Deployment-Verhalten.
- **Keine generierten Build-Ausgaben, lokale Stores, `.env`-Dateien, Anmeldedaten oder private Kundendaten commiten.** Die `.gitignore` deckt die meisten Pfade ab; wenn du neue Artefakte erstellst, stelle sicher, dass sie ausgeschlossen sind.
- **Im Umfang deines PRs bleiben.** Refaktoriere keinen nicht verwandten Code nebenbei.

## Architektonische Leitplanken

Diese sind für v0.4.x nicht verhandelbar. Wenn ein PR eine davon verletzt, erwarte eine Aufforderung zum Aufteilen oder Überarbeiten:

- **Local-First bleibt primär.** Eine neue Funktion muss ohne gehosteten Dienst oder Drittanbieter-SaaS-Abhängigkeit funktionieren.
- **Keine neuen Auth-Oberflächen-Bypasses.** Jede Route bleibt durch API-Schlüssel + Rolle gesperrt. Loopback ist in der Produktion kein Sonderfall.
- **Kein roher `agentmemory`-Zugriff.** Externe Aufrufer erreichen Speicher nur über Lore-Endpunkte.
- **Audit-Protokoll-Integrität.** Jede Mutation, die den Speicherstatus beeinflusst, schreibt einen Audit-Eintrag.
- **Bei fehlender Konfiguration fehlschlagen.** Der Produktionsmodus-Start verweigert den Beginn, wenn erforderliche Umgebungsvariablen Platzhalter sind oder fehlen.

## Commit-Messages

Lore Context verwendet ein kleines, meinungsstarkes Commit-Format, inspiriert von Linux-Kernel-Richtlinien.

### Format

```text
<typ>: <kurze Zusammenfassung im Imperativ>

<optionaler Körper, der erklärt, warum diese Änderung benötigt wird und welche Kompromisse gelten>

<optionale Trailer>
```

### Typen

- `feat` — neue benutzerseitige Funktion oder API-Endpunkt
- `fix` — Bugfix
- `refactor` — Code-Umstrukturierung ohne Verhaltensänderung
- `chore` — Repository-Hygiene (Abhängigkeiten, Tooling, Datei-Verschiebungen)
- `docs` — nur Dokumentation
- `test` — nur Teständerungen
- `perf` — Leistungsverbesserung mit messbarer Auswirkung
- `revert` — Rückgängigmachen eines vorherigen Commits

### Stil

- **Kleinbuchstaben** für Typ und erstes Wort der Zusammenfassung.
- **Kein abschließender Punkt** in der Zusammenfassungszeile.
- **≤72 Zeichen** in der Zusammenfassungszeile; Körper bei 80 umbrechen.
- **Imperativ**: „fix loopback bypass", nicht „fixed" oder „fixes".
- **Warum über Was**: Das Diff zeigt, was sich geändert hat; der Körper sollte erklären, warum.
- **Keine** `Co-Authored-By`-Trailer, KI-Attribution oder Signed-off-by-Zeilen einschließen, außer wenn explizit vom Benutzer verlangt.

### Nützliche Trailer

Bei Relevanz Trailer hinzufügen, um Einschränkungen und Reviewer-Kontext festzuhalten:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### Beispiel

```text
fix: loopback bypass — remove host-header trust, fail closed in production

Previous versions trusted the Host header for loopback detection, allowing a
remote attacker to spoof "Host: 127.0.0.1" and obtain admin role with no API
key when LORE_API_KEYS was unset. Loopback detection now uses
req.socket.remoteAddress only, and production with empty keys returns 401.

Constraint: Local development without keys still works on loopback
Confidence: high
Scope-risk: narrow (auth path only)
Tested: pnpm test (added loopback-bypass test case), pnpm smoke:api
```

## Commit-Granularität

- Eine logische Änderung pro Commit. Reviewer können atomar rückgängig machen ohne Kollateralschäden.
- Triviale Fixups (`typo`, `lint`, `prettier`) vor dem Öffnen oder Aktualisieren eines PRs in den übergeordneten Commit zusammenführen.
- Multi-Datei-Refaktorierungen sind in einem einzelnen Commit in Ordnung, wenn sie einen gemeinsamen Grund teilen.

## Review-Prozess

- Ein Maintainer wird deinen PR innerhalb von 7 Tagen bei typischer Aktivität reviewen.
- Alle blockierenden Kommentare adressieren bevor du einen Re-Review anforderst.
- Für nicht-blockierende Kommentare ist eine Inline-Antwort mit Begründung oder einem Follow-up-Issue akzeptabel.
- Maintainer können ein `merge-queue`-Label hinzufügen, sobald der PR genehmigt ist; kein Rebase oder Force-Push nach der Anwendung dieses Labels.

## Dokumentationsübersetzungen

Wenn du eine übersetzte README oder Dokumentationsdatei verbessern möchtest, siehe den
[i18n-Beitragsleitfaden](../README.md).

## Fehler melden

- Öffentliches Issue unter https://github.com/Lore-Context/lore-context/issues einreichen,
  außer der Fehler ist eine Sicherheitslücke.
- Bei Sicherheitsproblemen [SECURITY.md](../../../SECURITY.md) folgen.
- Einschließen: Version oder Commit, Umgebung, Reproduktion, Erwartet vs. Tatsächlich,
  Protokolle (mit bereinigtem sensiblen Inhalt).

## Danke

Lore Context ist ein kleines Projekt, das versucht, etwas Nützliches für KI-Agenten-Infrastruktur zu tun.
Jeder gut abgegrenzte PR bringt es voran.
