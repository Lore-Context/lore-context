> 🤖 Ce document a été traduit automatiquement de l'anglais. Les améliorations via PR sont les bienvenues — consultez le [guide de contribution aux traductions](../README.md).

# Démarrage rapide

Ce guide vous accompagne de zéro à une instance Lore Context opérationnelle avec une mémoire écrite,
un contexte interrogé et le tableau de bord accessible. Prévoyez ~15 minutes au total, ~5 minutes pour le
chemin principal.

## Prérequis

- **Node.js** `>=22` (utilisez `nvm`, `mise` ou le gestionnaire de paquets de votre distribution)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Optionnel) **Docker + Docker Compose** pour le chemin Postgres+pgvector
- (Optionnel) **psql** si vous préférez appliquer le schéma vous-même

## 1. Cloner et installer

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Si `pnpm test` n'est pas vert, ne continuez pas — ouvrez un ticket avec le journal d'échec.

## 2. Générer de vrais secrets

Lore Context refuse de démarrer en production avec des valeurs fictives. Générez de vraies clés
même pour le développement local afin de garder vos habitudes cohérentes.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Pour les configurations locales multi-rôles :

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

## 3. Démarrer l'API (stockage fichier, sans base de données)

Le chemin le plus simple utilise un fichier JSON local comme backend de stockage. Adapté au
développement solo et aux tests de fumée.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Dans un autre shell, vérifiez la santé :

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Attendu : `{"status":"ok",...}`.

## 4. Écrire votre première mémoire

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

Attendu : une réponse `200` avec l'`id` de la nouvelle mémoire et un `governance.state` soit
`active` soit `candidate` (ce dernier si le contenu correspond à un motif de risque tel qu'un
secret).

## 5. Composer le contexte

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

Vous devriez voir votre mémoire citée dans le tableau `evidence.memory`, plus un `traceId` que
vous pourrez utiliser ultérieurement pour inspecter le routage et le retour.

## 6. Démarrer le tableau de bord

Dans un nouveau terminal :

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Ouvrez http://127.0.0.1:3001 dans votre navigateur. Le navigateur demandera les identifiants Basic Auth.
Une fois authentifié, le tableau de bord affiche l'inventaire de mémoire, les traces, les résultats d'évaluation
et la file de révision de gouvernance.

## 7. (Optionnel) Connecter Claude Code via MCP

Ajoutez ceci à la section des serveurs MCP de `claude_desktop_config.json` de Claude Code :

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/chemin/absolu/vers/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<collez votre $LORE_API_KEY ici>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Redémarrez Claude Code. Les outils MCP Lore Context (`context_query`, `memory_write`, etc.)
deviennent disponibles.

Pour les autres IDE d'agents (Cursor, Qwen, Dify, FastGPT, etc.), voir la matrice d'intégration dans
[docs/integrations/README.md](integrations.md).

## 8. (Optionnel) Passer à Postgres + pgvector

Lorsque vous avez dépassé le stockage fichier JSON :

```bash
docker compose up -d postgres
pnpm db:schema   # applique apps/api/src/db/schema.sql via psql
```

Puis démarrez l'API avec `LORE_STORE_DRIVER=postgres` :

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Exécutez `pnpm smoke:postgres` pour vérifier qu'un aller-retour écriture-redémarrage-lecture survit.

## 9. (Optionnel) Alimenter le jeu de données de démonstration et exécuter une évaluation

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

Le rapport d'évaluation arrive dans `output/eval-reports/` en Markdown et JSON.

## Étapes suivantes

- **Déploiement en production** — [docs/deployment/README.md](deployment.md)
- **Référence API** — [docs/api-reference.md](api-reference.md)
- **Architecture approfondie** — [docs/architecture.md](architecture.md)
- **Workflow de révision de gouvernance** — voir la section « Flux de gouvernance » dans
  [docs/architecture.md](architecture.md)
- **Portabilité de mémoire (MIF)** — `pnpm --filter @lore/mif test` affiche des exemples d'aller-retour
- **Contribuer** — [CONTRIBUTING.md](CONTRIBUTING.md)

## Problèmes courants

| Symptôme | Cause | Correction |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Un autre processus est sur le port 3000 | `lsof -i :3000` pour le trouver ; ou définissez `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Mode production sans `DASHBOARD_BASIC_AUTH_USER/PASS` | Exportez les variables d'environnement ou passez `LORE_DASHBOARD_DISABLE_AUTH=1` (développement uniquement) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Un env correspond à `admin-local` / `change-me` / `demo` etc | Générez de vraies valeurs via `openssl rand -hex 32` |
| `429 Too Many Requests` | Limitation de débit déclenchée | Attendez la fenêtre de refroidissement (30s par défaut après 5 échecs d'authentification) ; ou définissez `LORE_RATE_LIMIT_DISABLED=1` en développement |
| `agentmemory adapter unhealthy` | L'environnement d'exécution agentmemory local ne tourne pas | Démarrez agentmemory ou définissez `LORE_AGENTMEMORY_REQUIRED=0` pour un saut silencieux |
| Le client MCP voit `-32602 Invalid params` | L'entrée de l'outil a échoué à la validation du schéma zod | Vérifiez le tableau `invalid_params` dans le corps de l'erreur |
| Tableau de bord 401 sur chaque page | Mauvais identifiants Basic Auth | Ré-exportez les variables d'environnement et redémarrez le processus du tableau de bord |

## Obtenir de l'aide

- Signaler un bug : https://github.com/Lore-Context/lore-context/issues
- Divulgation de sécurité : voir [SECURITY.md](SECURITY.md)
- Contribuer à la documentation : voir [CONTRIBUTING.md](CONTRIBUTING.md)
