<div align="center">

# Lore Context

**El plano de control para memoria, evaluación y gobernanza de agentes de IA.**

Sabe qué recordó cada agente, qué usó y qué debe olvidar — antes de que la memoria se convierta en un riesgo en producción.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Primeros pasos](../../getting-started.md) · [Inicio rápido en el sitio web](https://lorecontext.com/quickstart/) · [Metodología de benchmark](https://lorecontext.com/benchmark/) · [Referencia de API](../../api-reference.md) · [Arquitectura](../../architecture.md) · [Plan del proyecto](../../project-plan.md) · [Estado de la versión](../../release-status.md) · [Hoja de ruta](../../roadmap.md) · [Integraciones](../../integrations/README.md) · [Despliegue](../../deployment/README.md) · [Registro de cambios](../../../CHANGELOG.md)

🌐 **Léelo en tu idioma**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

Los documentos localizados pueden no estar al día con las notas de la versión actual en inglés; los documentos canónicos de v2.1 son el README en inglés y el conjunto de `docs/`.

</div>

---

> Este documento es una traducción automática del inglés, puede no reflejar la última versión. Las contribuciones son bienvenidas — consulta la [guía para colaboradores de traducción](../README.md).

## Qué es Lore Context

Lore Context es un **plano de control de núcleo abierto** para la memoria de agentes de IA: compone contexto a través de memoria, búsqueda, grafos de repositorio y trazas de herramientas; evalúa la calidad de recuperación en tus propios conjuntos de datos; enruta la revisión de gobernanza para contenido sensible; y exporta la memoria como un formato de intercambio portátil que puedes mover entre backends.

No pretende ser otra base de datos de memoria. El valor único está en lo que se asienta sobre la memoria:

- **Context Query** — un único endpoint que compone memoria + web + repositorio + trazas de herramientas, devuelve un bloque de contexto clasificado con procedencia.
- **Memory Eval** — ejecuta Recall@K, Precision@K, MRR, tasa de aciertos obsoletos, latencia p95 en conjuntos de datos que tú posees; persiste las ejecuciones y las compara para detectar regresiones.
- **Governance Review** — ciclo de vida de seis estados (`candidate / active / flagged / redacted / superseded / deleted`), escaneo de etiquetas de riesgo, heurísticas de envenenamiento, registro de auditoría inmutable.
- **Portabilidad tipo MIF** — exportación/importación JSON + Markdown preservando `provenance / validity / confidence / source_refs / supersedes / contradicts`. Funciona como formato de migración entre backends de memoria.
- **Repo Graph** — indexación determinista de repositorios (archivos, símbolos, importaciones, llamadas, rutas, pruebas) expuesta como rutas de API y herramientas MCP de solo lectura para que los agentes basen las respuestas del repositorio en un contrato estable de contexto del proyecto.
- **Multi-Agent Adapter** — integración de primera clase con `agentmemory` con sonda de versión + modo degradado de respaldo; contrato de adaptador limpio para tiempos de ejecución adicionales.

## Cuándo usarlo

| Usa Lore Context cuando... | Usa una base de datos de memoria (agentmemory, Mem0, Supermemory) cuando... |
|---|---|
| Necesitas **demostrar** qué recordó tu agente, por qué y si se utilizó | Solo necesitas almacenamiento de memoria en bruto |
| Ejecutas varios agentes (Claude Code, Cursor, Qwen, Hermes, Dify) y quieres contexto confiable compartido | Estás construyendo un único agente y aceptas un nivel de memoria bloqueado por proveedor |
| Requieres despliegue local o privado para cumplimiento normativo | Prefieres un SaaS alojado |
| Necesitas evaluación en tus propios conjuntos de datos, no en benchmarks de proveedores | Los benchmarks del proveedor son señal suficiente |
| Quieres migrar la memoria entre sistemas | No planeas cambiar de backend nunca |

## Inicio rápido

```bash
# 1. Clonar + instalar
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Ejecutar el asistente de inicio rápido e inspeccionar el informe de activación
pnpm quickstart -- --dry-run --activation-report

# 3. Generar una clave de API real (no uses marcadores de posición en ningún entorno más allá del desarrollo local)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. Iniciar la API (respaldada por archivo, sin Postgres requerido)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Escribir una memoria
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Consultar contexto, luego inspeccionar el traceId devuelto en el Evidence Ledger
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Para el inicio rápido del sitio web público, consulta
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). Para la
configuración completa (Postgres, Docker Compose, Dashboard, integración MCP), consulta
[docs/getting-started.md](../../getting-started.md).

El inicio rápido alfa canónico es `git clone` + `pnpm quickstart`. Lore no
publica actualmente ni reclama un paquete npm público `@lore-context/quickstart`.
El servidor MCP stdio se publica por separado como
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
para distribución en registros y clientes, y el middleware del SDK se distribuye como
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) y `lore-context-middleware` (PyPI).

Para el descubrimiento legible por IA, el sitio web publica `/llms.txt` y `/llms-full.txt`
solo desde documentación pública. La entrada en el Registro Oficial de MCP está publicada,
y los borradores de distribución adicionales están en [docs/distribution](../../distribution/).
Los borradores de lanzamiento están en [docs/launch](../../launch/), y la captación de socios de
diseño en [docs/design-partners](../../design-partners/). La página pública de benchmark es
una metodología reproducible y un informe de ejecución de prueba, no una afirmación de victoria competitiva en benchmarks.

## Arquitectura

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

Para más detalles, consulta [docs/architecture.md](../../architecture.md).

## Novedades en v2.1.0

`v2.1.0` es la versión de **Repo Graph API y Herramientas MCP**. Convierte el propio grafo
de repositorio de Lore en una superficie de primera clase para la memoria de agentes: indexación
determinista de repositorios TypeScript/JavaScript para archivos, símbolos, importaciones,
llamadas, rutas, pruebas y sugerencias de proceso, expuesta a través de rutas de API y herramientas
MCP de solo lectura para que los agentes basen las respuestas del repositorio en un contrato estable
de contexto del proyecto en lugar de búsqueda de texto ad hoc.

v2.1.0 está desplegada en producción AWS y en el sitio web público. Se basa en el motor de
memoria híbrida (almacén de verdad RDS, distribución de trabajadores AWS SQS, índice derivado
Qdrant, servicio de incrustación Qwen3 privado, `HybridSearchOrchestrator` de 7 flujos),
el trabajador de consolidación de memoria dreaming butler, el bucle de automejora de memoria de
agentes, los paquetes de middleware SDK publicados y el sustrato SaaS comercial distribuido en
la línea v1.7–v2.0.

| Capacidad | Estado | Dónde |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Producción | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Indexador de grafos de conocimiento de código | ✅ Producción | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query componiendo memoria + web + repositorio + trazas de herramientas | ✅ Producción | `apps/api`, `docs/api-reference.md` |
| `HybridSearchOrchestrator` de 7 flujos (FTS / pgvector / Qdrant denso+disperso / grafo / temporal / wiki) | ✅ Producción | `packages/search` |
| Re-clasificador de codificador cruzado (post-fusión, opt-in) | ✅ Producción | `apps/api/src/rerankers/` |
| Consolidación de memoria dreaming butler (podar / fusionar / resolver / destacar) | ✅ Producción, con bandera | `apps/api/src/workers/butler-v18.ts` |
| Bucle de automejora de memoria de agentes + recetas de contexto | ✅ Producción, promoción con aprobación humana | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| Middleware SDK (auto-inyectar + auto-retener para clientes OpenAI / Anthropic) | ✅ Publicado | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Vault de secretos para agentes de IA (nativo MCP, autorización de tres botones) | ✅ Beta, pendiente de auditoría criptográfica | `apps/mcp-server`, `apps/api` |
| Motor de memoria en la nube: almacén de verdad RDS + distribución SQS + índice Qdrant | ✅ Producción | `apps/api`, `apps/api/src/worker.ts` |
| Servicio de vectores privado Qwen3-Embedding-0.6B de 1024 dimensiones | ✅ Producción | `apps/api/src/embedding.ts` |
| Ingesta automática de capturas y excepciones de Memory Inbox | ✅ Producción | `apps/api`, `packages/capture` |
| Inicio de sesión con Google + arranque de vault personal | ✅ Producción | `apps/api`, `apps/dashboard` |
| SaaS comercial: suscripciones individuales, facturación, control de cuotas | ✅ Producción | nube alojada (`Lore-Context/lore-cloud`) |
| API REST con autenticación por clave de API (lector/escritor/administrador) | ✅ Producción | `apps/api` |
| Contrato OpenAPI 3.1 en `/openapi.json` (reporta `2.1.0`) | ✅ Producción | `apps/api/src/openapi.ts` |
| Servidor MCP stdio (transporte SDK heredado + oficial) | ✅ Producción | `apps/mcp-server` |
| Dashboard Next.js con sesión Google + HTTP Basic Auth para operadores | ✅ Producción | `apps/dashboard` |
| API del Evidence Ledger + resumen en el dashboard | ✅ Producción | `apps/api`, `apps/dashboard` |
| Máquina de estados de gobernanza + registro de auditoría | ✅ Producción | `packages/governance` |
| Ejecutor de evaluación (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Producción | `packages/eval` |
| Importación/exportación MIF v0.2 con `supersedes` + `contradicts` | ✅ Producción | `packages/mif` |
| Pasarela de modelos (enrutamiento tarea→modelo multi-proveedor) | ✅ Producción | `packages/model-gateway` |
| Adaptador `agentmemory` con sonda de versión + modo degradado | ✅ Producción | `packages/agentmemory-adapter` |
| Limitación de velocidad, registro JSON estructurado con redacción de campos | ✅ Producción | `apps/api` |
| Despliegue privado con Docker Compose | ✅ Producción | `docker-compose.yml` |
| Asistente de adopción local `pnpm quickstart` + informe de activación | ✅ Producción | `scripts/lore-quickstart.mjs` |
| Registro Oficial de MCP + docs de distribución / lanzamiento / socios de diseño | ✅ Producción | `server.json`, `docs/distribution/`, `docs/launch/` |

Consulta [CHANGELOG.md](../../../CHANGELOG.md) para el historial completo de versiones.

## Estado actual de la versión

`v2.1.0` es la línea actual de código fuente, producción alojada y versión. Se desplegó
en producción AWS y en el sitio web público a través del flujo de lanzamiento optimizado:
artefactos inmutables arm64-first, prueba de humo de la API de staging, despliegue de la API
de producción, despliegue aislado del sitio web, auditoría post-lanzamiento y cierre
de etiqueta/versión. Las verificaciones externas confirman que `https://api.lorecontext.com/health`
devuelve `status=ok`, `/openapi.json` reporta `2.1.0`, y `https://lorecontext.com/status.html`
contiene `v2.1.0`.

La producción mantiene la forma de v1.1+ RDS / SQS / memory-worker / Qdrant cloud, usa
`lore_memories_v12` como colección Qdrant, mantiene pgvector de 1024 dimensiones para la
ruta Postgres, y agrega el esquema aditivo del grafo de repositorio
(`apps/api/src/db/schema-v21-repo-graph.sql`).

Consulta [docs/release-status.md](../../release-status.md) para el resumen de estado
público actual y [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
para las notas completas de la versión.

## Enfoque de la versión

La versión v2.1 convierte el grafo de repositorio de Lore en una superficie de primera clase
para la memoria de agentes. El objetivo es permitir que los agentes respondan "dónde está
definido X", "qué llama a esto" y "qué se rompe si cambio esto" con un contrato determinista
y estable de contexto del proyecto en lugar de búsqueda de texto ad hoc:

- `@lore/repo-graph` — indexación determinista de repositorios TypeScript/JavaScript
  para archivos, símbolos, importaciones, llamadas, rutas, pruebas y sugerencias de proceso.
- Rutas de API: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact` y `POST /v1/repo/detect-changes`.
- Herramientas MCP: `repo.graph_query`, `repo.symbol_context`, `repo.impact` y
  `repo.detect_changes` (solo lectura).
- `context_query(repo)` ahora usa evidencia del grafo de repositorio respaldada por proveedor
  cuando está disponible, con un respaldo honesto de "no disponible" cuando el almacenamiento
  del grafo de repositorio no está configurado.
- El esquema Postgres del grafo de repositorio es aditivo — se asienta sobre el esquema
  de producción existente y se aplica durante la configuración del esquema de producción/staging.

Las versiones del paquete raíz y API reportan `2.1.0` para que `/openapi.json` coincida
con la etiqueta de versión. El tren de versiones usa las salvaguardas de despliegue dividido
API/sitio web optimizadas introducidas después de v2.0.9.

Consulta [docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md) y [docs/release-governance.md](../../release-governance.md).

## Integraciones

Lore Context habla MCP y REST y se integra con la mayoría de los IDEs de agentes y frontends de chat:

| Herramienta | Guía de configuración |
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
| Otro / MCP genérico | [docs/integrations/README.md](../../integrations/README.md) |

## Despliegue

| Modo | Cuándo usar | Documentación |
|---|---|---|
| **Respaldado por archivo local** | Desarrollo individual, prototipo, pruebas de humo | Este README, Inicio rápido arriba |
| **Postgres+pgvector local** | Respaldo local de un solo nodo y pruebas de migración | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose privado** | Despliegue de equipo autoalojado, red aislada | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Nube alojada** | RDS / SQS / memory-worker / Qdrant / incrustación privada más la pila de recuperación híbrida aumentada con grafo y el sustrato SaaS comercial | [docs/release-status.md](../../release-status.md) |

Todas las rutas de despliegue requieren secretos explícitos. Las rutas locales/privadas requieren
`POSTGRES_PASSWORD`, `LORE_API_KEYS` y autenticación del dashboard. Los despliegues alojados
también necesitan RDS, SQS, Qdrant, servicio de incrustación, OAuth, configuración de túnel y
las exportaciones del entorno de ejecución de producción. El script `scripts/check-env.mjs`
rechaza el inicio en producción si algún valor coincide con un patrón de marcador de posición.

## Seguridad

v2.1.0 mantiene la postura de despliegue local/privado y las salvaguardas de la nube alojada
para el acceso de usuarios ordinarios:

- **Autenticación**: tokens de portador con clave de API con separación de roles (`reader`/`writer`/`admin`) y alcance por proyecto. El modo de claves vacías falla de forma cerrada en producción.
- **Limitación de velocidad**: cubo dual por IP + por clave con retroceso por fallos de autenticación (429 después de 5 fallos en 60s, bloqueo de 30s).
- **Dashboard**: flujo de sesión de Google para el producto alojado; HTTP Basic Auth disponible para despliegues de operadores locales/privados.
- **Contenedores**: todos los Dockerfiles se ejecutan como usuario no root `node`; HEALTHCHECK en api + dashboard.
- **Secretos**: cero credenciales codificadas; todos los valores predeterminados son variables requeridas o de fallo. `scripts/check-env.mjs` rechaza valores de marcador de posición en producción.
- **Gobernanza**: escaneo de expresiones regulares de PII / clave de API / JWT / clave privada en escrituras; contenido etiquetado con riesgo enrutado automáticamente a la cola de revisión; registro de auditoría inmutable en cada transición de estado.
- **Envenenamiento de memoria**: detección heurística en patrones de consenso + verbos imperativos.
- **MCP**: validación de esquema zod en cada entrada de herramienta; las herramientas mutantes requieren `reason` (≥8 caracteres) y muestran `destructiveHint: true`; errores upstream saneados antes de devolución al cliente.
- **Aislamiento de trabajadores**: los trabajos de captura, incrustación, grafo, conector y retrorrelleno se ejecutan a través de colas AWS SQS con DLQs; Qdrant es un índice derivado y RDS permanece autoritativo.
- **Registro**: JSON estructurado con redacción automática de los campos `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Divulgaciones de vulnerabilidades: [SECURITY.md](../../../SECURITY.md).

## Estructura del proyecto

```text
apps/
  api/                # Plano de control REST + Postgres + gobernanza + eval + grafo de repo
  dashboard/          # Dashboard Next.js con sesión Google + HTTP Basic Auth para operadores
  mcp-server/         # Servidor MCP stdio (transportes SDK heredado + oficial)
  cli/                # CLI de lore (doctor, wiki-recompile, importación/exportación de conjuntos de datos)
  browser-extension/  # Andamiaje de superficie de captura
  web/                # Renderizador HTML del lado del servidor (interfaz de respaldo sin JS)
  website/            # Sitio de marketing (manejado por separado)
packages/
  shared/             # Tipos compartidos, errores, utilidades de ID/token
  agentmemory-adapter # Puente a agentmemory upstream + sonda de versión
  search/             # HybridSearchOrchestrator de 7 flujos + adaptador de recetas
  repo-graph/         # Indexación determinista de repositorios (v2.1)
  code-indexer/       # Indexador de grafos de conocimiento de código (TypeScript/JavaScript)
  code-indexer-python # Indexador de grafos de conocimiento de código (Python)
  capture/            # Primitivas de ingesta de capturas
  connectors/         # Conectores de fuentes externas
  model-gateway/      # Enrutamiento tarea→modelo multi-proveedor
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + primitivas de métricas + recetas de contexto
  governance/         # Máquina de estados + escaneo de riesgos + envenenamiento + auditoría
  profile/            # Tipos de vault / perfil de cuenta
  sdk-typescript/     # SDK cliente TypeScript
  sdk-python/         # SDK cliente Python
  sdk-go/ sdk-java/ sdk-dotnet/   # SDKs adicionales de lenguajes
  sdk-middleware-typescript/      # Middleware auto-inyectar + auto-retener (npm)
  sdk-middleware-python/          # Middleware auto-inyectar + auto-retener (PyPI)
docs/
  i18n/<lang>/        # README localizado en 17 idiomas
  integrations/       # Guías de integración con IDEs de agentes
  deployment/         # Cuadernos de ejecución para local, Docker Compose y automatización de producción
  legal/              # Privacidad / Términos / Cookies (ley de Singapur)
scripts/
  check-env.mjs       # Validación del entorno en modo producción
  smoke-*.mjs         # Pruebas de humo de extremo a extremo
  apply-postgres-schema.mjs
```

## Requisitos

- Node.js `>=22`
- pnpm `10.30.1`
- (Respaldo local opcional) Postgres 16 con pgvector
- (Alojado/avanzado) RDS PostgreSQL 16, AWS SQS, Qdrant y servicio de incrustación privado

## Contribuir

Las contribuciones son bienvenidas. Por favor lee [CONTRIBUTING.md](../../../CONTRIBUTING.md) para el flujo de trabajo de desarrollo, el protocolo de mensajes de commit y las expectativas de revisión.

Para traducciones de documentación, consulta la [guía para colaboradores de i18n](../README.md).

## Operado por

Lore Context es operado por **REDLAND PTE. LTD.** (Singapur, UEN 202304648K). El perfil de la empresa, los términos legales y el manejo de datos están documentados en [`docs/legal/`](../../legal/).

## Licencia

El repositorio de Lore Context está licenciado bajo [Apache License 2.0](../../../LICENSE). Los paquetes individuales bajo `packages/*` declaran MIT para facilitar el consumo downstream. Consulta [NOTICE](../../../NOTICE) para la atribución de proyectos upstream.

## Agradecimientos

Lore Context se construye sobre [agentmemory](https://github.com/agentmemory/agentmemory) como tiempo de ejecución de memoria local. Los detalles del contrato upstream y la política de compatibilidad de versiones están documentados en [UPSTREAM.md](../../../UPSTREAM.md).
