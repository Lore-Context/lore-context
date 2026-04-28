> 🤖 Ce document a été traduit automatiquement de l'anglais. Les améliorations via PR sont les bienvenues — consultez le [guide de contribution aux traductions](../README.md).

# Déploiement privé

> **Générez les clés avec `openssl rand -hex 32` — n'utilisez jamais les valeurs fictives ci-dessous en production.**

Ce guide packagise Lore pour une démonstration privée ou un déploiement d'équipe interne sans modifier les chemins du code applicatif. Le bundle de déploiement consiste en :

- `apps/api/Dockerfile` : image REST API.
- `apps/dashboard/Dockerfile` : image de tableau de bord Next.js autonome.
- `Dockerfile` : image optionnelle de lanceur MCP pour les clients stdio.
- `docs/deployment/compose.private-demo.yml` : pile compose copier-coller pour Postgres, API, tableau de bord et un service MCP à la demande.
- `examples/demo-dataset/**` : données de démarrage pour les flux de stockage fichier, d'import et d'évaluation.

## Topologie recommandée

- `postgres` : magasin durable pour les démonstrations partagées ou multi-opérateurs.
- `api` : REST API Lore sur un réseau bridge interne, publiée sur le bouclage par défaut.
- `dashboard` : interface opérateur, publiée sur le bouclage par défaut et proxifiant vers l'API via `LORE_API_URL`.
- `mcp` : conteneur stdio optionnel pour les opérateurs Claude, Cursor et Qwen qui souhaitent un lanceur conteneurisé au lieu de `node apps/mcp-server/dist/index.js` sur l'hôte.

La pile compose maintient intentionnellement une exposition publique étroite. Postgres, API et tableau de bord sont tous liés à `127.0.0.1` par défaut via des mappings de ports paramétrés.

## Pré-vol

1. Copiez `.env.example` vers un fichier d'exécution privé tel que `.env.private`.
2. Remplacez `POSTGRES_PASSWORD`.
3. Préférez `LORE_API_KEYS` à un seul `LORE_API_KEY`.
4. Définissez `DASHBOARD_LORE_API_KEY` sur une clé `admin` pour le workflow opérateur complet, ou sur une clé `reader` à portée limitée pour les démonstrations en lecture seule. Définissez `MCP_LORE_API_KEY` sur une clé `writer` ou `reader` selon que le client doit muter la mémoire.

Exemple de séparation des rôles :

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
DASHBOARD_BASIC_AUTH_USER=admin
DASHBOARD_BASIC_AUTH_PASS=<YOUR_DASHBOARD_PASSWORD>
```

## Démarrer la pile

Construisez et démarrez la pile de démonstration privée depuis la racine du dépôt :

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Vérifications de santé :

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl -u "${DASHBOARD_BASIC_AUTH_USER}:${DASHBOARD_BASIC_AUTH_PASS}" \
  http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Alimenter les données de démonstration

Pour la pile compose soutenue par Postgres, importez les mémoires de démonstration packagées après que l'API soit en bonne santé :

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Exécutez la requête d'évaluation packagée :

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Si vous souhaitez une démonstration sans base de données sur un seul hôte, pointez l'API vers l'instantané du magasin fichier :

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## Modèles de lanceur MCP

Modèle préféré :

- Exécutez le lanceur MCP près du client.
- Pointez `LORE_API_URL` vers l'URL de l'API privée.
- Fournissez la clé API la plus petite possible au lanceur.

Lanceur basé sur l'hôte :

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Lanceur conteneurisé :

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

Le lanceur conteneurisé est utile pour une configuration de poste de travail reproductible, mais c'est toujours un processus stdio, pas un service réseau public de longue durée.

## Paramètres de sécurité par défaut

- Gardez `API_BIND_HOST`, `DASHBOARD_BIND_HOST` et `POSTGRES_BIND_HOST` sur `127.0.0.1` sauf si un proxy inverse authentifié est déjà devant la pile.
- Préférez `LORE_API_KEYS` avec séparation `reader` / `writer` / `admin` plutôt que de réutiliser une seule clé admin globale partout.
- Utilisez des clés à portée de projet pour les clients de démonstration. L'identifiant de projet de démonstration packagé est `demo-private`.
- Gardez `AGENTMEMORY_URL` sur le bouclage et n'exposez pas `agentmemory` brut directement.
- Laissez `LORE_AGENTMEMORY_REQUIRED=0` sauf si le déploiement privé dépend vraiment d'un environnement d'exécution agentmemory actif.
- Gardez `LORE_POSTGRES_AUTO_SCHEMA=true` uniquement pour les environnements internes contrôlés. Une fois que l'amorçage du schéma fait partie de votre processus de publication, vous pouvez le fixer à `false`.

## Fichiers à réutiliser

- Exemple de Compose : [compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- Image API : [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Image tableau de bord : [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- Image MCP : [Dockerfile](../../../Dockerfile)
- Données de démonstration : [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
