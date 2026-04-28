> 🤖 Este documento fue traducido por máquina del inglés. Las mejoras vía PR son bienvenidas — consulte la [guía de contribución de traducciones](../README.md).

# Guías de Integración

Estas guías documentan el contrato de integración de Lore Context contra el MVP local actual.

## Estado Actual del Repositorio

- El repositorio ahora incluye una API REST local, enrutador/compositor de contexto,
  persistencia opcional en archivo JSON, almacenamiento en tiempo de ejecución Postgres
  opcional, trazas, importación/exportación de memoria, comparación de proveedores de
  evaluación, HTML del dashboard servido por API, dashboard Next.js independiente y un
  límite de adaptador `agentmemory`.
- `apps/mcp-server/src/index.ts` proporciona un lanzador MCP stdio JSON-RPC ejecutable que
  delega herramientas a la API REST de Lore a través de `LORE_API_URL` y reenvía
  `LORE_API_KEY` como token Bearer cuando está configurado. Soporta el bucle stdio
  heredado incorporado y el transporte stdio del SDK oficial `@modelcontextprotocol/sdk`
  via `LORE_MCP_TRANSPORT=sdk`.
- Los documentos a continuación son contratos de integración. Las integraciones API-first
  pueden usar el servidor REST local hoy; los clientes con capacidad MCP pueden usar el
  lanzador stdio local después de `pnpm build`.

## Diseño Compartido

- Los clientes con capacidad MCP deben conectarse a un pequeño servidor MCP de Lore, no
  directamente a `agentmemory` sin procesar.
- Los clientes API-first deben llamar a los endpoints REST de Lore, con
  `POST /v1/context/query` como la ruta principal de lectura.
- `POST /v1/context/query` acepta `mode`, `sources`, `freshness`, `token_budget`,
  `writeback_policy` e `include_sources` para que los clientes puedan forzar o deshabilitar
  el enrutamiento de memoria/web/repo/traza de herramientas cuando sea necesario.
- Lore envuelve el runtime local `agentmemory` a través de `packages/agentmemory-adapter`.
- Se espera que `agentmemory` local esté en `http://127.0.0.1:3111`.

## Superficie MCP Disponible

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

## Superficie REST Disponible

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` con `project_id`, `scope`, `status`, `memory_type`, `q` y `limit` opcionales
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

## Prueba de Humo de API Local

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

La ruta de prueba de humo automatizada es:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Prueba de Humo de MCP Local

El lanzador MCP lee JSON-RPC delimitado por nueva línea desde stdin y escribe solo mensajes
JSON-RPC en stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

No lance esto a través de `pnpm start` desde un cliente MCP porque los banners del gestor
de paquetes contaminarían stdout.

## Alineación con Despliegue Privado

El empaquetado de demo privado en [docs/deployment/README.md](deployment.md) asume:

- La API y el dashboard de Lore se ejecutan como contenedores de larga duración.
- Postgres es el almacén durable predeterminado para demos compartidas.
- El lanzador MCP permanece como un proceso stdio cerca del cliente, o se ejecuta como el
  servicio compose `mcp` opcional bajo demanda.
- El sembrado demo proviene de
  `examples/demo-dataset/import/lore-demo-memories.json`, mientras que la prueba de humo
  de evaluación proviene de `examples/demo-dataset/eval/lore-demo-eval-request.json`.

Para despliegues privados, apunte los lanzadores de clientes a la URL privada de la API y
proporcione el rol más pequeño que sea adecuado:

- `reader`: dashboard y co-pilotos de solo lectura.
- `writer`: agentes que deben escribir memoria, retroalimentación o ejecuciones de evaluación.
- `admin`: flujos de importación, exportación, gobernanza, auditoría y olvido.

## Plantillas de Cliente Conscientes del Despliegue

### Claude Code

Prefiera un proceso stdio local a la estación de trabajo que apunte a la API privada:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY=write-local \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /ruta/absoluta/a/Lore/apps/mcp-server/dist/index.js
```

Si usa el contenedor MCP empaquetado en lugar de `node .../dist/index.js`, mantenga el
mismo par `LORE_API_URL` / `LORE_API_KEY` y ejecute el lanzador stdio via
`docker compose run --rm mcp`.

### Cursor

El JSON MCP estilo Cursor debe mantener el lanzador local y solo cambiar el objetivo de API
y la clave:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/ruta/absoluta/a/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "read-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Use una clave `writer` solo cuando los flujos de trabajo de Cursor escriban intencionalmente
memoria de proyecto durable.

### Qwen Code

El JSON `mcpServers` estilo Qwen sigue el mismo límite:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/ruta/absoluta/a/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "write-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Use `reader` para asistentes de recuperación de solo búsqueda y `writer` para flujos
agénticos que necesiten herramientas `memory_write`, `memory_update` o retroalimentación
de trazas.

## Valores Predeterminados Seguros

- Prefiera `stdio` localmente para MCP; use HTTP de transmisión autenticado solo cuando
  se requiera transporte remoto.
- Trate SSE como compatibilidad heredada, no como la ruta predeterminada.
- Liste las herramientas permitidas con `includeTools` o el equivalente del cliente.
- No habilite modos de confianza amplia por defecto.
- Requiera `reason` en operaciones mutantes.
- Mantenga `memory_forget` en eliminación suave a menos que un admin establezca
  deliberadamente `hard_delete: true` para eliminación controlada.
- Use la separación de roles de `LORE_API_KEYS` para exposición de API local o remota
  compartida: `reader` para clientes de solo lectura, `writer` para escritura de vuelta
  por agentes, y `admin` solo para operaciones de sincronización/importación/exportación/
  olvido/gobernanza/auditoría. Añada `projectIds` para limitar las claves de cliente a
  los proyectos que pueden ver o mutar.
- Mantenga `agentmemory` vinculado a `127.0.0.1`.
- No exponga el visor o la consola raw de `agentmemory` públicamente.
- Contrato actual en vivo de `agentmemory` 0.9.3: `remember`, `export`, `audit` y
  `forget(memoryId)` son utilizables para pruebas de sincronización/contrato de Lore;
  `smart-search` busca observaciones y no debe tratarse como prueba de que los registros
  de memoria recién recordados son directamente buscables.
