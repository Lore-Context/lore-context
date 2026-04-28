> 🤖 Ce document a été traduit automatiquement de l'anglais. Les améliorations via PR sont les bienvenues — consultez le [guide de contribution aux traductions](../README.md).

# Guides d'intégration

Ces guides documentent le contrat d'intégration Lore Context contre le MVP local actuel.

## État actuel du dépôt

- Le dépôt inclut maintenant une REST API locale, un routeur/compositeur de contexte, une persistance optionnelle en fichier JSON, un magasin d'exécution Postgres optionnel, des traces, l'import/export de mémoire, la comparaison de fournisseurs d'évaluation, le HTML de tableau de bord servi par API, un tableau de bord Next.js autonome et une limite d'adaptateur `agentmemory`.
- `apps/mcp-server/src/index.ts` fournit un lanceur MCP stdio JSON-RPC exécutable qui proxifie les outils vers la REST API Lore via `LORE_API_URL` et transmet `LORE_API_KEY` en tant que jeton Bearer lorsque configuré. Il prend en charge la boucle stdio intégrée legacy et le transport stdio `@modelcontextprotocol/sdk` officiel via `LORE_MCP_TRANSPORT=sdk`.
- Les docs ci-dessous sont des contrats d'intégration. Les intégrations API-first peuvent utiliser le serveur REST local aujourd'hui ; les clients compatibles MCP peuvent utiliser le lanceur stdio local après `pnpm build`.

## Conception partagée

- Les clients compatibles MCP devraient se connecter à un petit serveur MCP Lore, pas à `agentmemory` brut.
- Les clients API-first devraient appeler les points d'accès REST Lore, avec `POST /v1/context/query` comme chemin de lecture principal.
- `POST /v1/context/query` accepte `mode`, `sources`, `freshness`, `token_budget`, `writeback_policy` et `include_sources` afin que les clients puissent forcer ou désactiver le routage mémoire/web/dépôt/trace-outil si nécessaire.
- Lore enveloppe l'environnement d'exécution `agentmemory` local via `packages/agentmemory-adapter`.
- `agentmemory` local est attendu sur `http://127.0.0.1:3111`.

## Surface MCP disponible

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

## Surface REST disponible

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` avec `project_id`, `scope`, `status`, `memory_type`, `q` et `limit` optionnels
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

## Test de fumée de l'API locale

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

Le chemin de test de fumée automatisé est :

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Test de fumée MCP local

Le lanceur MCP lit du JSON-RPC délimité par des sauts de ligne sur stdin et écrit uniquement des messages JSON-RPC sur stdout :

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Ne lancez pas ceci via `pnpm start` depuis un client MCP car les bannières du gestionnaire de paquets pollueraient stdout.

## Alignement du déploiement privé

Le packaging de démonstration privée dans [docs/deployment/README.md](deployment.md) suppose :

- L'API Lore et le tableau de bord s'exécutent comme des conteneurs de longue durée.
- Postgres est le magasin durable par défaut pour les démonstrations partagées.
- Le lanceur MCP reste un processus stdio près du client, ou s'exécute comme le service compose optionnel `mcp` à la demande.
- L'alimentation des données de démonstration provient de [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json), tandis que le test de fumée d'évaluation provient de [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json).

Pour les déploiements privés, pointez les lanceurs clients vers l'URL de l'API privée et fournissez le rôle le plus petit qui convient :

- `reader` : tableau de bord et copilotes en lecture seule.
- `writer` : agents qui doivent écrire de la mémoire, du retour ou des exécutions d'évaluation.
- `admin` : flux d'import, d'export, de gouvernance, d'audit et d'oubli.

## Modèles de clients adaptés au déploiement

### Claude Code

Préférez un processus stdio local au poste de travail ciblant l'API privée :

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY="${WRITE_KEY:?set WRITE_KEY}" \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /chemin/absolu/vers/Lore/apps/mcp-server/dist/index.js
```

Si vous utilisez le conteneur MCP packagé au lieu de `node .../dist/index.js`, gardez la même paire `LORE_API_URL` / `LORE_API_KEY` et exécutez le lanceur stdio via `docker compose run --rm mcp`.

### Cursor

Le JSON MCP de style Cursor devrait garder le lanceur local et ne changer que la cible API et la clé :

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/chemin/absolu/vers/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_READER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Utilisez une clé `writer` uniquement lorsque les workflows Cursor écrivent intentionnellement de la mémoire de projet durable.

### Qwen Code

Le JSON `mcpServers` de style Qwen suit la même limite :

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/chemin/absolu/vers/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_WRITER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Utilisez `reader` pour les assistants de récupération par recherche uniquement et `writer` pour les flux agentiques qui nécessitent les outils `memory_write`, `memory_update` ou de retour de `trace`.

## Paramètres sécurisés par défaut

- Préférez `stdio` localement pour MCP ; utilisez HTTP streamable authentifié uniquement lorsque le transport distant est requis.
- Traitez SSE comme une compatibilité legacy, pas le chemin par défaut.
- Mettez les outils en liste blanche avec `includeTools` ou l'équivalent client.
- N'activez pas les modes de confiance larges par défaut.
- Exigez `reason` sur les opérations mutantes.
- Gardez `memory_forget` en suppression douce sauf si un admin définit délibérément `hard_delete: true` pour une suppression contrôlée.
- Utilisez la séparation des rôles `LORE_API_KEYS` pour l'exposition API locale ou distante partagée : `reader` pour les clients en lecture seule, `writer` pour l'écriture en retour par les agents, et `admin` uniquement pour les opérations de synchronisation/import/export/oubli/gouvernance/audit. Ajoutez `projectIds` pour limiter les clés client aux projets qu'ils peuvent voir ou muter.
- Gardez `agentmemory` lié à `127.0.0.1`.
- N'exposez pas publiquement le visualiseur ou la console `agentmemory` brut.
- Contrat `agentmemory` 0.9.3 actif : `remember`, `export`, `audit` et `forget(memoryId)` sont utilisables pour les tests de synchronisation/contrat Lore ; `smart-search` recherche les observations et ne devrait pas être traité comme la preuve que les enregistrements de mémoire nouvellement mémorisés sont directement consultables.
