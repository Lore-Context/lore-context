<div align="center">

# Lore Context

**O plano de controle para memória, avaliação e governança de agentes de IA.**

Saiba o que cada agente lembrou, usou e deve esquecer — antes que a memória se torne um risco em produção.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Primeiros passos](../../getting-started.md) · [Início rápido no site](https://lorecontext.com/quickstart/) · [Metodologia de benchmark](https://lorecontext.com/benchmark/) · [Referência de API](../../api-reference.md) · [Arquitetura](../../architecture.md) · [Plano do projeto](../../project-plan.md) · [Status da versão](../../release-status.md) · [Roteiro](../../roadmap.md) · [Integrações](../../integrations/README.md) · [Implantação](../../deployment/README.md) · [Registro de alterações](../../../CHANGELOG.md)

🌐 **Leia isso no seu idioma**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

Os documentos localizados podem estar desatualizados em relação às notas da versão atual em inglês; os documentos canônicos da v2.1 são o README em inglês e o conjunto de `docs/`.

</div>

---

> Este documento é uma tradução automática do inglês, pode não refletir a versão mais recente. Contribuições são bem-vindas — consulte o [guia de colaboradores de tradução](../README.md).

## O que é o Lore Context

Lore Context é um **plano de controle de núcleo aberto** para memória de agentes de IA: ele compõe contexto por meio de memória, pesquisa, grafos de repositório e rastros de ferramentas; avalia a qualidade de recuperação em seus próprios conjuntos de dados; roteia a revisão de governança para conteúdo sensível; e exporta a memória como um formato de intercâmbio portátil que você pode mover entre backends.

Não pretende ser outro banco de dados de memória. O valor único está no que fica sobre a memória:

- **Context Query** — um único endpoint que compõe memória + web + repositório + rastros de ferramentas, retornando um bloco de contexto classificado com procedência.
- **Memory Eval** — executa Recall@K, Precision@K, MRR, taxa de acertos obsoletos, latência p95 em conjuntos de dados que você possui; persiste as execuções e as compara para detecção de regressão.
- **Governance Review** — ciclo de vida de seis estados (`candidate / active / flagged / redacted / superseded / deleted`), varredura de tags de risco, heurísticas de envenenamento, log de auditoria imutável.
- **Portabilidade tipo MIF** — exportação/importação JSON + Markdown preservando `provenance / validity / confidence / source_refs / supersedes / contradicts`. Funciona como formato de migração entre backends de memória.
- **Repo Graph** — indexação determinista de repositórios (arquivos, símbolos, importações, chamadas, rotas, testes) exposta como rotas de API e ferramentas MCP somente leitura para que os agentes baseiem as respostas do repositório em um contrato estável de contexto do projeto.
- **Multi-Agent Adapter** — integração de primeira classe com `agentmemory` com sonda de versão + fallback em modo degradado; contrato de adaptador limpo para tempos de execução adicionais.

## Quando usar

| Use o Lore Context quando... | Use um banco de dados de memória (agentmemory, Mem0, Supermemory) quando... |
|---|---|
| Você precisa **provar** o que seu agente lembrou, por quê e se foi usado | Você só precisa de armazenamento bruto de memória |
| Você executa vários agentes (Claude Code, Cursor, Qwen, Hermes, Dify) e quer contexto confiável compartilhado | Você está construindo um único agente e aceita uma camada de memória bloqueada por fornecedor |
| Você requer implantação local ou privada para conformidade | Você prefere um SaaS hospedado |
| Você precisa de avaliação em seus próprios conjuntos de dados, não em benchmarks de fornecedores | Os benchmarks do fornecedor são sinal suficiente |
| Você quer migrar a memória entre sistemas | Você não planeja trocar de backend |

## Início rápido

```bash
# 1. Clonar + instalar
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Executar o auxiliar de início rápido e inspecionar o relatório de ativação
pnpm quickstart -- --dry-run --activation-report

# 3. Gerar uma chave de API real (não use marcadores em nenhum ambiente além do desenvolvimento local)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. Iniciar a API (respaldada por arquivo, sem Postgres necessário)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Escrever uma memória
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Consultar contexto, depois inspecionar o traceId retornado no Evidence Ledger
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Para o início rápido do site público, consulte
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). Para a
configuração completa (Postgres, Docker Compose, Dashboard, integração MCP), consulte
[docs/getting-started.md](../../getting-started.md).

O início rápido alfa canônico é `git clone` + `pnpm quickstart`. O Lore
atualmente não publica nem reivindica um pacote npm público `@lore-context/quickstart`.
O servidor MCP stdio é publicado separadamente como
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
para distribuição em registros e clientes, e o middleware do SDK é distribuído como
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) e `lore-context-middleware` (PyPI).

Para descoberta legível por IA, o site publica `/llms.txt` e `/llms-full.txt`
apenas da documentação pública. A entrada no Registro Oficial de MCP está publicada,
e os rascunhos de distribuição adicionais ficam em [docs/distribution](../../distribution/).
Os rascunhos de lançamento ficam em [docs/launch](../../launch/), e a captação de parceiros de
design em [docs/design-partners](../../design-partners/). A página pública de benchmark é
uma metodologia reproduzível e um relatório de execução de fumaça pequeno, não uma alegação de vitória competitiva em benchmarks.

## Arquitetura

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

Para detalhes, consulte [docs/architecture.md](../../architecture.md).

## Novidades na v2.1.0

`v2.1.0` é a versão de **Repo Graph API e Ferramentas MCP**. Ela torna o próprio grafo
de repositório do Lore uma superfície de primeira classe para memória de agentes: indexação
determinista de repositórios TypeScript/JavaScript para arquivos, símbolos, importações,
chamadas, rotas, testes e dicas de processo, exposta por meio de rotas de API e ferramentas
MCP somente leitura para que os agentes baseiem as respostas do repositório em um contrato
estável de contexto do projeto em vez de pesquisa de texto ad hoc.

A v2.1.0 está implantada em produção AWS e no site público. Ela se baseia no motor de
memória híbrida (armazenamento de verdade RDS, distribuição de trabalhadores AWS SQS, índice
derivado Qdrant, serviço de embedding Qwen3 privado, `HybridSearchOrchestrator` de 7 fluxos),
o trabalhador de consolidação de memória dreaming butler, o loop de automelhoria de memória de
agentes, os pacotes de middleware SDK publicados e o substrato SaaS comercial distribuído na
linha v1.7–v2.0.

| Capacidade | Status | Onde |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Produção | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Indexador de grafos de conhecimento de código | ✅ Produção | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query compondo memória + web + repositório + rastros de ferramentas | ✅ Produção | `apps/api`, `docs/api-reference.md` |
| `HybridSearchOrchestrator` de 7 fluxos (FTS / pgvector / Qdrant denso+esparso / grafo / temporal / wiki) | ✅ Produção | `packages/search` |
| Re-classificador de codificador cruzado (pós-fusão, opt-in) | ✅ Produção | `apps/api/src/rerankers/` |
| Consolidação de memória dreaming butler (podar / mesclar / resolver / destacar) | ✅ Produção, com sinalizador | `apps/api/src/workers/butler-v18.ts` |
| Loop de automelhoria de memória de agentes + receitas de contexto | ✅ Produção, promoção com aprovação humana | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| Middleware SDK (auto-injetar + auto-reter para clientes OpenAI / Anthropic) | ✅ Publicado | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Cofre de segredos para agentes de IA (nativo MCP, autorização de três botões) | ✅ Beta, pendente de auditoria criptográfica | `apps/mcp-server`, `apps/api` |
| Motor de memória na nuvem: armazenamento de verdade RDS + distribuição SQS + índice Qdrant | ✅ Produção | `apps/api`, `apps/api/src/worker.ts` |
| Serviço de vetores privado Qwen3-Embedding-0.6B de 1024 dimensões | ✅ Produção | `apps/api/src/embedding.ts` |
| Ingestão automática de capturas e exceções de Memory Inbox | ✅ Produção | `apps/api`, `packages/capture` |
| Login com Google + inicialização de cofre pessoal | ✅ Produção | `apps/api`, `apps/dashboard` |
| SaaS comercial: assinaturas individuais, cobrança, controle de cota | ✅ Produção | nuvem hospedada (`Lore-Context/lore-cloud`) |
| API REST com autenticação por chave de API (leitor/escritor/administrador) | ✅ Produção | `apps/api` |
| Contrato OpenAPI 3.1 em `/openapi.json` (reporta `2.1.0`) | ✅ Produção | `apps/api/src/openapi.ts` |
| Servidor MCP stdio (transporte SDK legado + oficial) | ✅ Produção | `apps/mcp-server` |
| Dashboard Next.js com sessão Google + HTTP Basic Auth para operadores | ✅ Produção | `apps/dashboard` |
| API do Evidence Ledger + resumo no dashboard | ✅ Produção | `apps/api`, `apps/dashboard` |
| Máquina de estados de governança + log de auditoria | ✅ Produção | `packages/governance` |
| Executor de avaliação (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Produção | `packages/eval` |
| Importação/exportação MIF v0.2 com `supersedes` + `contradicts` | ✅ Produção | `packages/mif` |
| Gateway de modelos (roteamento tarefa→modelo multi-provedor) | ✅ Produção | `packages/model-gateway` |
| Adaptador `agentmemory` com sonda de versão + modo degradado | ✅ Produção | `packages/agentmemory-adapter` |
| Limitação de taxa, logging JSON estruturado com redação de campos | ✅ Produção | `apps/api` |
| Implantação privada com Docker Compose | ✅ Produção | `docker-compose.yml` |
| Auxiliar de adoção local `pnpm quickstart` + relatório de ativação | ✅ Produção | `scripts/lore-quickstart.mjs` |
| Registro Oficial de MCP + docs de distribuição / lançamento / parceiros de design | ✅ Produção | `server.json`, `docs/distribution/`, `docs/launch/` |

Consulte [CHANGELOG.md](../../../CHANGELOG.md) para o histórico completo de versões.

## Status atual da versão

`v2.1.0` é a linha atual de código-fonte, produção hospedada e versão. Foi implantada
em produção AWS e no site público por meio do fluxo de lançamento otimizado: artefatos
imutáveis arm64-first, teste de fumaça da API de staging, implantação da API de produção,
implantação isolada do site, auditoria pós-lançamento e fechamento de tag/versão. As
verificações externas confirmam que `https://api.lorecontext.com/health` retorna `status=ok`,
`/openapi.json` reporta `2.1.0` e `https://lorecontext.com/status.html` contém `v2.1.0`.

A produção mantém a forma v1.1+ RDS / SQS / memory-worker / Qdrant cloud, usa
`lore_memories_v12` como coleção Qdrant, mantém pgvector de 1024 dimensões para o
caminho Postgres e adiciona o esquema aditivo do grafo de repositório
(`apps/api/src/db/schema-v21-repo-graph.sql`).

Consulte [docs/release-status.md](../../release-status.md) para o snapshot de status
público atual e [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
para as notas completas da versão.

## Foco da versão

A versão v2.1 torna o grafo de repositório do Lore uma superfície de primeira classe para
memória de agentes. O objetivo é permitir que os agentes respondam "onde X está definido",
"o que chama isso" e "o que quebra se eu mudar isso" com um contrato determinista e estável
de contexto do projeto em vez de pesquisa de texto ad hoc:

- `@lore/repo-graph` — indexação determinista de repositórios TypeScript/JavaScript
  para arquivos, símbolos, importações, chamadas, rotas, testes e dicas de processo.
- Rotas de API: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact` e `POST /v1/repo/detect-changes`.
- Ferramentas MCP: `repo.graph_query`, `repo.symbol_context`, `repo.impact` e
  `repo.detect_changes` (somente leitura).
- `context_query(repo)` agora usa evidência do grafo de repositório respaldada por provedor
  quando disponível, com um fallback honesto de "indisponível" quando o armazenamento
  do grafo de repositório não está configurado.
- O esquema Postgres do grafo de repositório é aditivo — fica sobre o esquema de
  produção existente e é aplicado durante a configuração do esquema de produção/staging.

As versões do pacote raiz e API reportam `2.1.0` para que `/openapi.json` corresponda
à tag de versão. O trem de versões usa as salvaguardas de implantação dividida API/site
otimizadas introduzidas após a v2.0.9.

Consulte [docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md) e [docs/release-governance.md](../../release-governance.md).

## Integrações

O Lore Context fala MCP e REST e integra com a maioria dos IDEs de agentes e frontends de chat:

| Ferramenta | Guia de configuração |
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
| Outro / MCP genérico | [docs/integrations/README.md](../../integrations/README.md) |

## Implantação

| Modo | Quando usar | Documentação |
|---|---|---|
| **Respaldado por arquivo local** | Desenvolvimento individual, protótipo, testes de fumaça | Este README, Início rápido acima |
| **Postgres+pgvector local** | Fallback local de nó único e testes de migração | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose privado** | Implantação de equipe auto-hospedada, rede isolada | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Nuvem hospedada** | RDS / SQS / memory-worker / Qdrant / embedding privado mais a pilha de recuperação híbrida aumentada com grafo e o substrato SaaS comercial | [docs/release-status.md](../../release-status.md) |

Todos os caminhos de implantação requerem segredos explícitos. Os caminhos locais/privados requerem
`POSTGRES_PASSWORD`, `LORE_API_KEYS` e autenticação do dashboard. As implantações hospedadas
também precisam de RDS, SQS, Qdrant, serviço de embedding, OAuth, configuração de túnel e
as exportações do ambiente de execução de produção. O script `scripts/check-env.mjs`
recusa a inicialização em produção se algum valor corresponder a um padrão de marcador.

## Segurança

A v2.1.0 mantém a postura de implantação local/privada e as salvaguardas da nuvem hospedada
para acesso de usuários comuns:

- **Autenticação**: tokens de portador com chave de API com separação de papéis (`reader`/`writer`/`admin`) e escopo por projeto. O modo de chaves vazias falha de forma fechada em produção.
- **Limitação de taxa**: balde duplo por IP + por chave com retrocesso por falhas de autenticação (429 após 5 falhas em 60s, bloqueio de 30s).
- **Dashboard**: fluxo de sessão do Google para o produto hospedado; HTTP Basic Auth disponível para implantações de operadores locais/privadas.
- **Contêineres**: todos os Dockerfiles executam como usuário não-root `node`; HEALTHCHECK em api + dashboard.
- **Segredos**: zero credenciais codificadas; todos os padrões são variáveis obrigatórias ou de falha. `scripts/check-env.mjs` rejeita valores de marcador em produção.
- **Governança**: varredura de expressões regulares de PII / chave de API / JWT / chave privada em escritas; conteúdo com tag de risco roteado automaticamente para fila de revisão; log de auditoria imutável em cada transição de estado.
- **Envenenamento de memória**: detecção heurística em padrões de consenso + verbos imperativos.
- **MCP**: validação de esquema zod em cada entrada de ferramenta; ferramentas mutantes requerem `reason` (≥8 caracteres) e exibem `destructiveHint: true`; erros upstream sanitizados antes de retorno ao cliente.
- **Isolamento de trabalhadores**: os trabalhos de captura, embedding, grafo, conector e preenchimento retroativo são executados por meio de filas AWS SQS com DLQs; Qdrant é um índice derivado e RDS permanece autoritativo.
- **Logging**: JSON estruturado com redação automática dos campos `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Divulgações de vulnerabilidades: [SECURITY.md](../../../SECURITY.md).

## Estrutura do projeto

```text
apps/
  api/                # Plano de controle REST + Postgres + governança + eval + grafo de repo
  dashboard/          # Dashboard Next.js com sessão Google + HTTP Basic Auth para operadores
  mcp-server/         # Servidor MCP stdio (transportes SDK legado + oficial)
  cli/                # CLI do lore (doctor, wiki-recompile, importação/exportação de conjuntos de dados)
  browser-extension/  # Andaime de superfície de captura
  web/                # Renderizador HTML do lado do servidor (interface de fallback sem JS)
  website/            # Site de marketing (tratado separadamente)
packages/
  shared/             # Tipos compartilhados, erros, utilitários de ID/token
  agentmemory-adapter # Ponte para agentmemory upstream + sonda de versão
  search/             # HybridSearchOrchestrator de 7 fluxos + adaptador de receitas
  repo-graph/         # Indexação determinista de repositórios (v2.1)
  code-indexer/       # Indexador de grafos de conhecimento de código (TypeScript/JavaScript)
  code-indexer-python # Indexador de grafos de conhecimento de código (Python)
  capture/            # Primitivas de ingestão de capturas
  connectors/         # Conectores de fontes externas
  model-gateway/      # Roteamento tarefa→modelo multi-provedor
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + primitivas de métricas + receitas de contexto
  governance/         # Máquina de estados + varredura de riscos + envenenamento + auditoria
  profile/            # Tipos de cofre / perfil de conta
  sdk-typescript/     # SDK cliente TypeScript
  sdk-python/         # SDK cliente Python
  sdk-go/ sdk-java/ sdk-dotnet/   # SDKs de linguagens adicionais
  sdk-middleware-typescript/      # Middleware auto-injetar + auto-reter (npm)
  sdk-middleware-python/          # Middleware auto-injetar + auto-reter (PyPI)
docs/
  i18n/<lang>/        # README localizado em 17 idiomas
  integrations/       # Guias de integração com IDEs de agentes
  deployment/         # Runbooks para local, Docker Compose e automação de produção
  legal/              # Privacidade / Termos / Cookies (lei de Singapura)
scripts/
  check-env.mjs       # Validação do ambiente em modo produção
  smoke-*.mjs         # Testes de fumaça de ponta a ponta
  apply-postgres-schema.mjs
```

## Requisitos

- Node.js `>=22`
- pnpm `10.30.1`
- (Fallback local opcional) Postgres 16 com pgvector
- (Hospedado/avançado) RDS PostgreSQL 16, AWS SQS, Qdrant e serviço de embedding privado

## Contribuindo

Contribuições são bem-vindas. Por favor leia [CONTRIBUTING.md](../../../CONTRIBUTING.md) para o fluxo de trabalho de desenvolvimento, o protocolo de mensagens de commit e as expectativas de revisão.

Para traduções de documentação, consulte o [guia de colaboradores de i18n](../README.md).

## Operado por

O Lore Context é operado pela **REDLAND PTE. LTD.** (Singapura, UEN 202304648K). O perfil da empresa, os termos legais e o tratamento de dados estão documentados em [`docs/legal/`](../../legal/).

## Licença

O repositório do Lore Context está licenciado sob a [Apache License 2.0](../../../LICENSE). Os pacotes individuais em `packages/*` declaram MIT para facilitar o consumo downstream. Consulte [NOTICE](../../../NOTICE) para a atribuição de projetos upstream.

## Agradecimentos

O Lore Context é construído sobre o [agentmemory](https://github.com/agentmemory/agentmemory) como tempo de execução de memória local. Os detalhes do contrato upstream e a política de compatibilidade de versões estão documentados em [UPSTREAM.md](../../../UPSTREAM.md).
