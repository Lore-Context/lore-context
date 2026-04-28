> 🤖 Este documento foi traduzido por máquina do inglês. Melhorias via PR são bem-vindas — consulte o [guia de contribuição de tradução](../README.md).

# Implantação Privada

> **Gere chaves com `openssl rand -hex 32` — nunca use os placeholders abaixo em produção.**

Esta seção empacota o Lore para uma demonstração privada ou implantação interna de
equipe sem alterar os caminhos de código da aplicação. O pacote de implantação consiste em:

- `apps/api/Dockerfile`: imagem da REST API.
- `apps/dashboard/Dockerfile`: imagem standalone do dashboard Next.js.
- `Dockerfile`: imagem opcional do launcher MCP para clientes stdio.
- `docs/deployment/compose.private-demo.yml`: stack compose para Postgres, API,
  dashboard e um serviço MCP sob demanda.
- `examples/demo-dataset/**`: dados de semente para fluxos de file-store, importação
  e eval.

## Topologia Recomendada

- `postgres`: armazenamento durável para demonstrações compartilhadas ou com múltiplos
  operadores.
- `api`: Lore REST API em uma rede bridge interna, publicada no loopback por padrão.
- `dashboard`: UI do operador, publicada no loopback por padrão e fazendo proxy para a
  API através de `LORE_API_URL`.
- `mcp`: contêiner stdio opcional para operadores de Claude, Cursor e Qwen que querem
  um launcher containerizado em vez de `node apps/mcp-server/dist/index.js` no host.

A stack compose mantém intencionalmente a exposição pública estreita. Postgres, API e
dashboard todos se ligam a `127.0.0.1` por padrão através de mapeamentos de porta com
variáveis.

## Pré-voo

1. Copie `.env.example` para um arquivo privado de runtime como `.env.private`.
2. Substitua `POSTGRES_PASSWORD`.
3. Prefira `LORE_API_KEYS` em vez de um único `LORE_API_KEY`.
4. Defina `DASHBOARD_LORE_API_KEY` para uma chave `admin` para o fluxo completo do
   operador, ou para uma chave `reader` com escopo para demonstrações somente leitura.
   Defina `MCP_LORE_API_KEY` para uma chave `writer` ou `reader` dependendo se o
   cliente deve mutar memória.

Exemplo de separação de papéis:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
```

## Iniciando a Stack

Construa e inicie a stack de demonstração privada a partir da raiz do repositório:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Verificações de saúde:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Populando Dados de Demonstração

Para a stack compose com backend Postgres, importe as memórias de demonstração
empacotadas após a API estar saudável:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Execute a requisição de eval empacotada:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Se você quiser uma demonstração de host único sem banco de dados, aponte a API para o
snapshot do file-store:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## Padrões do Launcher MCP

Padrão preferido:

- Execute o launcher MCP próximo ao cliente.
- Aponte `LORE_API_URL` para a URL privada da API.
- Forneça a menor chave de API adequada ao launcher.

Launcher no host:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Launcher containerizado:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

O launcher containerizado é útil para configuração reproduzível de estação de trabalho,
mas ainda é um processo stdio, não um serviço de rede público de longa duração.

## Padrões de Segurança

- Mantenha `API_BIND_HOST`, `DASHBOARD_BIND_HOST` e `POSTGRES_BIND_HOST` em `127.0.0.1`
  a menos que um proxy reverso autenticado já esteja na frente da stack.
- Prefira `LORE_API_KEYS` com separação `reader` / `writer` / `admin` em vez de
  reutilizar uma única chave admin global em todos os lugares.
- Use chaves com escopo de projeto para clientes de demonstração. O id de projeto de
  demonstração empacotado é `demo-private`.
- Mantenha `AGENTMEMORY_URL` no loopback e não exponha o `agentmemory` bruto
  diretamente.
- Deixe `LORE_AGENTMEMORY_REQUIRED=0` a menos que a implantação privada realmente
  dependa de um runtime agentmemory em funcionamento.
- Mantenha `LORE_POSTGRES_AUTO_SCHEMA=true` apenas para ambientes internos controlados.
  Uma vez que o bootstrap do schema faça parte do seu processo de lançamento, você pode
  fixá-lo em `false`.

## Arquivos Para Reutilizar

- Exemplo de Compose: [compose.private-demo.yml](../../../docs/deployment/compose.private-demo.yml)
- Imagem da API: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Imagem do Dashboard: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- Imagem MCP: [Dockerfile](../../../Dockerfile)
- Dados de demonstração: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
