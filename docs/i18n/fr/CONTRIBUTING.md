> 🤖 Ce document a été traduit automatiquement de l'anglais. Les améliorations via PR sont les bienvenues — consultez le [guide de contribution aux traductions](../README.md).

# Contribuer à Lore Context

Merci d'améliorer Lore Context. Ce projet est un plan de contrôle de contexte pour agents IA en stade alpha,
donc les modifications doivent préserver le fonctionnement local-first, l'auditabilité et la
sécurité du déploiement.

## Code de conduite

Ce projet suit le [Contributor Covenant](../../CODE_OF_CONDUCT.md). En participant,
vous acceptez de le respecter.

## Configuration du développement

Prérequis :

- Node.js 22 ou plus récent
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (Optionnel) Docker pour le chemin Postgres
- (Optionnel) `psql` si vous préférez appliquer le schéma vous-même

Commandes courantes :

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # nécessite docker compose up -d postgres
pnpm run doctor
```

Pour le travail par package :

```bash
pnpm --filter @lore/api test
pnpm --filter @lore-context/server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Attentes relatives aux pull requests

- **Gardez les modifications ciblées et réversibles.** Un sujet par PR ; une PR par sujet.
- **Ajoutez des tests** pour les modifications de comportement. Préférez les assertions réelles aux instantanés.
- **Exécutez `pnpm build` et `pnpm test`** avant de demander une révision. La CI les exécute aussi,
  mais localement c'est plus rapide.
- **Exécutez le test de fumée pertinent** lors de la modification de l'API, du tableau de bord, de MCP, de Postgres,
  de l'import/export, de l'évaluation ou du comportement de déploiement.
- **Ne commitez pas** la sortie de construction générée, les magasins locaux, les fichiers `.env`,
  les identifiants ou les données client privées. Le `.gitignore` couvre la plupart des chemins ;
  si vous créez de nouveaux artefacts, assurez-vous qu'ils sont exclus.
- **Restez dans la portée de votre PR.** Ne refactorisez pas du code non lié au passage.

## Garde-fous architecturaux

Ceux-ci sont non négociables pour v0.4.x. Si une PR en viole un, attendez-vous à une demande de
division ou de refonte :

- **Le local-first reste primaire.** Une nouvelle fonctionnalité doit fonctionner sans un service hébergé
  ou une dépendance SaaS tierce.
- **Pas de nouveaux contournements de surface d'authentification.** Chaque route reste protégée par clé API + rôle.
  Le bouclage n'est pas un cas particulier en production.
- **Pas d'exposition brute de `agentmemory`.** Les appelants externes accèdent à la mémoire uniquement via les
  points d'accès Lore.
- **Intégrité du journal d'audit.** Chaque mutation qui affecte l'état de la mémoire écrit une
  entrée d'audit.
- **Échec fermé sur configuration manquante.** Le démarrage en mode production refuse de commencer si
  les variables d'environnement requises sont des espaces réservés ou manquantes.

## Messages de commit

Lore Context utilise un format de commit petit et opiniâtré inspiré des directives du noyau Linux.

### Format

```text
<type>: <résumé court à l'impératif>

<corps optionnel expliquant pourquoi ce changement est nécessaire et quels compromis s'appliquent>

<remorques optionnelles>
```

### Types

- `feat` — nouvelle capacité visible par l'utilisateur ou point d'accès API
- `fix` — correction de bug
- `refactor` — restructuration du code sans changement de comportement
- `chore` — hygiène du dépôt (dépendances, outillage, déplacements de fichiers)
- `docs` — documentation uniquement
- `test` — modifications de tests uniquement
- `perf` — amélioration des performances avec impact mesurable
- `revert` — annulation d'un commit précédent

### Style

- **Minuscule** le type et le premier mot du résumé.
- **Pas de point final** dans la ligne de résumé.
- **≤72 caractères** dans la ligne de résumé ; retour à la ligne du corps à 80.
- **Mode impératif** : « fix loopback bypass », pas « fixed » ou « fixes ».
- **Pourquoi plutôt que quoi** : le diff montre ce qui a changé ; le corps devrait expliquer pourquoi.
- **N'incluez pas** de remorques `Co-Authored-By`, d'attribution IA ou de
  lignes signed-off-by sauf si explicitement requis par l'utilisateur.

### Remorques utiles

Lorsque c'est pertinent, ajoutez des remorques pour capturer les contraintes et le contexte du réviseur :

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### Exemple

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

## Granularité des commits

- Un changement logique par commit. Les réviseurs peuvent annuler atomiquement sans
  dommages collatéraux.
- Regroupez les correctifs triviaux (`typo`, `lint`, `prettier`) dans le commit parent
  avant d'ouvrir ou de mettre à jour une PR.
- Les refactorisations multi-fichiers sont acceptables dans un seul commit s'ils partagent une seule
  raison.

## Processus de révision

- Un mainteneur examinera votre PR dans les 7 jours pendant l'activité normale.
- Adressez tous les commentaires bloquants avant de redemander une révision.
- Pour les commentaires non bloquants, répondre en ligne avec une justification ou un ticket de suivi
  est acceptable.
- Les mainteneurs peuvent ajouter un label `merge-queue` une fois la PR approuvée ; ne faites pas
  de rebase ou de push forcé après l'application de ce label.

## Traductions de documentation

Si vous souhaitez améliorer un README traduit ou un fichier de documentation, voir le
[guide de contribution i18n](../README.md).

## Signalement de bugs

- Ouvrez un ticket public sur https://github.com/Lore-Context/lore-context/issues
  sauf si le bug est une vulnérabilité de sécurité.
- Pour les problèmes de sécurité, suivez [SECURITY.md](SECURITY.md).
- Incluez : version ou commit, environnement, reproduction, attendu vs réel,
  journaux (avec contenu sensible masqué).

## Remerciements

Lore Context est un petit projet qui essaie de faire quelque chose d'utile pour l'infrastructure
des agents IA. Chaque PR bien ciblée le fait avancer.
