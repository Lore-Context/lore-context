> 🤖 Este documento fue traducido por máquina del inglés. Las mejoras vía PR son bienvenidas — consulte la [guía de contribución de traducciones](../README.md).

<div align="center">

# Lore Context

**El plano de control para memoria, evaluación y gobernanza de agentes de IA.**

Sepa qué recordó cada agente, qué usó y qué debe olvidar — antes de que la memoria se convierta en un riesgo en producción.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Primeros Pasos](../../getting-started.md) · [Referencia de API](../../api-reference.md) · [Arquitectura](../../architecture.md) · [Integraciones](../../integrations/README.md) · [Despliegue](../../deployment/README.md) · [Registro de Cambios](../../../CHANGELOG.md)

🌐 **Leer en tu idioma**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](./README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

---

## Qué es Lore Context

Lore Context es un **plano de control de núcleo abierto** para la memoria de agentes de IA: compone contexto a partir de memoria, búsqueda y trazas de herramientas; evalúa la calidad de recuperación sobre sus propios conjuntos de datos; enruta contenido sensible para revisión de gobernanza; y exporta la memoria en un formato de intercambio portátil que puede mover entre backends.

No pretende ser otra base de datos de memoria. El valor único radica en lo que se sitúa sobre la memoria:

- **Context Query** — un único endpoint compone memoria + web + repositorio + trazas de herramientas, y devuelve un bloque de contexto calificado con procedencia.
- **Memory Eval** — ejecuta Recall@K, Precision@K, MRR, stale-hit-rate y latencia p95 sobre conjuntos de datos propios; persiste ejecuciones y las compara para detectar regresiones.
- **Governance Review** — ciclo de vida de seis estados (`candidate / active / flagged / redacted / superseded / deleted`), escaneo de etiquetas de riesgo, heurísticas de envenenamiento, registro de auditoría inmutable.
- **Portabilidad tipo MIF** — exportación/importación JSON + Markdown preservando `provenance / validity / confidence / source_refs / supersedes / contradicts`. Funciona como formato de migración entre backends de memoria.
- **Multi-Agent Adapter** — integración de primera clase con `agentmemory`, con sonda de versión y modo degradado de respaldo; contrato de adaptador limpio para otros runtimes.

## Cuándo usarlo

| Use Lore Context cuando... | Use una base de datos de memoria (agentmemory, Mem0, Supermemory) cuando... |
|---|---|
| Necesita **demostrar** qué recordó su agente, por qué y si fue utilizado | Solo necesita almacenamiento de memoria sin procesar |
| Ejecuta múltiples agentes (Claude Code, Cursor, Qwen, Hermes, Dify) y desea contexto compartido y confiable | Está construyendo un único agente y acepta un nivel de memoria vinculado a un proveedor |
| Requiere despliegue local o privado por cumplimiento normativo | Prefiere un SaaS alojado |
| Necesita evaluación sobre sus propios conjuntos de datos, no benchmarks de proveedores | Los benchmarks del proveedor son señal suficiente |
| Desea migrar memoria entre sistemas | No planea cambiar de backend |

## Inicio Rápido

```bash
# 1. Clonar + instalar
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Generar una clave de API real (no use marcadores de posición en ningún entorno más allá del desarrollo local)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. Iniciar la API (respaldada por archivo, sin Postgres requerido)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Escribir una memoria
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Consultar contexto
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Para la configuración completa (Postgres, Docker Compose, Dashboard, integración MCP), vea [docs/getting-started.md](../../getting-started.md).

## Arquitectura

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

Para más detalles, vea [docs/architecture.md](../../architecture.md).

## Qué hay en v0.4.0-alpha

| Capacidad | Estado | Ubicación |
|---|---|---|
| API REST con autenticación por clave API (reader/writer/admin) | ✅ Producción | `apps/api` |
| Servidor MCP stdio (transporte SDK heredado + oficial) | ✅ Producción | `apps/mcp-server` |
| Dashboard Next.js con control de acceso HTTP Basic Auth | ✅ Producción | `apps/dashboard` |
| Persistencia incremental Postgres + pgvector | ✅ Opcional | `apps/api/src/db/` |
| Máquina de estados de gobernanza + registro de auditoría | ✅ Producción | `packages/governance` |
| Ejecutor de evaluación (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Producción | `packages/eval` |
| Importación/exportación MIF v0.2 con `supersedes` + `contradicts` | ✅ Producción | `packages/mif` |
| Adaptador `agentmemory` con sonda de versión + modo degradado | ✅ Producción | `packages/agentmemory-adapter` |
| Límite de tasa (por IP + por clave con retroceso) | ✅ Producción | `apps/api` |
| Registro JSON estructurado con redacción de campos sensibles | ✅ Producción | `apps/api/src/logger.ts` |
| Despliegue privado Docker Compose | ✅ Producción | `docker-compose.yml` |
| Conjunto de datos demo + pruebas de humo + prueba UI Playwright | ✅ Producción | `examples/`, `scripts/` |
| Sincronización en la nube multi-tenant alojada | ⏳ Hoja de ruta | — |

Vea [CHANGELOG.md](../../../CHANGELOG.md) para las notas completas de la versión v0.4.0-alpha.

## Integraciones

Lore Context habla MCP y REST, e integra con la mayoría de los IDEs de agentes y frontends de chat:

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
| **Archivo local** | Desarrollo individual, prototipo, pruebas de humo | Este README, Inicio Rápido arriba |
| **Postgres+pgvector local** | Nodo único de grado producción, búsqueda semántica a escala | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose privado** | Despliegue de equipo autoalojado, red aislada | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Nube administrada** | Próximamente en v0.6 | — |

Todas las rutas de despliegue requieren secretos explícitos: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. El script `scripts/check-env.mjs` rechaza el inicio en producción si algún valor coincide con un patrón de marcador de posición.

## Seguridad

v0.4.0-alpha implementa una postura de defensa en profundidad apropiada para despliegues alpha no públicos:

- **Autenticación**: tokens bearer de clave API con separación de roles (`reader`/`writer`/`admin`) y alcance por proyecto. El modo de claves vacías falla cerrado en producción.
- **Límite de tasa**: cubo dual por IP + por clave con retroceso por fallo de autenticación (429 después de 5 fallos en 60s, bloqueo de 30s).
- **Dashboard**: middleware HTTP Basic Auth. Se niega a iniciar en producción sin `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Contenedores**: todos los Dockerfiles se ejecutan como usuario `node` sin root; HEALTHCHECK en api + dashboard.
- **Secretos**: sin credenciales codificadas; todos los valores predeterminados son variables de requerimiento o fallo. `scripts/check-env.mjs` rechaza valores de marcador de posición en producción.
- **Gobernanza**: escaneo regex de PII / clave API / JWT / clave privada en escrituras; contenido etiquetado de riesgo enrutado automáticamente a la cola de revisión; registro de auditoría inmutable en cada transición de estado.
- **Envenenamiento de memoria**: detección heurística sobre patrones de dominancia de fuente + verbo imperativo.
- **MCP**: validación de esquema zod en cada entrada de herramienta; las herramientas mutantes requieren `reason` (≥8 caracteres) y exponen `destructiveHint: true`; los errores de upstream se sanean antes de retornarlos al cliente.
- **Registro**: JSON estructurado con redacción automática de campos `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Divulgación de vulnerabilidades: [SECURITY.md](../../../SECURITY.md).

## Estructura del proyecto

```text
apps/
  api/                # API REST + Postgres + gobernanza + evaluación (TypeScript)
  dashboard/          # Dashboard Next.js 16 con middleware Basic Auth
  mcp-server/         # Servidor MCP stdio (transportes SDK heredado + oficial)
  web/                # Renderizador HTML del lado del servidor (UI de respaldo sin JS)
  website/            # Sitio de marketing (manejado por separado)
packages/
  shared/             # Tipos compartidos, errores, utilidades de ID/token
  agentmemory-adapter # Puente hacia agentmemory upstream + sonda de versión
  search/             # Proveedores de búsqueda enchufables (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + primitivas de métricas
  governance/         # Máquina de estados + escaneo de riesgo + envenenamiento + auditoría
docs/
  i18n/<lang>/        # README localizado en 17 idiomas
  integrations/       # 11 guías de integración para IDEs de agentes
  deployment/         # Local + Postgres + Docker Compose
  legal/              # Privacidad / Términos / Cookies (ley de Singapur)
scripts/
  check-env.mjs       # Validación de entorno en modo producción
  smoke-*.mjs         # Pruebas de humo de extremo a extremo
  apply-postgres-schema.mjs
```

## Requisitos

- Node.js `>=22`
- pnpm `10.30.1`
- (Opcional) Postgres 16 con pgvector para memoria de grado búsqueda semántica

## Contribuir

Las contribuciones son bienvenidas. Lea [CONTRIBUTING.md](../../../CONTRIBUTING.md) para conocer el flujo de trabajo de desarrollo, el protocolo de mensajes de commit y las expectativas de revisión.

Para traducciones de documentación, vea la [guía de contribución i18n](../README.md).

## Operado por

Lore Context es operado por **REDLAND PTE. LTD.** (Singapur, UEN 202304648K). El perfil de la empresa, los términos legales y el manejo de datos están documentados en [`docs/legal/`](../../legal/).

## Licencia

El repositorio de Lore Context está licenciado bajo [Apache License 2.0](../../../LICENSE). Los paquetes individuales bajo `packages/*` declaran MIT para facilitar el consumo de terceros. Vea [NOTICE](../../../NOTICE) para la atribución de fuentes externas.

## Agradecimientos

Lore Context se construye sobre [agentmemory](https://github.com/agentmemory/agentmemory) como runtime de memoria local. Los detalles del contrato upstream y la política de compatibilidad de versiones están documentados en [UPSTREAM.md](../../../UPSTREAM.md).
