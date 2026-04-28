> 🤖 Ce document a été traduit automatiquement de l'anglais. Les améliorations via PR sont les bienvenues — consultez le [guide de contribution aux traductions](../README.md).

# Journal des modifications

Toutes les modifications notables apportées à Lore Context sont documentées ici. Le format est basé sur
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) et ce projet
respecte la [Gestion sémantique de version 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v0.4.0-alpha] — 2026-04-28

Premier alpha public. Clôture le sprint de renforcement de la production qui a transformé le
MVP ayant échoué à l'audit en un alpha candidat à la publication. Tous les éléments d'audit P0 résolus, 12 des 13 éléments P1
résolus (un partiel — voir les Notes), 117+ tests réussis, compilation complète du monorepo sans erreur.

### Ajouts

- **`packages/eval/src/runner.ts`** — vrai `EvalRunner` (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). L'évaluation peut maintenant exécuter une évaluation de récupération de bout en bout contre
  un jeu de données appartenant à l'utilisateur et persister les exécutions en JSON pour la détection de régression dans le temps.
- **`packages/governance/src/state.ts`** — machine à états de gouvernance à six états
  (`candidate / active / flagged / redacted / superseded / deleted`) avec table de transition légale explicite. Les transitions illégales lèvent une erreur.
- **`packages/governance/src/audit.ts`** — aide d'ajout au journal d'audit immuable intégré
  avec le type `AuditLog` de `@lore/shared`.
- **`packages/governance/detectPoisoning`** — heuristique pour la détection d'empoisonnement de mémoire
  utilisant la dominance de source unique (>80 %) et la correspondance de motifs de verbes impératifs.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — sonde de version amont basée sur semver
  avec comparaison manuelle (sans nouvelle dépendance). Respecte
  `LORE_AGENTMEMORY_REQUIRED=0` pour le mode dégradé sans bruit.
- **`packages/mif`** — champs `supersedes: string[]` et `contradicts: string[]` ajoutés
  à `LoreMemoryItem`. Aller-retour préservé dans les formats JSON et Markdown.
- **`apps/api/src/logger.ts`** — journaliseur JSON structuré avec masquage automatique des
  champs sensibles (`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`). `requestId` circule à travers chaque requête.
- **`apps/dashboard/middleware.ts`** — intergiciel HTTP Basic Auth. Le démarrage en production
  est refusé sans `DASHBOARD_BASIC_AUTH_USER` et `DASHBOARD_BASIC_AUTH_PASS`.
- **`scripts/check-env.mjs`** — validateur d'environnement en mode production. Refuse de démarrer
  l'application si une valeur d'environnement correspond à un modèle fictif (`read-local`,
  `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`).
- **Limitation de débit** — limiteur de jetons double seau par IP et par clé avec recul sur les échecs d'authentification
  (5 échecs en 60s → blocage de 30s → réponse 429). Configurable via
  `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED`.
- **Arrêt en douceur** — les gestionnaires SIGTERM/SIGINT drainent les requêtes en cours jusqu'à 10s,
  vident les écritures Postgres en attente, ferment le pool, forcent la sortie à 15s.
- **Index de base de données** — index B-tree sur `(project_id)` / `(status)` /
  `(created_at)` pour `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs`. Index GIN sur le contenu jsonb `content` et `metadata`.
- **Validation d'entrée MCP zod** — chaque outil MCP exécute maintenant `safeParse` contre un
  schéma zod par outil ; les échecs retournent JSON-RPC `-32602` avec les problèmes nettoyés.
- **`destructiveHint` MCP + `reason` requis** — chaque outil mutant
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) nécessite un
  `reason` d'au moins 8 caractères et expose `destructiveHint: true`.
- 117+ nouveaux cas de test dans `apps/api`, `apps/mcp-server`, `packages/eval`,
  `packages/governance`, `packages/mif`, `packages/agentmemory-adapter`.
- Documentation multilingue : README en 17 langues dans `docs/i18n/<lang>/`.
- `CHANGELOG.md` (ce fichier).
- `docs/getting-started.md` — démarrage rapide pour développeurs en 5 minutes.
- `docs/api-reference.md` — référence des points d'accès REST API.
- `docs/i18n/README.md` — guide de contribution aux traductions.

### Modifications

- **`packages/mif`** version d'enveloppe `"0.1"` → `"0.2"`. Import rétrocompatible.
- **`LORE_POSTGRES_AUTO_SCHEMA`** par défaut `true` → `false`. Les déploiements en production
  doivent explicitement opter pour l'application automatique du schéma ou exécuter `pnpm db:schema`.
- **`apps/api`** l'analyseur de corps de requête est maintenant en flux avec une limite stricte de taille de charge utile
  (`LORE_MAX_JSON_BYTES`, 1 Mio par défaut). Les requêtes trop volumineuses retournent 413.
- **Authentification de bouclage** modifiée : suppression de la dépendance à l'en-tête URL `Host` ; la
  détection de bouclage utilise maintenant uniquement `req.socket.remoteAddress`. En production sans clés API
  configurées, l'API échoue et refuse les requêtes (auparavant : accordait silencieusement le rôle admin).
- **Les clés API à portée limitée** doivent maintenant fournir `project_id` pour `/v1/memory/list`,
  `/v1/eval/run`, et `/v1/memory/import` (auparavant : `project_id` non défini court-circuitait).
- **Tous les Dockerfiles** s'exécutent maintenant en tant qu'utilisateur non-root `node`. `apps/api/Dockerfile` et
  `apps/dashboard/Dockerfile` déclarent `HEALTHCHECK`.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` utilise maintenant `${POSTGRES_PASSWORD:?must
  be set}` — le démarrage échoue rapidement sans mot de passe explicite.
- **`docs/deployment/compose.private-demo.yml`** — même modèle requis ou échec.
- **`.env.example`** — toutes les valeurs par défaut de démonstration supprimées et remplacées par des espaces réservés `# REQUIRED`.
  Nouvelles variables documentées pour la limitation de débit, le délai de requête, la limite de charge utile,
  le mode requis agentmemory, l'authentification de base du tableau de bord.

### Corrections

- **Vulnérabilité de contournement d'authentification de bouclage** (P0). Un attaquant pouvait envoyer `Host: 127.0.0.1`
  pour usurper la détection de bouclage et obtenir le rôle admin sans clé API.
- **Délégation confuse dans le proxy du tableau de bord** (P0). Le proxy du tableau de bord injectait
  `LORE_API_KEY` pour les requêtes non authentifiées, accordant des pouvoirs admin à quiconque pouvait
  atteindre le port 3001.
- **Défense contre la force brute** (P0). Les clés de démonstration (`admin-local`, `read-local`, `write-local`)
  affichées dans le README/`.env.example` pouvaient être énumérées indéfiniment ; la limitation de débit et
  la suppression des valeurs par défaut défendent maintenant contre cela.
- **Plantage d'analyse JSON sur `LORE_API_KEYS` malformé** — le processus se termine maintenant avec une erreur claire
  au lieu de générer une trace de pile.
- **OOM via un corps de requête volumineux** — les corps dépassant la limite configurée retournent maintenant 413
  au lieu de faire planter le processus Node.
- **Fuite d'erreur MCP** — les erreurs d'API amont incluant du SQL brut, des chemins de fichiers ou
  des traces de pile sont maintenant nettoyées en `{code, generic-message}` avant d'atteindre les
  clients MCP.
- **Plantage d'analyse JSON du tableau de bord** — les réponses JSON invalides ne font plus planter l'interface ;
  les erreurs sont affichées comme état visible par l'utilisateur.
- **MCP `memory_update` / `memory_supersede`** ne nécessitaient pas auparavant de `reason` ;
  ceci est maintenant appliqué par le schéma zod.
- **Pool Postgres** : `statement_timeout` maintenant fixé à 15s ; risque de temps de requête illimité
  précédemment sous des requêtes jsonb malformées.

### Sécurité

- Tous les résultats d'audit P0 (contournement de bouclage / authentification du tableau de bord / limitation de débit /
  secrets de démonstration) résolus. Voir public release notes pour la piste d'audit complète.
- `pnpm audit --prod` signale zéro vulnérabilité connue au moment de la publication.
- Identifiants de démonstration supprimés de tous les modèles de déploiement et exemples de README.
- Les images de conteneurs s'exécutent maintenant en tant que non-root par défaut.

### Notes / Limitations connues

- **P1-1 partiel** : `/v1/context/query` conserve un comportement permissif avec les clés à portée limitée pour
  éviter de casser les tests consommateurs existants. Les autres routes affectées (`/v1/memory/list`,
  `/v1/eval/run`, `/v1/memory/import`) appliquent `project_id`. Suivi pour v0.5.
- **La synchronisation cloud multi-locataires hébergée** n'est pas implémentée dans v0.4.0-alpha. Uniquement les déploiements locaux et
  Compose-privé.
- **Qualité des traductions** : les localisations README sont générées par LLM et clairement
  étiquetées ; les PR de la communauté pour affiner chaque locale sont les bienvenues (voir
  [`docs/i18n/README.md`](../README.md)).
- **La spécification OpenAPI / Swagger** n'est pas encore packagée. La surface REST est documentée en
  prose dans [`docs/api-reference.md`](api-reference.md). Suivi pour v0.5.

### Remerciements

Cette version est le résultat d'un sprint de renforcement de la production d'une journée impliquant
l'exécution de sous-agents parallèles contre un plan d'audit structuré. Le plan et les artefacts d'audit

## [v0.0.0] — pré-publication

Jalons de développement interne, non publiés. Implémentés :

- Échafaudages de packages d'espace de travail (monorepo TypeScript, espaces de travail pnpm).
- Pipeline de construction/test TypeScript partagé.
- Système de types mémoire / contexte / éval / audit dans `@lore/shared`.
- Limite de l'adaptateur `agentmemory`.
- REST API local avec routeur et compositeur de contexte.
- Persistance de fichier JSON + magasin d'exécution Postgres optionnel avec upsert incrémentiel.
- Flux de détails / édition / succession / oubli de mémoire avec suppression définitive explicite.
- Comptabilité réelle de l'utilisation de la mémoire (`useCount`, `lastUsedAt`).
- Retour sur les traces (`useful` / `wrong` / `outdated` / `sensitive`).
- Import/export JSON + Markdown de type MIF avec champs de gouvernance.
- Ensemble de regex de détection de secrets.
- Métriques d'évaluation directes basées sur la session ; exécutions d'évaluation comparatives de fournisseurs ; liste des exécutions d'évaluation.
- Protection par clé API avec séparation des rôles reader/writer/admin.
- File de révision de gouvernance ; API de journal d'audit.
- HTML de tableau de bord servi par API ; tableau de bord Next.js autonome.
- Données de démonstration ; génération de configuration d'intégration.
- Packaging Docker/Compose privé.
- Transports MCP stdio SDK legacy + officiel.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
