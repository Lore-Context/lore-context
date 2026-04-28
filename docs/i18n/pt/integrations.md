> 🤖 Este documento foi traduzido por máquina do inglês. Melhorias via PR são bem-vindas — consulte o [guia de contribuição de tradução](../README.md).

# Guias de Integração

Estes guias documentam o contrato de integração do Lore Context com o MVP local atual.

## Status Atual do Repositório

- O repositório agora inclui uma REST API local, roteador/compositor de contexto,
  persistência opcional em arquivo JSON, armazenamento Postgres runtime opcional,
  rastros, importação/exportação de memória, comparação de provedores de eval, HTML
  de dashboard servido pela API, dashboard Next.js standalone e um limite do adaptador
  `agentmemory`.
- `apps/mcp-server/src/index.ts` fornece um launcher MCP JSON-RPC stdio executável que
  faz proxy de ferramentas para a Lore REST API através de `LORE_API_URL` e encaminha
  `LORE_API_KEY` como token Bearer quando configurado. Suporta o loop stdio legado
  integrado e o transporte stdio do SDK oficial `@modelcontextprotocol/sdk` via
  `LORE_MCP_TRANSPORT=sdk`.
- Os documentos abaixo são contratos de integração. Integrações API-first podem usar o
  servidor REST local hoje; clientes compatíveis com MCP podem usar o launcher stdio
  local após `pnpm build`.

## Design Compartilhado

- Clientes compatíveis com MCP devem se conectar a um servidor MCP pequeno do Lore, não
  ao `agentmemory` bruto.
- Clientes API-first devem chamar os endpoints REST do Lore, com
  `POST /v1/context/query` como o caminho principal de leitura.
- `POST /v1/context/query` aceita `mode`, `sources`, `freshness`, `token_budget`,
  `writeback_policy` e `include_sources` para que clientes possam forçar ou desabilitar
  o roteamento de memória/web/repositório/rastro de ferramentas quando necessário.
- O Lore envolve o runtime local `agentmemory` através de
  `packages/agentmemory-adapter`.
- O `agentmemory` local é esperado em `http://127.0.0.1:3111`.

## Superfície MCP Disponível

- `context_query`
- `memory_write`
- `memory_search`
- `memory_forget`
- `memory_list`
- `memory_get`
- `memory_update`
- `memory_supersede`
- `memory_export`
- `eval_run`
- `trace_get`

## Superfície REST Disponível

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` com `project_id`, `scope`, `status`, `memory_type`, `q` e
  `limit` opcionais
- `GET /v1/memory/:id`
- `PATCH /v1/memory/:id`
- `POST /v1/memory/:id/supersede`
- `GET /v1/memory/export`
- `POST /v1/memory/import`
- `GET /v1/governance/review-queue`
- `POST /v1/governance/memory/:id/approve`
- `POST /v1/governance/memory/:id/reject`
- `POST /v1/events/ingest`
- `POST /v1/eval/run`
- `GET /v1/eval/providers`
- `GET /v1/eval/runs`
- `GET /v1/eval/runs/:id`
- `GET /v1/traces`
- `GET /v1/traces/:id`
- `POST /v1/traces/:id/feedback`
- `GET /v1/audit-logs`

## Teste de Fumaça da API Local

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

O caminho de fumaça automatizado é:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Teste de Fumaça do MCP Local

O launcher MCP lê JSON-RPC delimitado por nova linha do stdin e grava apenas mensagens
JSON-RPC no stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Não inicie isso através de `pnpm start` a partir de um cliente MCP porque banners do
gerenciador de pacotes poluiriam o stdout.

## Alinhamento com Implantação Privada

O empacotamento de demonstração privada em [docs/deployment/README.md](../../deployment/README.md)
pressupõe:

- A API e o dashboard do Lore executam como contêineres de longa duração.
- Postgres é o armazenamento durável padrão para demonstrações compartilhadas.
- O launcher MCP permanece um processo stdio próximo ao cliente, ou executa como o
  serviço `mcp` compose opcional sob demanda.
- A semente de demonstração vem de
  [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json),
  enquanto o teste de fumaça de eval vem de
  [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json).

Para implantações privadas, aponte os launchers de cliente para a URL privada da API e
forneça o menor papel que se encaixe:

- `reader`: dashboard e copilots somente leitura.
- `writer`: agentes que devem gravar memória, feedback ou execuções de eval.
- `admin`: fluxos de importação, exportação, governança, auditoria e esquecimento.

## Templates de Cliente Cientes de Implantação

### Claude Code

Prefira um processo stdio local na estação de trabalho que aponte para a API privada:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY=write-local \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /caminho/absoluto/para/Lore/apps/mcp-server/dist/index.js
```

Se você usar o contêiner MCP empacotado em vez de `node .../dist/index.js`, mantenha
o mesmo par `LORE_API_URL` / `LORE_API_KEY` e execute o launcher stdio via
`docker compose run --rm mcp`.

### Cursor

O JSON MCP no estilo Cursor deve manter o launcher local e apenas mudar o alvo da API
e a chave:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/caminho/absoluto/para/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "read-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Use uma chave `writer` apenas quando os fluxos do Cursor intencionalmente gravam memória
de projeto durável.

### Qwen Code

O JSON `mcpServers` no estilo Qwen segue o mesmo limite:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/caminho/absoluto/para/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "write-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Use `reader` para assistentes de recuperação somente busca e `writer` para fluxos
agênticos que precisam das ferramentas `memory_write`, `memory_update` ou de feedback
de `trace`.

## Padrões Seguros

- Prefira `stdio` localmente para MCP; use HTTP streamable autenticado apenas quando
  transporte remoto for necessário.
- Trate SSE como compatibilidade legada, não o caminho padrão.
- Liste ferramentas permitidas com `includeTools` ou o equivalente do cliente.
- Não habilite modos de confiança amplos por padrão.
- Exija `reason` em operações mutantes.
- Mantenha `memory_forget` em soft delete a menos que um admin deliberadamente defina
  `hard_delete: true` para remoção controlada.
- Use a separação de papéis `LORE_API_KEYS` para exposição local ou remota compartilhada
  da API: `reader` para clientes somente leitura, `writer` para writeback de agentes e
  `admin` apenas para operações de sincronização/importação/exportação/esquecimento/
  governança/auditoria. Adicione `projectIds` para escopo das chaves de cliente aos
  projetos que podem ver ou mutar.
- Mantenha o `agentmemory` ligado a `127.0.0.1`.
- Não exponha publicamente o visualizador ou console bruto do `agentmemory`.
- Contrato atual do `agentmemory` 0.9.3: `remember`, `export`, `audit` e
  `forget(memoryId)` são utilizáveis para testes de sincronização/contrato do Lore;
  `smart-search` busca observações e não deve ser tratado como prova de que registros de
  memória recém-lembrados são diretamente pesquisáveis.
