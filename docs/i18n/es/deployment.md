> 🤖 Este documento fue traducido por máquina del inglés. Las mejoras vía PR son bienvenidas — consulte la [guía de contribución de traducciones](../README.md).

# Despliegue Privado

> **Genere claves con `openssl rand -hex 32` — nunca use los marcadores de posición siguientes en producción.**

Este módulo empaqueta Lore para una demostración privada o un despliegue interno de equipo
sin cambiar las rutas del código de la aplicación. El paquete de despliegue consiste en:

- `apps/api/Dockerfile`: imagen de la API REST.
- `apps/dashboard/Dockerfile`: imagen del dashboard Next.js independiente.
- `Dockerfile`: imagen opcional de lanzador MCP para clientes stdio.
- `docs/deployment/compose.private-demo.yml`: pila compose de copiar-pegar para Postgres,
  API, dashboard y un servicio MCP bajo demanda.
- `examples/demo-dataset/**`: datos semilla para flujos de almacén de archivos, importación
  y evaluación.

## Topología Recomendada

- `postgres`: almacén durable para demos compartidas o multi-operador.
- `api`: API REST de Lore en una red bridge interna, publicada en loopback por defecto.
- `dashboard`: UI del operador, publicada en loopback por defecto y con proxy hacia la API
  a través de `LORE_API_URL`.
- `mcp`: contenedor stdio opcional para operadores de Claude, Cursor y Qwen que prefieren
  un lanzador en contenedor en lugar de `node apps/mcp-server/dist/index.js` en el host.

La pila compose mantiene intencionalmente la exposición pública estrecha. Postgres, API y
dashboard se enlazan a `127.0.0.1` por defecto a través de mapeos de puerto con variables.

## Verificación Previa

1. Copie `.env.example` a un archivo de runtime privado como `.env.private`.
2. Reemplace `POSTGRES_PASSWORD`.
3. Prefiera `LORE_API_KEYS` sobre una sola `LORE_API_KEY`.
4. Establezca `DASHBOARD_LORE_API_KEY` a una clave `admin` para el flujo de operador
   completo, o a una clave `reader` con alcance para demos de solo lectura. Establezca
   `MCP_LORE_API_KEY` a una clave `writer` o `reader` dependiendo de si el cliente debe
   mutar memoria.

Ejemplo de separación de roles:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
```

## Iniciar la Pila

Compile e inicie la pila de demo privada desde la raíz del repositorio:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Verificaciones de salud:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Sembrar Datos Demo

Para la pila compose respaldada por Postgres, importe las memorias demo empaquetadas una
vez que la API esté saludable:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Ejecute la solicitud de evaluación empaquetada:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Si prefiere una demo de host único sin base de datos, apunte la API a la instantánea del
almacén de archivos:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## Patrones de Lanzador MCP

Patrón preferido:

- Ejecute el lanzador MCP cerca del cliente.
- Apunte `LORE_API_URL` a la URL privada de la API.
- Proporcione la clave API más pequeña adecuada al lanzador.

Lanzador basado en host:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Lanzador en contenedor:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

El lanzador en contenedor es útil para la configuración reproducible de estaciones de
trabajo, pero sigue siendo un proceso stdio, no un servicio de red público de larga duración.

## Valores Predeterminados de Seguridad

- Mantenga `API_BIND_HOST`, `DASHBOARD_BIND_HOST` y `POSTGRES_BIND_HOST` en `127.0.0.1`
  a menos que un proxy inverso autenticado ya esté frente a la pila.
- Prefiera `LORE_API_KEYS` con separación `reader` / `writer` / `admin` en lugar de reutilizar
  una única clave admin global en todas partes.
- Use claves con alcance de proyecto para clientes demo. El id de proyecto demo empaquetado
  es `demo-private`.
- Mantenga `AGENTMEMORY_URL` en loopback y no exponga raw `agentmemory` directamente.
- Deje `LORE_AGENTMEMORY_REQUIRED=0` a menos que el despliegue privado realmente dependa de
  un runtime agentmemory en vivo.
- Mantenga `LORE_POSTGRES_AUTO_SCHEMA=true` solo para entornos internos controlados. Una vez
  que el bootstrapping del esquema sea parte de su proceso de lanzamiento, puede fijarlo a
  `false`.

## Archivos para Reutilizar

- Ejemplo Compose: [compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- Imagen API: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Imagen Dashboard: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- Imagen MCP: [Dockerfile](../../../Dockerfile)
- Datos demo: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
