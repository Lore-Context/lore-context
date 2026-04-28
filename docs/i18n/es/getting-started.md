> 🤖 Este documento fue traducido por máquina del inglés. Las mejoras vía PR son bienvenidas — consulte la [guía de contribución de traducciones](../README.md).

# Primeros Pasos

Esta guía lo lleva desde cero hasta una instancia de Lore Context en ejecución con memoria
escrita, contexto consultado y el dashboard accesible. Planifique ~15 minutos en total,
~5 minutos para la ruta principal.

## Requisitos Previos

- **Node.js** `>=22` (use `nvm`, `mise` o el gestor de paquetes de su distribución)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Opcional) **Docker + Docker Compose** para la ruta Postgres+pgvector
- (Opcional) **psql** si prefiere aplicar el esquema usted mismo

## 1. Clonar e instalar

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Si `pnpm test` no está en verde, no continúe — abra un issue con el registro de fallo.

## 2. Generar secretos reales

Lore Context se niega a iniciar en producción con valores de marcador de posición. Genere
claves reales incluso para desarrollo local para mantener sus hábitos consistentes.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Para configuraciones locales multi-rol:

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

## 3. Iniciar la API (respaldada por archivo, sin base de datos)

La ruta más simple usa un archivo JSON local como backend de almacenamiento. Adecuado para
desarrollo individual y pruebas de humo.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

En otro terminal, verifique el estado:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Esperado: `{"status":"ok",...}`.

## 4. Escribir su primera memoria

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

Esperado: una respuesta `200` con el `id` de la nueva memoria y `governance.state` de
`active` o `candidate` (este último si el contenido coincidió con un patrón de riesgo como
un secreto).

## 5. Componer contexto

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

Debería ver su memoria citada en el array `evidence.memory`, más un `traceId` que puede
usar después para inspeccionar el enrutamiento y la retroalimentación.

## 6. Iniciar el dashboard

En un nuevo terminal:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Abra http://127.0.0.1:3001 en su navegador. El navegador solicitará credenciales Basic Auth.
Una vez autenticado, el dashboard muestra el inventario de memoria, trazas, resultados de
evaluación y la cola de revisión de gobernanza.

## 7. (Opcional) Conectar Claude Code via MCP

Añada esto a la sección de servidores MCP de `claude_desktop_config.json` de Claude Code:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/ruta/absoluta/a/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<pegue su $LORE_API_KEY aquí>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Reinicie Claude Code. Las herramientas MCP de Lore Context (`context_query`, `memory_write`,
etc.) quedarán disponibles.

Para otros IDEs de agentes (Cursor, Qwen, Dify, FastGPT, etc.), vea la matriz de integración
en [docs/integrations/README.md](integrations.md).

## 8. (Opcional) Cambiar a Postgres + pgvector

Cuando supere el almacenamiento en archivo JSON:

```bash
docker compose up -d postgres
pnpm db:schema   # aplica apps/api/src/db/schema.sql via psql
```

Luego inicie la API con `LORE_STORE_DRIVER=postgres`:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Ejecute `pnpm smoke:postgres` para verificar que un ciclo de escritura-reinicio-lectura
sobrevive.

## 9. (Opcional) Sembrar el conjunto de datos demo y ejecutar una evaluación

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

El informe de evaluación aterriza en `output/eval-reports/` como Markdown y JSON.

## Siguientes Pasos

- **Despliegue en producción** — [docs/deployment/README.md](deployment.md)
- **Referencia de API** — [docs/api-reference.md](api-reference.md)
- **Inmersión profunda en arquitectura** — [docs/architecture.md](architecture.md)
- **Flujo de trabajo de revisión de gobernanza** — vea la sección `Flujo de Gobernanza` en
  [docs/architecture.md](architecture.md)
- **Portabilidad de memoria (MIF)** — `pnpm --filter @lore/mif test` muestra ejemplos de
  ida y vuelta
- **Contribuir** — [CONTRIBUTING.md](CONTRIBUTING.md)

## Problemas Comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Otro proceso está en el puerto 3000 | `lsof -i :3000` para encontrarlo; o establezca `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Modo producción sin `DASHBOARD_BASIC_AUTH_USER/PASS` | Exporte las variables de entorno o pase `LORE_DASHBOARD_DISABLE_AUTH=1` (solo dev) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Algún entorno coincidió con `admin-local` / `change-me` / `demo` etc | Genere valores reales via `openssl rand -hex 32` |
| `429 Too Many Requests` | Límite de tasa activado | Espere la ventana de enfriamiento (predeterminado 30s después de 5 fallos de auth); o establezca `LORE_RATE_LIMIT_DISABLED=1` en dev |
| `agentmemory adapter unhealthy` | Runtime local agentmemory no está en ejecución | Inicie agentmemory o establezca `LORE_AGENTMEMORY_REQUIRED=0` para omisión silenciosa |
| El cliente MCP ve `-32602 Invalid params` | La entrada de la herramienta falló la validación del esquema zod | Verifique el array `invalid_params` en el cuerpo del error |
| Dashboard 401 en cada página | Credenciales Basic Auth incorrectas | Reexporte las variables de entorno y reinicie el proceso del dashboard |

## Obtener Ayuda

- Reportar un error: https://github.com/Lore-Context/lore-context/issues
- Divulgación de seguridad: vea [SECURITY.md](SECURITY.md)
- Contribuir documentación: vea [CONTRIBUTING.md](CONTRIBUTING.md)
