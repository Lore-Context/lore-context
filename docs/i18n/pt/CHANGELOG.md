> 🤖 Este documento foi traduzido por máquina do inglês. Melhorias via PR são bem-vindas — consulte o [guia de contribuição de tradução](../README.md).

# Changelog

Todas as alterações notáveis no Lore Context são documentadas aqui. O formato é baseado em
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) e este projeto
segue o [Versionamento Semântico 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v0.4.0-alpha] — 2026-04-28

Primeiro alpha público. Encerra o sprint de hardening de produção que transformou o MVP
com falha de auditoria em um alpha candidato a lançamento. Todos os itens P0 de auditoria
resolvidos, 12 de 13 itens P1 resolvidos (um parcial — veja Notas), 117+ testes passando,
build completo do monorepo limpo.

### Adicionado

- **`packages/eval/src/runner.ts`** — `EvalRunner` real (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). O eval agora pode executar uma avaliação de recuperação
  end-to-end contra um dataset do usuário e persistir execuções como JSON para detecção
  de regressão ao longo do tempo.
- **`packages/governance/src/state.ts`** — máquina de estados de governança de seis estados
  (`candidate / active / flagged / redacted / superseded / deleted`) com tabela de
  transição legal explícita. Transições ilegais lançam exceção.
- **`packages/governance/src/audit.ts`** — helper de append de log de auditoria imutável
  integrado com o tipo `AuditLog` de `@lore/shared`.
- **`packages/governance/detectPoisoning`** — heurística para detecção de envenenamento de
  memória usando dominância de mesma fonte (>80%) e correspondência de padrão de verbos
  imperativos.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — sonda de versão upstream
  baseada em semver com comparação manual (sem nova dependência). Suporta
  `LORE_AGENTMEMORY_REQUIRED=0` para modo degradado de skip silencioso.
- **`packages/mif`** — campos `supersedes: string[]` e `contradicts: string[]` adicionados
  ao `LoreMemoryItem`. Preservação de round-trip nos formatos JSON e Markdown.
- **`apps/api/src/logger.ts`** — logger JSON estruturado com redação automática de campos
  sensíveis (`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`). `requestId` flui por todas as requisições.
- **`apps/dashboard/middleware.ts`** — middleware HTTP Basic Auth. A inicialização em
  produção recusa começar sem `DASHBOARD_BASIC_AUTH_USER` e `DASHBOARD_BASIC_AUTH_PASS`.
- **`scripts/check-env.mjs`** — validador de ambiente em modo produção. Recusa iniciar o
  app se algum valor de ambiente corresponder a um padrão de placeholder (`read-local`,
  `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`).
- **Limite de taxa** — limitador de token de bucket duplo por IP e por chave com backoff
  em falha de autenticação (5 falhas em 60s → bloqueio de 30s → resposta 429).
  Configurável via `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED`.
- **Encerramento controlado** — handlers SIGTERM/SIGINT drenam requisições em andamento
  por até 10s, liberam escritas Postgres pendentes, fecham o pool, forçam saída em 15s.
- **Índices de banco de dados** — índices B-tree em `(project_id)` / `(status)` /
  `(created_at)` para `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs`. Índices GIN em jsonb `content` e `metadata`.
- **Validação de entrada MCP com zod** — cada ferramenta MCP agora executa `safeParse`
  contra um schema zod por ferramenta; falhas retornam JSON-RPC `-32602` com issues
  sanitizadas.
- **`destructiveHint` MCP + `reason` obrigatório** — cada ferramenta mutante
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) requer um
  `reason` de pelo menos 8 caracteres e expõe `destructiveHint: true`.
- 117+ novos casos de teste em `apps/api`, `apps/mcp-server`, `packages/eval`,
  `packages/governance`, `packages/mif`, `packages/agentmemory-adapter`.
- Documentação multilíngue: README em 17 idiomas em `docs/i18n/<lang>/`.
- `CHANGELOG.md` (este arquivo).
- `docs/getting-started.md` — início rápido para desenvolvedores em 5 minutos.
- `docs/api-reference.md` — referência de endpoints da REST API.
- `docs/i18n/README.md` — guia de contribuição de tradução.

### Alterado

- **`packages/mif`** versão do envelope `"0.1"` → `"0.2"`. Importação retrocompatível.
- **`LORE_POSTGRES_AUTO_SCHEMA`** padrão `true` → `false`. Implantações em produção
  devem optar explicitamente pelo auto-schema ou executar `pnpm db:schema`.
- **`apps/api`** o parser de body de requisição agora é streaming com um limite rígido de
  tamanho de payload (`LORE_MAX_JSON_BYTES`, padrão 1 MiB). Requisições acima do limite
  retornam 413.
- **Autenticação de loopback** alterada: removida dependência do header `Host` da URL;
  a detecção de loopback agora usa apenas `req.socket.remoteAddress`. Em produção sem
  chaves de API configuradas, a API falha de forma fechada e recusa requisições (era:
  concedia admin silenciosamente).
- **Chaves de API com escopo** agora devem fornecer `project_id` para `/v1/memory/list`,
  `/v1/eval/run`, e `/v1/memory/import` (era: `project_id` indefinido criava atalho).
- **Todos os Dockerfiles** agora executam como usuário `node` não root. `apps/api/Dockerfile`
  e `apps/dashboard/Dockerfile` declaram `HEALTHCHECK`.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` agora usa `${POSTGRES_PASSWORD:?must
  be set}` — a inicialização falha rapidamente sem uma senha explícita.
- **`docs/deployment/compose.private-demo.yml`** — mesmo padrão de obrigatório-ou-falha.
- **`.env.example`** — todos os padrões de demonstração removidos e substituídos por
  placeholders `# REQUIRED`. Novas variáveis documentadas para limite de taxa, timeout de
  requisição, limite de payload, modo de agentmemory obrigatório, basic auth do dashboard.

### Corrigido

- **Vulnerabilidade de bypass de autenticação loopback** (P0). Um atacante podia enviar
  `Host: 127.0.0.1` para falsificar a detecção de loopback e obter papel admin sem chave
  de API.
- **Confused-deputy no proxy do dashboard** (P0). O proxy do dashboard injetava
  `LORE_API_KEY` para requisições não autenticadas, concedendo poderes admin a qualquer
  um que pudesse alcançar a porta 3001.
- **Defesa contra força bruta** (P0). Chaves de demonstração (`admin-local`,
  `read-local`, `write-local`) mostradas no README/`.env.example` podiam ser enumeradas
  indefinidamente; limite de taxa e remoção dos padrões agora defendem contra isso.
- **Crash no parse JSON de `LORE_API_KEYS` malformado** — o processo agora sai com um
  erro claro em vez de lançar um stack trace.
- **OOM por body de requisição grande** — bodies acima do limite configurado agora
  retornam 413 em vez de crashar o processo Node.
- **Vazamento de erros MCP** — erros da API upstream que incluíam SQL bruto, caminhos de
  arquivo ou stack traces agora são sanitizados para `{code, generic-message}` antes de
  alcançar clientes MCP.
- **Crash no parse JSON do Dashboard** — respostas JSON inválidas não causam mais crash
  na UI; os erros são exibidos como estado visível ao usuário.
- **MCP `memory_update` / `memory_supersede`** anteriormente não exigiam `reason`; isso
  agora é aplicado pelo schema zod.
- **Pool Postgres**: `statement_timeout` agora definido para 15s; anteriormente havia
  risco de tempo de consulta ilimitado com queries jsonb malformadas.

### Segurança

- Todos os achados P0 de auditoria (bypass de loopback / auth do dashboard / limite de
  taxa / segredos de demonstração) resolvidos. Consulte `Lore_Context_项目计划书_2026-04-27.md`
  e `.omc/plans/lore-prelaunch-fixes-2026-04-28.md` para o rastro de auditoria completo.
- `pnpm audit --prod` relata zero vulnerabilidades conhecidas no momento do lançamento.
- Credenciais de demonstração removidas de todos os templates de implantação e READMEs
  de exemplo.
- Imagens de contêiner agora executam como não root por padrão.

### Notas / Limitações conhecidas

- **P1-1 Parcial**: `/v1/context/query` mantém comportamento permissivo de chave com
  escopo para evitar quebrar testes de consumidores existentes. Outras rotas afetadas
  (`/v1/memory/list`, `/v1/eval/run`, `/v1/memory/import`) aplicam `project_id`.
  Rastreado para v0.5.
- **Sincronização em nuvem multi-tenant hospedada** não está implementada no
  v0.4.0-alpha. Apenas implantações locais e Compose-privadas.
- **Qualidade de tradução**: as localizações do README são geradas por LLM e claramente
  rotuladas; PRs da comunidade para refinar cada locale são bem-vindos (consulte
  [`docs/i18n/README.md`](../README.md)).
- **Especificação OpenAPI / Swagger** ainda não está empacotada. A superfície REST está
  documentada em prosa em [`docs/api-reference.md`](../../api-reference.md).
  Rastreado para v0.5.

### Agradecimentos

Este lançamento é resultado de um sprint de hardening de produção de um único dia
envolvendo execução paralela de sub-agentes contra um plano de auditoria estruturado.
O plano e os artefatos de auditoria estão preservados em `.omc/plans/`.

## [v0.0.0] — pré-lançamento

Marcos de desenvolvimento interno, não lançados publicamente. Implementado:

- Scaffolds de pacotes do workspace (monorepo TypeScript, workspaces pnpm).
- Pipeline compartilhado de build/teste TypeScript.
- Sistema de tipos de memória / contexto / eval / auditoria em `@lore/shared`.
- Limite do adaptador `agentmemory`.
- REST API local com roteador e compositor de contexto.
- Persistência em arquivo JSON + armazenamento Postgres runtime opcional com upsert
  incremental.
- Fluxos de detalhe / edição / substituição / esquecimento de memória com exclusão
  permanente explícita.
- Contabilidade real de uso de memória (`useCount`, `lastUsedAt`).
- Feedback de rastro (`useful` / `wrong` / `outdated` / `sensitive`).
- Importação/exportação JSON + Markdown no estilo MIF com campos de governança.
- Conjunto de regex para varredura de segredos.
- Métricas de eval por sessão diretas; execuções de eval de comparação de provedores;
  listagem de execuções de eval.
- Proteção por chave de API com separação de papéis reader/writer/admin.
- Fila de revisão de governança; API de log de auditoria.
- HTML de dashboard servido pela API; dashboard Next.js standalone.
- Dados de semente de demonstração; geração de configuração de integração.
- Empacotamento Docker/Compose privado.
- Transportes MCP stdio legado + SDK oficial.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
