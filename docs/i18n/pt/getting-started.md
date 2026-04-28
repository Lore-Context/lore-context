> 🤖 Este documento foi traduzido por máquina do inglês. Melhorias via PR são bem-vindas — consulte o [guia de contribuição de tradução](../README.md).

# Primeiros Passos

Este guia o acompanha do zero a uma instância do Lore Context em funcionamento com
memória gravada, contexto consultado e o dashboard acessível. Calcule ~15 minutos no
total, ~5 minutos para o caminho central.

## Pré-requisitos

- **Node.js** `>=22` (use `nvm`, `mise` ou o gerenciador de pacotes da sua distro)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Opcional) **Docker + Docker Compose** para o caminho Postgres+pgvector
- (Opcional) **psql** se preferir aplicar o schema manualmente

## 1. Clone e instale

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Se `pnpm test` não estiver verde, não continue — abra uma issue com o log de falhas.

## 2. Gere segredos reais

O Lore Context recusa iniciar em produção com valores de placeholder. Gere chaves reais
mesmo para desenvolvimento local para manter bons hábitos.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Para configurações locais com múltiplos papéis:

```bash
export READER_KEY=$(openssl rand -hex 32)
export WRITER_KEY=$(openssl rand -hex 32)
export ADMIN_KEY=$(openssl rand -hex 32)
export LORE_API_KEYS='[
  {"key":"'"$READER_KEY"'","role":"reader","projectIds":["demo"]},
  {"key":"'"$WRITER_KEY"'","role":"writer","projectIds":["demo"]},
  {"key":"'"$ADMIN_KEY"'","role":"admin"}
]'
```

## 3. Inicie a API (arquivo local, sem banco de dados)

O caminho mais simples usa um arquivo JSON local como backend de armazenamento. Adequado
para desenvolvimento solo e testes de fumaça.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Em outro shell, verifique a saúde:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Esperado: `{"status":"ok",...}`.

## 4. Escreva sua primeira memória

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{
    "content": "Use Postgres pgvector for Lore Context production storage.",
    "memory_type": "project_rule",
    "project_id": "demo",
    "scope": "project"
  }' | jq
```

Esperado: uma resposta `200` com o `id` da nova memória e `governance.state` de
`active` ou `candidate` (o último se o conteúdo correspondeu a um padrão de risco
como um segredo).

## 5. Compose o contexto

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{
    "query": "production storage",
    "project_id": "demo",
    "token_budget": 1200
  }' | jq
```

Você deve ver sua memória citada no array `evidence.memory`, além de um `traceId` que
pode ser usado posteriormente para inspecionar o roteamento e o feedback.

## 6. Inicie o dashboard

Em um novo terminal:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Abra http://127.0.0.1:3001 no seu navegador. O navegador solicitará credenciais Basic
Auth. Uma vez autenticado, o dashboard renderiza o inventário de memória, rastros,
resultados de eval e a fila de revisão de governança.

## 7. (Opcional) Conecte o Claude Code via MCP

Adicione isto à seção de servidores MCP do `claude_desktop_config.json` do Claude Code:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/caminho/absoluto/para/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<cole seu $LORE_API_KEY aqui>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Reinicie o Claude Code. As ferramentas MCP do Lore Context (`context_query`,
`memory_write`, etc.) ficam disponíveis.

Para outros IDEs de agentes (Cursor, Qwen, Dify, FastGPT, etc.), consulte a matriz de
integração em [docs/integrations/README.md](../../integrations/README.md).

## 8. (Opcional) Mude para Postgres + pgvector

Quando você superar o armazenamento em arquivo JSON:

```bash
docker compose up -d postgres
pnpm db:schema   # aplica apps/api/src/db/schema.sql via psql
```

Então inicie a API com `LORE_STORE_DRIVER=postgres`:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Execute `pnpm smoke:postgres` para verificar que uma round-trip de escrita-reinício-leitura
sobrevive.

## 9. (Opcional) Popule o dataset de demonstração e execute um eval

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

O relatório de eval é salvo em `output/eval-reports/` como Markdown e JSON.

## Próximos Passos

- **Implantação em produção** — [docs/deployment/README.md](../../deployment/README.md)
- **Referência da API** — [docs/api-reference.md](../../api-reference.md)
- **Mergulho profundo na arquitetura** — [docs/architecture.md](../../architecture.md)
- **Fluxo de revisão de governança** — veja a seção `Fluxo de Governança` em
  [docs/architecture.md](../../architecture.md)
- **Portabilidade de memória (MIF)** — `pnpm --filter @lore/mif test` mostra exemplos de
  round-trip
- **Contribuir** — [CONTRIBUTING.md](../../../CONTRIBUTING.md)

## Problemas Comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Outro processo está na porta 3000 | `lsof -i :3000` para encontrá-lo; ou defina `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Modo produção sem `DASHBOARD_BASIC_AUTH_USER/PASS` | Exporte as variáveis de ambiente ou passe `LORE_DASHBOARD_DISABLE_AUTH=1` (apenas em desenvolvimento) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Alguma variável de ambiente correspondeu a `admin-local` / `change-me` / `demo` etc | Gere valores reais via `openssl rand -hex 32` |
| `429 Too Many Requests` | Limite de taxa atingido | Aguarde a janela de resfriamento (padrão 30s após 5 falhas de autenticação); ou defina `LORE_RATE_LIMIT_DISABLED=1` em desenvolvimento |
| `agentmemory adapter unhealthy` | Runtime agentmemory local não está em execução | Inicie o agentmemory ou defina `LORE_AGENTMEMORY_REQUIRED=0` para skip silencioso |
| O cliente MCP vê `-32602 Invalid params` | A entrada da ferramenta falhou na validação do schema zod | Verifique o array `invalid_params` no corpo do erro |
| Dashboard com 401 em cada página | Credenciais Basic Auth incorretas | Reexporte as variáveis de ambiente e reinicie o processo do dashboard |

## Obtendo Ajuda

- Reporte um bug: https://github.com/Lore-Context/lore-context/issues
- Divulgação de segurança: consulte [SECURITY.md](../../../SECURITY.md)
- Contribua com documentação: consulte [CONTRIBUTING.md](../../../CONTRIBUTING.md)
