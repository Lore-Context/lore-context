<div align="center">

> 🤖 Este documento foi traduzido por máquina do inglês. Melhorias via PR são bem-vindas — consulte o [guia de contribuição de tradução](../README.md).

# Lore Context

**O plano de controle para memória, avaliação e governança de agentes de IA.**

Saiba o que cada agente lembrou, utilizou e deve esquecer — antes que a memória se torne um risco em produção.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Primeiros Passos](../../getting-started.md) · [Referência da API](../../api-reference.md) · [Arquitetura](../../architecture.md) · [Integrações](../../integrations/README.md) · [Implantação](../../deployment/README.md) · [Changelog](../../../CHANGELOG.md)

🌐 **Leia em seu idioma**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](./README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## O que é o Lore Context

O Lore Context é um **plano de controle open-core** para memória de agentes de IA: compõe contexto entre memória, busca e rastros de ferramentas; avalia a qualidade de recuperação em seus próprios datasets; encaminha revisão de governança para conteúdo sensível; e exporta memória em um formato de intercâmbio portátil que pode ser movido entre backends.

Ele não pretende ser mais um banco de dados de memória. O valor único está no que fica acima da memória:

- **Context Query** — endpoint único que compõe memória + web + repositório + rastros de ferramentas e retorna um bloco de contexto graduado com proveniência.
- **Memory Eval** — executa Recall@K, Precision@K, MRR, stale-hit-rate, latência p95 em datasets que você possui; persiste execuções e gera diffs para detecção de regressão.
- **Governance Review** — ciclo de vida de seis estados (`candidate / active / flagged / redacted / superseded / deleted`), varredura de tags de risco, heurísticas de envenenamento, log de auditoria imutável.
- **Portabilidade MIF** — exportação/importação JSON + Markdown preservando `provenance / validity / confidence / source_refs / supersedes / contradicts`. Funciona como formato de migração entre backends de memória.
- **Adaptador Multi-Agente** — integração de primeira classe com `agentmemory`, incluindo sonda de versão + fallback em modo degradado; contrato de adaptador limpo para runtimes adicionais.

## Quando usar

| Use o Lore Context quando... | Use um banco de dados de memória (agentmemory, Mem0, Supermemory) quando... |
|---|---|
| Você precisa **provar** o que seu agente lembrou, por quê, e se foi utilizado | Você só precisa de armazenamento bruto de memória |
| Você executa múltiplos agentes (Claude Code, Cursor, Qwen, Hermes, Dify) e quer contexto confiável compartilhado | Você está construindo um único agente e aceita um tier de memória vinculado a fornecedor |
| Você exige implantação local ou privada para conformidade | Você prefere SaaS hospedado |
| Você precisa de avaliação em seus próprios datasets, não em benchmarks de fornecedores | Benchmarks de fornecedores são sinal suficiente |
| Você quer migrar memória entre sistemas | Você não planeja trocar de backend |

## Início Rápido

```bash
# 1. Clone + instale
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Gere uma chave de API real (não use placeholders em nenhum ambiente além do desenvolvimento local)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. Inicie a API (arquivo local, sem Postgres necessário)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Escreva uma memória
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Consulte o contexto
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Para configuração completa (Postgres, Docker Compose, Dashboard, integração MCP), consulte [docs/getting-started.md](../../getting-started.md).

## Arquitetura

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

Para detalhes, consulte [docs/architecture.md](../../architecture.md).

## O que há no v0.4.0-alpha

| Capacidade | Status | Localização |
|---|---|---|
| REST API com autenticação por chave de API (reader/writer/admin) | ✅ Produção | `apps/api` |
| Servidor MCP stdio (transporte legado + SDK oficial) | ✅ Produção | `apps/mcp-server` |
| Dashboard Next.js com autenticação HTTP Basic Auth | ✅ Produção | `apps/dashboard` |
| Persistência incremental Postgres + pgvector | ✅ Opcional | `apps/api/src/db/` |
| Máquina de estados de governança + log de auditoria | ✅ Produção | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Produção | `packages/eval` |
| Importação/exportação MIF v0.2 com `supersedes` + `contradicts` | ✅ Produção | `packages/mif` |
| Adaptador `agentmemory` com sonda de versão + modo degradado | ✅ Produção | `packages/agentmemory-adapter` |
| Limite de taxa (por IP + por chave com backoff) | ✅ Produção | `apps/api` |
| Logging estruturado JSON com redação de campos sensíveis | ✅ Produção | `apps/api/src/logger.ts` |
| Implantação privada com Docker Compose | ✅ Produção | `docker-compose.yml` |
| Dataset de demonstração + testes de fumaça + teste de UI Playwright | ✅ Produção | `examples/`, `scripts/` |
| Sincronização em nuvem multi-tenant hospedada | ⏳ Roadmap | — |

Consulte [CHANGELOG.md](../../../CHANGELOG.md) para as notas completas do lançamento v0.4.0-alpha.

## Integrações

O Lore Context fala MCP e REST e se integra com a maioria dos IDEs de agentes e frontends de chat:

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
| Outros / MCP genérico | [docs/integrations/README.md](../../integrations/README.md) |

## Implantação

| Modo | Use quando | Documentação |
|---|---|---|
| **Arquivo local** | Desenvolvimento solo, protótipo, testes de fumaça | Este README, Início Rápido acima |
| **Postgres+pgvector local** | Nó único em nível de produção, busca semântica em escala | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose privado** | Implantação em equipe auto-hospedada, rede isolada | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Gerenciado na nuvem** | A partir do v0.6 | — |

Todos os caminhos de implantação exigem segredos explícitos: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. O script `scripts/check-env.mjs` recusa a inicialização em produção se algum valor corresponder a um padrão de placeholder.

## Segurança

O v0.4.0-alpha implementa uma postura de defesa em profundidade adequada para implantações alpha não públicas:

- **Autenticação**: tokens bearer de chave de API com separação de funções (`reader`/`writer`/`admin`) e escopo por projeto. O modo sem chaves falha de forma fechada em produção.
- **Limite de taxa**: bucket duplo por IP + por chave com backoff em falha de autenticação (429 após 5 falhas em 60s, bloqueio de 30s).
- **Dashboard**: middleware HTTP Basic Auth. Recusa iniciar em produção sem `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Contêineres**: todos os Dockerfiles executam como usuário `node` não root; HEALTHCHECK nas APIs e dashboards.
- **Segredos**: zero credenciais hardcoded; todos os padrões são variáveis obrigatórias ou de falha. `scripts/check-env.mjs` rejeita valores de placeholder em produção.
- **Governança**: varredura de PII / chave de API / JWT / chave privada em escritas; conteúdo com tag de risco encaminhado automaticamente para a fila de revisão; log de auditoria imutável em cada transição de estado.
- **Envenenamento de memória**: detecção heurística em padrões de dominância de consenso + verbos imperativos.
- **MCP**: validação de schema zod em cada entrada de ferramenta; ferramentas mutantes exigem `reason` (≥8 caracteres) e expõem `destructiveHint: true`; erros upstream sanitizados antes de retornar ao cliente.
- **Logging**: JSON estruturado com redação automática de campos `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Divulgações de vulnerabilidades: [SECURITY.md](../../../SECURITY.md).

## Estrutura do Projeto

```text
apps/
  api/                # REST API + Postgres + governança + eval (TypeScript)
  dashboard/          # Dashboard Next.js 16 com middleware Basic Auth
  mcp-server/         # Servidor MCP stdio (transportes legado + SDK oficial)
  web/                # Renderizador HTML server-side (UI sem JS)
  website/            # Site de marketing (tratado separadamente)
packages/
  shared/             # Tipos compartilhados, erros, utilitários de ID/token
  agentmemory-adapter # Bridge para agentmemory upstream + sonda de versão
  search/             # Provedores de busca plugáveis (BM25 / híbrido)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + primitivas de métricas
  governance/         # Máquina de estados + varredura de risco + envenenamento + auditoria
docs/
  i18n/<lang>/        # README localizado em 17 idiomas
  integrations/       # 11 guias de integração agente-IDE
  deployment/         # Local + Postgres + Docker Compose
  legal/              # Privacidade / Termos / Cookies (lei de Singapura)
scripts/
  check-env.mjs       # Validação de ambiente em modo produção
  smoke-*.mjs         # Testes de fumaça end-to-end
  apply-postgres-schema.mjs
```

## Requisitos

- Node.js `>=22`
- pnpm `10.30.1`
- (Opcional) Postgres 16 com pgvector para memória com busca semântica

## Contribuindo

Contribuições são bem-vindas. Leia [CONTRIBUTING.md](../../../CONTRIBUTING.md) para o fluxo de desenvolvimento, protocolo de mensagens de commit e expectativas de revisão.

Para traduções de documentação, consulte o [guia de contribuição i18n](../README.md).

## Operado por

O Lore Context é operado pela **REDLAND PTE. LTD.** (Singapura, UEN 202304648K). Perfil da empresa, termos legais e tratamento de dados estão documentados em [`docs/legal/`](../../legal/).

## Licença

O repositório do Lore Context está licenciado sob [Apache License 2.0](../../../LICENSE). Pacotes individuais em `packages/*` declaram MIT para permitir consumo downstream. Consulte [NOTICE](../../../NOTICE) para atribuição upstream.

## Agradecimentos

O Lore Context é construído sobre o [agentmemory](https://github.com/agentmemory/agentmemory) como runtime de memória local. Detalhes do contrato upstream e política de compatibilidade de versão estão documentados em [UPSTREAM.md](../../../UPSTREAM.md).
