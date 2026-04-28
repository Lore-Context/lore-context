> 🤖 Este documento foi traduzido por máquina do inglês. Melhorias via PR são bem-vindas — consulte o [guia de contribuição de tradução](../README.md).

# Política de Segurança

O Lore Context gerencia memória, rastros, logs de auditoria e credenciais de integração.
Trate relatórios de segurança com alta prioridade.

## Reportando uma Vulnerabilidade

Não abra uma issue pública para vulnerabilidades suspeitas, segredos vazados, bypasses
de autenticação, exposição de dados ou problemas de isolamento entre tenants.

Caminho de reporte preferido:

1. Use o **reporte privado de vulnerabilidade do GitHub** para este repositório quando
   disponível.
2. Se o reporte privado não estiver disponível, contate os mantenedores de forma privada
   e inclua:
   - versão ou commit afetado,
   - passos de reprodução,
   - impacto esperado,
   - se há segredos reais ou dados pessoais envolvidos.

Buscamos confirmar relatórios credíveis em até 72 horas.

## Versões Suportadas

O Lore Context é atualmente software alpha pré-1.0. Correções de segurança visam
primeiro o branch `main`. Lançamentos com tag podem receber patches direcionados quando
um lançamento público está sendo ativamente usado por operadores downstream.

| Versão | Suportada |
|---|---|
| v0.4.x-alpha | ✅ Ativa |
| v0.3.x e anteriores | ❌ Apenas pré-lançamento interno |

## Proteções Integradas (v0.4.0-alpha)

O alpha inclui os seguintes controles de defesa em profundidade. Os operadores devem
verificar se estão ativos em sua implantação.

### Autenticação

- **Tokens bearer de chave de API** (`Authorization: Bearer <key>` ou
  header `x-lore-api-key`).
- **Separação de papéis**: `reader` / `writer` / `admin`.
- **Escopo por projeto**: entradas JSON de `LORE_API_KEYS` podem incluir uma
  lista de permissões `projectIds: ["..."]`; mutações exigem `project_id` correspondente.
- **Modo sem chaves falha de forma fechada em produção**: com `NODE_ENV=production` e
  sem chaves configuradas, a API recusa todas as requisições.
- **Bypass de loopback removido**: versões anteriores confiavam em `Host: 127.0.0.1`;
  v0.4 usa apenas o endereço remoto do socket.

### Limite de Taxa

- **Limitador de bucket duplo por IP e por chave** com backoff em falha de autenticação.
- **Padrões**: 60 req/min por IP para caminhos não autenticados, 600 req/min por chave
  autenticada.
- **5 falhas de autenticação em 60s → bloqueio de 30s** (retorna 429).
- Configurável: `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED=1` (apenas para desenvolvimento).

### Proteção do Dashboard

- **Middleware HTTP Basic Auth** (`apps/dashboard/middleware.ts`).
- **A inicialização em produção recusa começar** sem
  `DASHBOARD_BASIC_AUTH_USER` e `DASHBOARD_BASIC_AUTH_PASS`.
- `LORE_DASHBOARD_DISABLE_AUTH=1` é respeitado apenas fora da produção.
- Fallback de chave de admin server-side **removido**: um usuário deve ser autenticado
  via Basic Auth antes que o proxy do dashboard injete credenciais upstream da API.

### Proteção de Contêineres

- Todos os Dockerfiles executam como usuário `node` não root.
- `apps/api/Dockerfile` e `apps/dashboard/Dockerfile` declaram `HEALTHCHECK`
  contra `/health`.
- `apps/mcp-server` é apenas stdio — sem listener de rede — e não declara
  `HEALTHCHECK`.

### Gerenciamento de Segredos

- **Zero credenciais hardcoded.** Todos os padrões de `docker-compose.yml`,
  `docs/deployment/compose.private-demo.yml`, e `.env.example` usam
  a forma `${VAR:?must be set}` — a inicialização falha rapidamente sem valores
  explícitos.
- `scripts/check-env.mjs` rejeita valores de placeholder
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`,
  `dev`, `password`) quando `NODE_ENV=production`.
- Todos os docs de implantação e READMEs de exemplo foram limpos de credenciais
  literais de demonstração.

### Governança

- **Varredura de tags de risco em cada escrita de memória**: chaves de API, chaves AWS,
  tokens JWT, chaves privadas, senhas, emails, números de telefone detectados.
- **Máquina de seis estados** com tabela de transição legal explícita; transições
  ilegais lançam exceção.
- **Heurísticas de envenenamento de memória**: dominância de mesma fonte + correspondência
  de padrão de verbos imperativos → flag `suspicious`.
- **Log de auditoria imutável** adicionado em cada transição de estado.
- Conteúdo de alto risco encaminhado automaticamente para `candidate` / `flagged` e
  retido da composição de contexto até ser revisado.

### Proteção do MCP

- Cada entrada de ferramenta MCP é **validada contra um schema zod** antes da invocação.
  Falhas de validação retornam JSON-RPC `-32602` com lista de issues sanitizadas.
- **Todas as ferramentas mutantes** exigem uma string `reason` de pelo menos 8 caracteres
  e expõem `destructiveHint: true` em seu schema.
- Erros da API upstream são **sanitizados** antes de serem retornados aos clientes MCP —
  SQL bruto, caminhos de arquivo e stack traces são removidos.

### Logging

- **Saída JSON estruturada** com correlação de `requestId` em toda a cadeia de handlers.
- **Redação automática** de campos correspondendo a `content`, `query`, `memory`, `value`,
  `password`, `secret`, `token`, `key`. O conteúdo real de registros de memória e
  consultas nunca é gravado nos logs.

### Limites de Dados

- O adaptador `agentmemory` sonda a versão upstream na inicialização e avisa sobre
  incompatibilidade. `LORE_AGENTMEMORY_REQUIRED=0` coloca o adaptador em modo degradado
  silencioso se o upstream estiver inacessível.
- O parser de body de requisição de `apps/api` aplica um limite `LORE_MAX_JSON_BYTES`
  (padrão 1 MiB); requisições acima do limite retornam 413.
- O pool de conexões Postgres define `statement_timeout: 15000` para limitar o tempo
  de consulta.
- `LORE_REQUEST_TIMEOUT_MS` (padrão 30s) limita cada handler de requisição;
  timeouts retornam 504.

## Orientações de Implantação

- Não exponha o Lore remotamente sem `LORE_API_KEYS` configurado.
- Prefira chaves com **separação de papéis** `reader` / `writer` / `admin`.
- **Sempre defina** `DASHBOARD_BASIC_AUTH_USER` e `DASHBOARD_BASIC_AUTH_PASS` em
  produção.
- **Gere chaves com `openssl rand -hex 32`**. Nunca use os valores de placeholder
  mostrados nos exemplos.
- Mantenha os endpoints brutos do `agentmemory` privados; acesse-os apenas através do
  Lore.
- Mantenha rotas de dashboard, governança, importação/exportação, sincronização e
  auditoria atrás de uma camada de controle de acesso de rede (Cloudflare Access, AWS
  ALB, Tailscale ACL, similar) para qualquer exposição não de loopback.
- **Execute `node scripts/check-env.mjs` antes de iniciar a API em produção.**
- **Nunca faça commit** de arquivos `.env` de produção, chaves de API de provedores,
  credenciais de nuvem, dados de eval contendo conteúdo de clientes ou exportações
  privadas de memória.

## Cronograma de Divulgação

Para vulnerabilidades confirmadas de alto impacto:

- 0 dias: relatório confirmado.
- 7 dias: triagem e classificação de severidade compartilhadas com o relator.
- 30 dias: divulgação pública coordenada (ou prorrogada por acordo mútuo).
- 30+ dias: emissão de CVE para severidade média ou superior, quando aplicável.

Para problemas de menor severidade, espere resolução dentro do próximo lançamento menor.

## Roadmap de Proteção

Itens planejados para lançamentos futuros:

- **v0.5**: Especificação OpenAPI / Swagger; integração de CI de `pnpm audit --high`,
  análise estática CodeQL e dependabot.
- **v0.6**: Imagens de contêiner assinadas com Sigstore, proveniência SLSA, publicação
  npm via GitHub OIDC em vez de tokens de longa duração.
- **v0.7**: Criptografia em repouso para conteúdo de memória com flag `risk_tags`
  via criptografia de envelope KMS.
