<div align="center">

# Lore Context

**Le plan de contrôle pour la mémoire, l'évaluation et la gouvernance des agents IA.**

Sachez ce que chaque agent a mémorisé, utilisé et devrait oublier — avant que la mémoire ne devienne un risque en production.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Démarrage rapide](../../getting-started.md) · [Démarrage rapide sur le site](https://lorecontext.com/quickstart/) · [Méthodologie de benchmark](https://lorecontext.com/benchmark/) · [Référence API](../../api-reference.md) · [Architecture](../../architecture.md) · [Plan du projet](../../project-plan.md) · [Statut de la version](../../release-status.md) · [Feuille de route](../../roadmap.md) · [Intégrations](../../integrations/README.md) · [Déploiement](../../deployment/README.md) · [Journal des modifications](../../../CHANGELOG.md)

🌐 **Lire dans votre langue** : [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

Les documents localisés peuvent être en retard par rapport aux notes de version anglaises actuelles ; les docs canoniques v2.1 sont le README anglais et l'ensemble `docs/`.

</div>

---

> Ce document est une traduction automatique de l'anglais, peut être en décalage avec la dernière version, et les PR sont les bienvenues — consultez le [guide des contributeurs à la traduction](../README.md).

## Qu'est-ce que Lore Context

Lore Context est un **plan de contrôle open-core** pour la mémoire des agents IA : il compose le contexte à travers la mémoire, la recherche, les graphes de dépôt et les traces d'outils ; évalue la qualité de la récupération sur vos propres jeux de données ; achemine la revue de gouvernance pour le contenu sensible ; et exporte la mémoire dans un format d'échange portable que vous pouvez déplacer entre les backends.

Il ne cherche pas à être une autre base de données de mémoire. La valeur unique réside dans ce qui se trouve au-dessus de la mémoire :

- **Context Query** — un point d'entrée unique compose mémoire + web + dépôt + traces d'outils, et retourne un bloc de contexte classé avec provenance.
- **Memory Eval** — exécute Recall@K, Precision@K, MRR, stale-hit-rate, latence p95 sur des jeux de données que vous possédez ; persiste les exécutions et les compare pour la détection de régressions.
- **Governance Review** — cycle de vie à six états (`candidate / active / flagged / redacted / superseded / deleted`), analyse des balises de risque, heuristiques d'empoisonnement, journal d'audit immuable.
- **Portabilité de type MIF** — export/import JSON + Markdown préservant `provenance / validity / confidence / source_refs / supersedes / contradicts`. Fonctionne comme format de migration entre backends de mémoire.
- **Repo Graph** — indexation déterministe de dépôt (fichiers, symboles, imports, appels, routes, tests) exposée via des routes API et des outils MCP en lecture seule afin que les agents ancrent les réponses relatives au dépôt dans un contrat de contexte de projet stable.
- **Multi-Agent Adapter** — intégration `agentmemory` de première classe avec sonde de version + repli en mode dégradé ; contrat d'adaptateur propre pour des runtimes supplémentaires.

## Quand l'utiliser

| Utilisez Lore Context quand... | Utilisez une base de données de mémoire (agentmemory, Mem0, Supermemory) quand... |
|---|---|
| Vous devez **prouver** ce que votre agent a mémorisé, pourquoi, et si cela a été utilisé | Vous avez simplement besoin d'un stockage de mémoire brut |
| Vous faites tourner plusieurs agents (Claude Code, Cursor, Qwen, Hermes, Dify) et souhaitez un contexte de confiance partagé | Vous construisez un agent unique et acceptez un niveau de mémoire lié à un fournisseur |
| Vous avez besoin d'un déploiement local ou privé pour des raisons de conformité | Vous préférez un SaaS hébergé |
| Vous avez besoin d'une évaluation sur vos propres jeux de données, pas sur les benchmarks des fournisseurs | Les benchmarks des fournisseurs sont un signal suffisant |
| Vous souhaitez migrer la mémoire entre les systèmes | Vous ne prévoyez jamais de changer de backend |

## Démarrage rapide

```bash
# 1. Cloner + installer
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Exécuter l'assistant de démarrage rapide et inspecter le rapport d'activation
pnpm quickstart -- --dry-run --activation-report

# 3. Générer une vraie clé API (ne pas utiliser de valeurs fictives dans un environnement autre que le développement local uniquement)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. Démarrer l'API (basée sur fichiers, Postgres non requis)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Écrire une mémoire
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Interroger le contexte, puis inspecter le traceId retourné dans le journal de preuves
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Pour le démarrage rapide du site web public, voir
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). Pour la
configuration complète (Postgres, Docker Compose, Dashboard, intégration MCP), voir
[docs/getting-started.md](../../getting-started.md).

Le démarrage rapide alpha canonique est `git clone` + `pnpm quickstart`. Lore ne
publie pas et ne revendique pas actuellement de package npm public `@lore-context/quickstart`.
Le serveur MCP stdio est publié séparément en tant que
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
pour la distribution dans le registre et les clients, et le middleware SDK est publié en tant que
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) et `lore-context-middleware` (PyPI).

Pour la découverte lisible par l'IA, le site web publie `/llms.txt` et `/llms-full.txt`
à partir de la documentation publique uniquement. L'entrée du registre MCP officiel est publiée,
et des brouillons de distribution supplémentaires se trouvent sous [docs/distribution](../../distribution/).
Les brouillons de lancement se trouvent sous [docs/launch](../../launch/), et l'intégration
des partenaires de conception sous [docs/design-partners](../../design-partners/). La page de benchmark
public est une méthodologie reproductible et un petit rapport d'exécution de test, et non une
affirmation de victoire sur un benchmark concurrentiel.

## Architecture

```text
                       ┌───────────────────────────────────────────────┐
  MCP/REST clients ─► │ apps/api  (auth + rate limit + evidence)       │
  (Claude Code,       │   ├── Memory Inbox / lifecycle / audit         │
   Codex, Cursor,     │   ├── capture ingestion + recall hydration     │
   OpenCode...)       │   ├── context query (memory/web/repo/traces)   │
                       │   ├── repo graph query / symbol / impact       │
                       │   ├── Google sign-in + hosted MCP metadata     │
                       │   └── OpenAPI + usage + operator surfaces      │
                       └───────────────┬───────────────────────────────┘
                                       │
                         capture / embedding / graph jobs
                                       ▼
                       ┌───────────────────────────────────────────────┐
                       │ memory-worker  (AWS SQS + DLQ fan-out)        │
                       │   ├── auto redaction / curation / save        │
                       │   ├── dreaming butler (prune/merge/resolve)    │
                       │   ├── private Qwen3 embedding service         │
                       │   └── Qdrant dense+sparse indexing            │
                       └───────────────┬───────────────────────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
          RDS PostgreSQL 16      Qdrant derived index   apps/dashboard
          truth store + audit    lore_memories_v12      user-facing SaaS
```

Pour les détails, voir [docs/architecture.md](../../architecture.md).

## Nouveautés dans v2.1.0

`v2.1.0` est la version **Repo Graph API et MCP Tools**. Elle fait du graphe de
dépôt de Lore une surface de mémoire d'agent de première classe : indexation
déterministe de dépôt TypeScript/JavaScript pour les fichiers, symboles, imports,
appels, routes, tests et indices de processus, exposée via des routes API et des
outils MCP en lecture seule afin que les agents ancrent leurs réponses relatives
au dépôt dans un contrat de contexte de projet stable plutôt que dans une
recherche textuelle ad hoc.

v2.1.0 est déployé en production AWS et sur le site web public. Il s'appuie sur
le moteur de mémoire hybride (RDS vérité source, fan-out SQS AWS, index dérivé
Qdrant, service d'embedding Qwen3 privé, `HybridSearchOrchestrator` à 7 flux),
le worker de consolidation de mémoire dreaming butler, la boucle
d'auto-amélioration de la mémoire des agents, les packages middleware SDK
publiés, et le substrat SaaS commercial livré sur la ligne v1.7–v2.0.

| Capacité | Statut | Emplacement |
|---|---|---|
| API de graphe de dépôt + outils MCP (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Production | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Indexeur de graphe de connaissance du code | ✅ Production | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query composant mémoire + web + dépôt + traces d'outils | ✅ Production | `apps/api`, `docs/api-reference.md` |
| `HybridSearchOrchestrator` à 7 flux (FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki) | ✅ Production | `packages/search` |
| Re-classeur cross-encoder (post-fusion, opt-in) | ✅ Production | `apps/api/src/rerankers/` |
| Consolidation de mémoire dreaming butler (élaguer / fusionner / résoudre / émerger) | ✅ Production, avec flag | `apps/api/src/workers/butler-v18.ts` |
| Boucle d'auto-amélioration de la mémoire des agents + recettes de contexte | ✅ Production, promotion avec approbation humaine | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| Middleware SDK (auto-inject + auto-retain pour les clients OpenAI / Anthropic) | ✅ Publié | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Coffre-fort de secrets pour agents IA (natif MCP, autorisation en trois boutons) | ✅ Bêta, audit cryptographique en attente | `apps/mcp-server`, `apps/api` |
| Moteur de mémoire cloud : RDS vérité source + fan-out SQS + index Qdrant | ✅ Production | `apps/api`, `apps/api/src/worker.ts` |
| Service vectoriel Qwen3-Embedding-0.6B 1024-dim privé | ✅ Production | `apps/api/src/embedding.ts` |
| Ingestion automatique de capture et exceptions Memory Inbox | ✅ Production | `apps/api`, `packages/capture` |
| Connexion Google + amorçage du coffre-fort personnel | ✅ Production | `apps/api`, `apps/dashboard` |
| SaaS commercial : abonnements individuels, facturation, contrôle des quotas | ✅ Production | cloud hébergé (`Lore-Context/lore-cloud`) |
| API REST avec authentification par clé API (reader/writer/admin) | ✅ Production | `apps/api` |
| Contrat OpenAPI 3.1 sur `/openapi.json` (rapporte `2.1.0`) | ✅ Production | `apps/api/src/openapi.ts` |
| Serveur MCP stdio (transport SDK legacy + officiel) | ✅ Production | `apps/mcp-server` |
| Dashboard Next.js avec session Google + HTTP Basic Auth opérateur | ✅ Production | `apps/dashboard` |
| API Evidence Ledger + résumé dans le dashboard | ✅ Production | `apps/api`, `apps/dashboard` |
| Machine à états de gouvernance + journal d'audit | ✅ Production | `packages/governance` |
| Exécuteur d'évaluation (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Production | `packages/eval` |
| Import/export MIF v0.2 avec `supersedes` + `contradicts` | ✅ Production | `packages/mif` |
| Passerelle de modèles (routage tâche→modèle multi-fournisseur) | ✅ Production | `packages/model-gateway` |
| Adaptateur `agentmemory` avec sonde de version + mode dégradé | ✅ Production | `packages/agentmemory-adapter` |
| Limitation de débit, journalisation JSON structurée avec masquage des champs | ✅ Production | `apps/api` |
| Déploiement privé Docker Compose | ✅ Production | `docker-compose.yml` |
| Assistant de démarrage local `pnpm quickstart` + rapport d'activation | ✅ Production | `scripts/lore-quickstart.mjs` |
| Registre MCP officiel + docs de distribution / lancement / partenaires de conception | ✅ Production | `server.json`, `docs/distribution/`, `docs/launch/` |

Voir [CHANGELOG.md](../../../CHANGELOG.md) pour l'historique complet des versions.

## Statut de la version actuelle

`v2.1.0` est la source actuelle, la production hébergée et la ligne de version. Elle a
été déployée en production AWS et sur le site web public via le flux de version optimisé :
artefacts arm64-first immuables, test de fumée de l'API de staging, déploiement de l'API
en production, déploiement isolé du site web, audit post-version, et clôture avec tag/release.
Des vérifications externes confirment que `https://api.lorecontext.com/health` retourne
`status=ok`, `/openapi.json` rapporte `2.1.0`, et `https://lorecontext.com/status.html`
contient `v2.1.0`.

La production conserve la forme RDS / SQS / memory-worker / Qdrant cloud de v1.1+, utilise
`lore_memories_v12` comme collection Qdrant, conserve pgvector 1024-dim pour le chemin
Postgres, et ajoute le schéma additif du graphe de dépôt
(`apps/api/src/db/schema-v21-repo-graph.sql`).

Voir [docs/release-status.md](../../release-status.md) pour le snapshot de statut actuel
compatible public et [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
pour les notes de version complètes.

## Focus de la version

La version v2.1 fait du graphe de dépôt de Lore une surface de mémoire d'agent de
première classe. L'objectif est de permettre aux agents de répondre à « où est défini X »,
« qu'est-ce qui appelle ceci » et « qu'est-ce qui se casse si je modifie ceci » en s'appuyant
sur un contrat de contexte de projet déterministe et stable plutôt que sur une recherche
textuelle ad hoc :

- `@lore/repo-graph` — indexation déterministe de dépôt TypeScript/JavaScript
  pour les fichiers, symboles, imports, appels, routes, tests et indices de processus.
- Routes API : `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact`, et `POST /v1/repo/detect-changes`.
- Outils MCP : `repo.graph_query`, `repo.symbol_context`, `repo.impact`, et
  `repo.detect_changes` (lecture seule).
- `context_query(repo)` utilise désormais des preuves de graphe de dépôt soutenues par un
  fournisseur lorsqu'elles sont disponibles, avec un repli honnête « non disponible » lorsque
  le stockage du graphe de dépôt n'est pas configuré.
- Le schéma Postgres du graphe de dépôt est additif — il se superpose au schéma de
  production existant et est appliqué lors de la configuration du schéma de production/staging.

Les versions du package racine et de l'API rapportent `2.1.0` afin que `/openapi.json`
corresponde au tag de version. Le train de versions utilise les garde-fous de déploiement
fractionné API/site web optimisés introduits après v2.0.9.

Voir [docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md), et [docs/release-governance.md](../../release-governance.md).

## Intégrations

Lore Context parle MCP et REST et s'intègre avec la plupart des IDE d'agents et frontends de chat :

| Outil | Guide de configuration |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](../../integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](../../integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](../../integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](../../integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](../../integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](../../integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](../../integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](../../integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](../../integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](../../integrations/openwebui.md) |
| Autre / MCP générique | [docs/integrations/README.md](../../integrations/README.md) |

## Déploiement

| Mode | Quand l'utiliser | Documentation |
|---|---|---|
| **Fichier local** | Développement solo, prototype, test de fumée | Ce README, Démarrage rapide ci-dessus |
| **Postgres+pgvector local** | Repli local mono-nœud et tests de migration | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose privé** | Déploiement d'équipe auto-hébergé, réseau isolé | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Cloud hébergé** | RDS / SQS / memory-worker / Qdrant / embedding privé plus la pile de rappel hybride augmentée par les graphes et le substrat SaaS commercial | [docs/release-status.md](../../release-status.md) |

Tous les chemins de déploiement nécessitent des secrets explicites. Les chemins locaux/privés
nécessitent `POSTGRES_PASSWORD`, `LORE_API_KEYS` et l'authentification du dashboard. Les
déploiements hébergés nécessitent également RDS, SQS, Qdrant, le service d'embedding, OAuth,
la configuration du tunnel, et les exports du runtime de production. Le script
`scripts/check-env.mjs` refuse le démarrage en production si une valeur correspond à un modèle
fictif.

## Sécurité

v2.1.0 conserve la posture de déploiement local/privé et les garde-fous cloud hébergés
pour l'accès des utilisateurs ordinaires :

- **Authentification** : tokens bearer par clé API avec séparation des rôles (`reader`/`writer`/`admin`) et portée par projet. Le mode clés vides échoue de façon sécurisée en production.
- **Limitation de débit** : double seau par IP + par clé avec backoff sur échec d'authentification (429 après 5 échecs en 60s, verrouillage 30s).
- **Dashboard** : flux de session Google pour le produit hébergé ; HTTP Basic Auth reste disponible pour les déploiements opérateurs locaux/privés.
- **Conteneurs** : tous les Dockerfiles s'exécutent en tant qu'utilisateur non-root `node` ; HEALTHCHECK sur api + dashboard.
- **Secrets** : zéro identifiant codé en dur ; toutes les valeurs par défaut sont des variables requises-ou-échoue. `scripts/check-env.mjs` rejette les valeurs fictives en production.
- **Gouvernance** : analyse regex PII / clé API / JWT / clé privée sur les écritures ; contenu étiqueté à risque acheminé automatiquement vers la file d'attente de revue ; journal d'audit immuable sur chaque transition d'état.
- **Empoisonnement de mémoire** : détection heuristique sur les patterns de consensus + verbes impératifs.
- **MCP** : validation de schéma zod sur chaque entrée d'outil ; les outils mutants nécessitent `reason` (≥8 caractères) et exposent `destructiveHint: true` ; les erreurs en amont sont nettoyées avant le retour au client.
- **Isolation des workers** : les jobs de capture, embedding, graph, connecteur et backfill s'exécutent via des files SQS AWS avec DLQ ; Qdrant est un index dérivé et RDS reste autoritatif.
- **Journalisation** : JSON structuré avec masquage automatique des champs `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Signalement de vulnérabilités : [SECURITY.md](../../../SECURITY.md).

## Structure du projet

```text
apps/
  api/                # Plan de contrôle REST + Postgres + gouvernance + évaluation + graphe de dépôt
  dashboard/          # Dashboard Next.js avec session Google + HTTP Basic Auth opérateur
  mcp-server/         # Serveur MCP stdio (transports SDK legacy + officiel)
  cli/                # CLI lore (doctor, wiki-recompile, import/export de jeux de données)
  browser-extension/  # Scaffold de surface de capture
  web/                # Rendu HTML côté serveur (UI de repli sans JS)
  website/            # Site marketing (géré séparément)
packages/
  shared/             # Types partagés, erreurs, utilitaires ID/token
  agentmemory-adapter # Pont vers agentmemory amont + sonde de version
  search/             # HybridSearchOrchestrator à 7 flux + adaptateur de recettes
  repo-graph/         # Indexation déterministe de dépôt (v2.1)
  code-indexer/       # Indexeur de graphe de connaissance du code (TypeScript/JavaScript)
  code-indexer-python # Indexeur de graphe de connaissance du code (Python)
  capture/            # Primitives d'ingestion de capture
  connectors/         # Connecteurs de sources externes
  model-gateway/      # Routage tâche→modèle multi-fournisseur
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + primitives de métriques + recettes de contexte
  governance/         # Machine à états + analyse des risques + empoisonnement + audit
  profile/            # Types de profil vault / compte
  sdk-typescript/     # SDK client TypeScript
  sdk-python/         # SDK client Python
  sdk-go/ sdk-java/ sdk-dotnet/   # SDKs pour langages supplémentaires
  sdk-middleware-typescript/      # Middleware auto-inject + auto-retain (npm)
  sdk-middleware-python/          # Middleware auto-inject + auto-retain (PyPI)
docs/
  i18n/<lang>/        # README localisé en 17 langues
  integrations/       # Guides d'intégration agent-IDE
  deployment/         # Runbooks locaux, Docker Compose et automatisation de production
  legal/              # Confidentialité / CGU / Cookies (droit singapourien)
scripts/
  check-env.mjs       # Validation des variables d'environnement en mode production
  smoke-*.mjs         # Tests de fumée de bout en bout
  apply-postgres-schema.mjs
```

## Prérequis

- Node.js `>=22`
- pnpm `10.30.1`
- (Repli local optionnel) Postgres 16 avec pgvector
- (Hébergé/avancé) RDS PostgreSQL 16, AWS SQS, Qdrant, et service d'embedding privé

## Contribuer

Les contributions sont les bienvenues. Veuillez lire [CONTRIBUTING.md](../../../CONTRIBUTING.md) pour le workflow de développement, le protocole de message de commit, et les attentes de revue.

Pour les traductions de documentation, voir le [guide des contributeurs i18n](../README.md).

## Opéré par

Lore Context est opéré par **REDLAND PTE. LTD.** (Singapour, UEN 202304648K). Le profil de la société, les conditions légales et le traitement des données sont documentés sous [`docs/legal/`](../../legal/).

## Licence

Le dépôt Lore Context est sous licence [Apache License 2.0](../../../LICENSE). Les packages individuels sous `packages/*` déclarent MIT pour faciliter la consommation en aval. Voir [NOTICE](../../../NOTICE) pour l'attribution des sources amont.

## Remerciements

Lore Context s'appuie sur [agentmemory](https://github.com/agentmemory/agentmemory) comme runtime de mémoire local. Les détails du contrat amont et la politique de compatibilité des versions sont documentés dans [UPSTREAM.md](../../../UPSTREAM.md).
