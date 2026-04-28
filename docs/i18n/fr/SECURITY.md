> 🤖 Ce document a été traduit automatiquement de l'anglais. Les améliorations via PR sont les bienvenues — consultez le [guide de contribution aux traductions](../README.md).

# Politique de sécurité

Lore Context gère la mémoire, les traces, les journaux d'audit et les identifiants d'intégration. Traitez
les rapports de sécurité comme une priorité élevée.

## Signalement d'une vulnérabilité

N'ouvrez pas de ticket public pour les vulnérabilités suspectées, les secrets divulgués, les
contournements d'authentification, les expositions de données ou les problèmes d'isolation de locataire.

Chemin de signalement préféré :

1. Utilisez le **signalement privé de vulnérabilités GitHub** pour ce dépôt lorsqu'il est disponible.
2. Si le signalement privé n'est pas disponible, contactez les mainteneurs en privé et
   incluez :
   - la version ou le commit affecté,
   - les étapes de reproduction,
   - l'impact attendu,
   - si des secrets réels ou des données personnelles sont impliqués.

Nous visons à accuser réception des rapports crédibles dans les 72 heures.

## Versions supportées

Lore Context est actuellement un logiciel alpha pré-1.0. Les correctifs de sécurité ciblent d'abord la branche `main`.
Les versions taguées peuvent recevoir des correctifs ciblés lorsqu'une version publique est
activement utilisée par des opérateurs en aval.

| Version | Supportée |
|---|---|
| v0.4.x-alpha | ✅ Active |
| v0.3.x et antérieure | ❌ Pré-publication interne uniquement |

## Renforcement intégré (v0.4.0-alpha)

L'alpha est livré avec les contrôles de défense en profondeur suivants. Les opérateurs devraient
vérifier que ceux-ci sont actifs dans leur déploiement.

### Authentification

- **Jetons bearer de clé API** (`Authorization: Bearer <key>` ou
  en-tête `x-lore-api-key`).
- **Séparation des rôles** : `reader` / `writer` / `admin`.
- **Portée par projet** : les entrées JSON `LORE_API_KEYS` peuvent inclure une
  liste d'autorisation `projectIds: ["..."]` ; les mutations nécessitent un `project_id` correspondant.
- **Le mode sans clé échoue en production** : avec `NODE_ENV=production` et aucune
  clé configurée, l'API refuse toutes les requêtes.
- **Contournement de bouclage supprimé** : les versions précédentes faisaient confiance à `Host: 127.0.0.1` ; v0.4 utilise
  uniquement l'adresse distante au niveau du socket.

### Limitation de débit

- **Limiteur double seau par IP et par clé** avec recul sur les échecs d'authentification.
- **Valeurs par défaut** : 60 req/min par IP pour les chemins non authentifiés, 600 req/min par clé authentifiée.
- **5 échecs d'authentification en 60s → blocage de 30s** (retourne 429).
- Configurable : `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED=1` (développement uniquement).

### Protection du tableau de bord

- **Intergiciel HTTP Basic Auth** (`apps/dashboard/middleware.ts`).
- **Le démarrage en production est refusé** sans
  `DASHBOARD_BASIC_AUTH_USER` et `DASHBOARD_BASIC_AUTH_PASS`.
- `LORE_DASHBOARD_DISABLE_AUTH=1` est respecté uniquement hors production.
- Le repli de clé admin côté serveur a été **supprimé** : un utilisateur doit être authentifié via
  Basic Auth avant que le proxy du tableau de bord injecte les identifiants API amont.

### Renforcement des conteneurs

- Tous les Dockerfiles s'exécutent en tant qu'utilisateur non-root `node`.
- `apps/api/Dockerfile` et `apps/dashboard/Dockerfile` déclarent `HEALTHCHECK`
  vers `/health`.
- `apps/mcp-server` est uniquement stdio — pas d'écouteur réseau — et ne déclare pas de
  `HEALTHCHECK`.

### Gestion des secrets

- **Zéro identifiant codé en dur.** Tous les `docker-compose.yml`,
  `docs/deployment/compose.private-demo.yml` et `.env.example` utilisent la forme
  `${VAR:?must be set}` — le démarrage échoue rapidement sans valeurs explicites.
- `scripts/check-env.mjs` rejette les valeurs fictives
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`,
  `dev`, `password`) lorsque `NODE_ENV=production`.
- Tous les documents de déploiement et les exemples de README ont été nettoyés des
  identifiants de démonstration littéraux.

### Gouvernance

- **Analyse des balises de risque à chaque écriture de mémoire** : clés API, clés AWS, jetons JWT,
  clés privées, mots de passe, e-mails, numéros de téléphone détectés.
- **Machine à états à six états** avec table de transition légale explicite ; les transitions illégales lèvent une erreur.
- **Heuristiques d'empoisonnement de mémoire** : dominance de source unique + correspondance de motifs de verbes impératifs → indicateur `suspicious`.
- **Journal d'audit immuable** ajouté à chaque transition d'état.
- Le contenu à risque élevé est automatiquement acheminé vers `candidate` / `flagged` et retenu de
  la composition de contexte jusqu'à révision.

### Renforcement MCP

- Chaque entrée d'outil MCP est **validée contre un schéma zod** avant l'invocation.
  Les échecs de validation retournent JSON-RPC `-32602` avec la liste des problèmes nettoyée.
- **Tous les outils mutants** nécessitent une chaîne `reason` d'au moins 8 caractères et
  exposent `destructiveHint: true` dans leur schéma.
- Les erreurs d'API amont sont **nettoyées** avant d'être retournées aux clients MCP —
  le SQL brut, les chemins de fichiers et les traces de pile sont supprimés.

### Journalisation

- **Sortie JSON structurée** avec corrélation `requestId` à travers la chaîne de gestionnaires.
- **Masquage automatique** des champs correspondant à `content`, `query`, `memory`, `value`,
  `password`, `secret`, `token`, `key`. Le contenu réel des enregistrements de mémoire et
  des requêtes n'est jamais écrit dans les journaux.

### Limites des données

- L'adaptateur `agentmemory` sonde la version amont à l'initialisation et avertit en cas
  d'incompatibilité. `LORE_AGENTMEMORY_REQUIRED=0` bascule l'adaptateur en mode dégradé silencieux
  si l'amont est inaccessible.
- L'analyseur de corps de requête `apps/api` applique une limite `LORE_MAX_JSON_BYTES` (1
  Mio par défaut) ; les requêtes trop volumineuses retournent 413.
- Le pool de connexions Postgres fixe `statement_timeout: 15000` pour limiter le temps de requête.
- `LORE_REQUEST_TIMEOUT_MS` (30s par défaut) limite chaque gestionnaire de requête ;
  les délais expirent en 504.

## Conseils de déploiement

- N'exposez pas Lore à distance sans `LORE_API_KEYS` configuré.
- Préférez des clés `reader` / `writer` / `admin` **séparées par rôle**.
- **Définissez toujours** `DASHBOARD_BASIC_AUTH_USER` et `DASHBOARD_BASIC_AUTH_PASS` en
  production.
- **Générez les clés avec `openssl rand -hex 32`**. N'utilisez jamais les valeurs fictives
  affichées dans les exemples.
- Gardez les points d'accès `agentmemory` bruts privés ; accédez-y uniquement via Lore.
- Gardez le tableau de bord, la gouvernance, l'import/export, la synchronisation et les routes d'audit derrière une
  couche de contrôle d'accès réseau (Cloudflare Access, AWS ALB, Tailscale ACL,
  similaire) pour toute exposition non locale.
- **Exécutez `node scripts/check-env.mjs` avant de démarrer l'API en production.**
- **Ne commitez jamais** les fichiers `.env` de production, les clés API de fournisseurs, les identifiants cloud,
  les données d'évaluation contenant du contenu client, ou les exports de mémoire privés.

## Calendrier de divulgation

Pour les vulnérabilités confirmées à fort impact :

- 0 jour : rapport accusé de réception.
- 7 jours : triage et classification de gravité partagés avec le rapporteur.
- 30 jours : divulgation publique coordonnée (ou prolongée par accord mutuel).
- 30+ jours : émission de CVE pour gravité moyenne+ si applicable.

Pour les problèmes de gravité moindre, attendez une résolution dans la prochaine version mineure.

## Feuille de route de renforcement

Éléments prévus pour les versions suivantes :

- **v0.5** : spécification OpenAPI / Swagger ; intégration CI de `pnpm audit --high`,
  analyse statique CodeQL, et dependabot.
- **v0.6** : images de conteneurs signées Sigstore, provenance SLSA, publication npm via
  GitHub OIDC au lieu de jetons de longue durée.
- **v0.7** : chiffrement au repos pour le contenu de mémoire marqué `risk_tags` via le chiffrement
  d'enveloppe KMS.
