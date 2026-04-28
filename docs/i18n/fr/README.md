<div align="center">

> 🤖 Ce document a été traduit automatiquement de l'anglais. Les améliorations via PR sont les bienvenues — consultez le [guide de contribution aux traductions](../README.md).

# Lore Context

**Le plan de contrôle pour la mémoire, l'évaluation et la gouvernance des agents IA.**

Sachez ce que chaque agent a mémorisé, utilisé et devrait oublier — avant que la mémoire ne devienne un risque en production.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Démarrage rapide](getting-started.md) · [Référence API](api-reference.md) · [Architecture](architecture.md) · [Intégrations](integrations.md) · [Déploiement](deployment.md) · [Changelog](CHANGELOG.md)

🌐 **Lire dans votre langue** : [English](../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](./README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## Qu'est-ce que Lore Context

Lore Context est un **plan de contrôle open-core** pour la mémoire des agents IA : il compose le contexte à partir de la mémoire, de la recherche et des traces d'outils ; évalue la qualité de récupération sur vos propres jeux de données ; achemine le contenu sensible vers une révision de gouvernance ; et exporte la mémoire dans un format d'échange portable que vous pouvez migrer entre différents backends.

Il ne cherche pas à être une autre base de données de mémoire. La valeur unique réside dans ce qui se superpose à la mémoire :

- **Context Query** — un point d'entrée unique compose mémoire + web + dépôt + traces d'outils, et retourne un bloc de contexte gradué avec sa provenance.
- **Memory Eval** — exécute Recall@K, Precision@K, MRR, stale-hit-rate, latence p95 sur des jeux de données qui vous appartiennent ; persiste les exécutions et les compare pour détecter les régressions.
- **Governance Review** — cycle de vie à six états (`candidate / active / flagged / redacted / superseded / deleted`), analyse des balises de risque, heuristiques d'empoisonnement, journal d'audit immuable.
- **Portabilité de type MIF** — export/import JSON + Markdown préservant `provenance / validity / confidence / source_refs / supersedes / contradicts`. Fonctionne comme format de migration entre backends de mémoire.
- **Multi-Agent Adapter** — intégration `agentmemory` de première classe avec sonde de version + mode dégradé ; contrat d'adaptateur propre pour d'autres environnements d'exécution.

## Quand l'utiliser

| Utilisez Lore Context quand... | Utilisez une base de données de mémoire (agentmemory, Mem0, Supermemory) quand... |
|---|---|
| Vous devez **prouver** ce que votre agent a mémorisé, pourquoi, et si cela a été utilisé | Vous avez juste besoin d'un stockage de mémoire brut |
| Vous exécutez plusieurs agents (Claude Code, Cursor, Qwen, Hermes, Dify) et souhaitez un contexte de confiance partagé | Vous construisez un agent unique et acceptez un niveau de mémoire verrouillé par un fournisseur |
| Vous avez besoin d'un déploiement local ou privé pour des raisons de conformité | Vous préférez un SaaS hébergé |
| Vous avez besoin d'une évaluation sur vos propres jeux de données, pas sur les benchmarks des fournisseurs | Les benchmarks des fournisseurs sont un signal suffisant |
| Vous souhaitez migrer la mémoire entre systèmes | Vous ne prévoyez jamais de changer de backend |

## Démarrage rapide

```bash
# 1. Cloner + installer
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Générer une vraie clé API (ne pas utiliser de valeurs fictives dans un environnement autre que le développement local)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. Démarrer l'API (stockage fichier, Postgres non requis)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Écrire une mémoire
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Interroger le contexte
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Pour la configuration complète (Postgres, Docker Compose, tableau de bord, intégration MCP), voir [docs/getting-started.md](getting-started.md).

## Architecture

```text
                       ┌─────────────────────────────────────────────┐
   MCP clients ──────► │ apps/api  (REST + auth + rate limit + logs) │
   (Claude Code,       │   ├── context router (memory/web/repo/tool) │
    Cursor, Qwen,      │   ├── context composer                      │
    Dify, Hermes...)   │   ├── governance + audit                    │
                       │   ├── eval runner                           │
                       │   └── MIF import/export                     │
                       └────────┬────────────────────────────────────┘
                                │
                  ┌─────────────┼──────────────────────────┐
                  ▼             ▼                          ▼
           Postgres+pgvector   agentmemory adapter     packages/search
           (incremental        (version-probed,        (BM25 / hybrid
            persistence)        degraded-mode safe)     pluggable)
                                                                 ▲
                       ┌─────────────────────────────┐           │
                       │ apps/dashboard  (Next.js)   │ ──────────┘
                       │   protected by Basic Auth   │
                       │   memory · traces · eval    │
                       │   governance review queue   │
                       └─────────────────────────────┘
```

Pour les détails, voir [docs/architecture.md](architecture.md).

## Ce qui est inclus dans v0.4.0-alpha

| Capacité | Statut | Emplacement |
|---|---|---|
| REST API avec authentification par clé API (reader/writer/admin) | ✅ Production | `apps/api` |
| Serveur MCP stdio (transport legacy + SDK officiel) | ✅ Production | `apps/mcp-server` |
| Tableau de bord Next.js avec protection HTTP Basic Auth | ✅ Production | `apps/dashboard` |
| Persistence incrémentielle Postgres + pgvector | ✅ Optionnel | `apps/api/src/db/` |
| Machine à états de gouvernance + journal d'audit | ✅ Production | `packages/governance` |
| Évaluateur (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Production | `packages/eval` |
| Import/export MIF v0.2 avec `supersedes` + `contradicts` | ✅ Production | `packages/mif` |
| Adaptateur `agentmemory` avec sonde de version + mode dégradé | ✅ Production | `packages/agentmemory-adapter` |
| Limitation de débit (par IP + par clé avec recul exponentiel) | ✅ Production | `apps/api` |
| Journalisation JSON structurée avec masquage des champs sensibles | ✅ Production | `apps/api/src/logger.ts` |
| Déploiement privé Docker Compose | ✅ Production | `docker-compose.yml` |
| Jeu de données de démonstration + tests de fumée + test UI Playwright | ✅ Production | `examples/`, `scripts/` |
| Synchronisation cloud multi-locataires hébergée | ⏳ Feuille de route | — |

Voir [CHANGELOG.md](CHANGELOG.md) pour les notes de version complètes de v0.4.0-alpha.

## Intégrations

Lore Context parle MCP et REST et s'intègre avec la plupart des IDE d'agents et des interfaces de chat :

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
| Autre / MCP générique | [docs/integrations/README.md](integrations.md) |

## Déploiement

| Mode | Quand l'utiliser | Documentation |
|---|---|---|
| **Fichier local** | Développement solo, prototype, tests de fumée | Ce README, Démarrage rapide ci-dessus |
| **Postgres+pgvector local** | Nœud unique de qualité production, recherche sémantique à grande échelle | [docs/deployment/README.md](deployment.md) |
| **Docker Compose privé** | Déploiement d'équipe auto-hébergé, réseau isolé | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Cloud géré** | Prévu pour v0.6 | — |

Tous les chemins de déploiement nécessitent des secrets explicites : `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. Le script `scripts/check-env.mjs` refuse le démarrage en production si une valeur correspond à un modèle fictif.

## Sécurité

v0.4.0-alpha implémente une posture de défense en profondeur adaptée aux déploiements alpha non publics :

- **Authentification** : jetons bearer de clé API avec séparation des rôles (`reader`/`writer`/`admin`) et portée par projet. Le mode sans clé échoue en production.
- **Limitation de débit** : double seau par IP + par clé avec recul sur les échecs d'authentification (429 après 5 échecs en 60s, blocage de 30s).
- **Tableau de bord** : intergiciel HTTP Basic Auth. Refuse de démarrer en production sans `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Conteneurs** : tous les Dockerfiles s'exécutent en tant qu'utilisateur non-root `node` ; HEALTHCHECK sur api + dashboard.
- **Secrets** : zéro identifiant codé en dur ; toutes les valeurs par défaut sont des variables requises ou en échec. `scripts/check-env.mjs` rejette les valeurs fictives en production.
- **Gouvernance** : analyse regex PII / clé API / JWT / clé privée à chaque écriture ; contenu à risque élevé acheminé automatiquement vers la file de révision ; journal d'audit immuable à chaque transition d'état.
- **Empoisonnement de mémoire** : détection heuristique sur les motifs de dominance de consensus + verbe impératif.
- **MCP** : validation de schéma zod sur chaque entrée d'outil ; les outils mutants nécessitent un `reason` (≥8 caractères) et exposent `destructiveHint: true` ; les erreurs amont sont nettoyées avant d'être retournées au client.
- **Journalisation** : JSON structuré avec masquage automatique des champs `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Divulgations de vulnérabilités : [SECURITY.md](SECURITY.md).

## Structure du projet

```text
apps/
  api/                # REST API + Postgres + governance + eval (TypeScript)
  dashboard/          # Tableau de bord Next.js 16 avec intergiciel Basic Auth
  mcp-server/         # Serveur MCP stdio (transports legacy + SDK officiel)
  web/                # Rendu HTML côté serveur (interface sans JS de secours)
  website/            # Site marketing (géré séparément)
packages/
  shared/             # Types partagés, erreurs, utilitaires ID/token
  agentmemory-adapter # Passerelle vers agentmemory amont + sonde de version
  search/             # Fournisseurs de recherche modulaires (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + primitives de métriques
  governance/         # Machine à états + analyse de risque + empoisonnement + audit
docs/
  i18n/<lang>/        # README localisé en 17 langues
  integrations/       # 11 guides d'intégration agent-IDE
  deployment/         # Local + Postgres + Docker Compose
  legal/              # Confidentialité / CGU / Cookies (droit de Singapour)
scripts/
  check-env.mjs       # Validation des variables d'environnement en mode production
  smoke-*.mjs         # Tests de fumée de bout en bout
  apply-postgres-schema.mjs
```

## Prérequis

- Node.js `>=22`
- pnpm `10.30.1`
- (Optionnel) Postgres 16 avec pgvector pour une mémoire de qualité recherche sémantique

## Contribuer

Les contributions sont les bienvenues. Veuillez lire [CONTRIBUTING.md](CONTRIBUTING.md) pour le workflow de développement, le protocole de messages de commit et les attentes en matière de révision.

Pour les traductions de documentation, voir le [guide de contribution i18n](../README.md).

## Opéré par

Lore Context est opéré par **REDLAND PTE. LTD.** (Singapour, UEN 202304648K). Le profil de l'entreprise, les conditions légales et le traitement des données sont documentés dans [`docs/legal/`](../../legal/).

## Licence

Le dépôt Lore Context est sous licence [Apache License 2.0](../../LICENSE). Les packages individuels sous `packages/*` déclarent MIT pour faciliter la consommation en aval. Voir [NOTICE](../../NOTICE) pour les attributions amont.

## Remerciements

Lore Context s'appuie sur [agentmemory](https://github.com/agentmemory/agentmemory) comme environnement d'exécution de mémoire local. Les détails du contrat amont et la politique de compatibilité de version sont documentés dans [UPSTREAM.md](../../UPSTREAM.md).
