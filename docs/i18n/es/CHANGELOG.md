> 🤖 Este documento fue traducido por máquina del inglés. Las mejoras vía PR son bienvenidas — consulte la [guía de contribución de traducciones](../README.md).

# Registro de Cambios

Todos los cambios notables en Lore Context están documentados aquí. El formato está basado en
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) y este proyecto
sigue [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v0.4.0-alpha] — 2026-04-28

Primer alpha público. Cierra el sprint de endurecimiento de producción que convirtió el
MVP fallido en auditoría en un alpha candidato a versión. Todos los elementos P0 de auditoría
resueltos, 12 de 13 elementos P1 resueltos (uno parcial — ver Notas), 117+ pruebas pasando,
compilación completa del monorepo limpia.

### Añadido

- **`packages/eval/src/runner.ts`** — `EvalRunner` real (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). La evaluación ahora puede ejecutar una evaluación de recuperación
  de extremo a extremo contra un conjunto de datos propio y persistir ejecuciones como JSON
  para detección de regresiones a través del tiempo.
- **`packages/governance/src/state.ts`** — máquina de estados de gobernanza de seis estados
  (`candidate / active / flagged / redacted / superseded / deleted`) con tabla de transición
  legal explícita. Las transiciones ilegales lanzan errores.
- **`packages/governance/src/audit.ts`** — ayudante de adición al registro de auditoría
  inmutable integrado con el tipo `AuditLog` de `@lore/shared`.
- **`packages/governance/detectPoisoning`** — heurística para detección de envenenamiento de
  memoria usando dominancia de fuente única (>80%) y coincidencia de patrones de verbo imperativo.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — sonda de versión upstream basada
  en semver con comparación manual (sin nueva dependencia). Respeta
  `LORE_AGENTMEMORY_REQUIRED=0` para modo degradado silencioso.
- **`packages/mif`** — campos `supersedes: string[]` y `contradicts: string[]` añadidos
  a `LoreMemoryItem`. Preservados en ida y vuelta en formatos JSON y Markdown.
- **`apps/api/src/logger.ts`** — registrador JSON estructurado con redacción automática de
  campos sensibles (`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`). `requestId` fluye a través de cada solicitud.
- **`apps/dashboard/middleware.ts`** — middleware HTTP Basic Auth. El inicio en producción
  se rechaza sin `DASHBOARD_BASIC_AUTH_USER` y `DASHBOARD_BASIC_AUTH_PASS`.
- **`scripts/check-env.mjs`** — validador de entorno en modo producción. Se niega a iniciar
  la aplicación si algún valor de entorno coincide con un patrón de marcador de posición
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`).
- **Límite de tasa** — limitador de token de cubo dual por IP y por clave con retroceso por
  fallo de autenticación (5 fallos en 60s → bloqueo de 30s → respuesta 429). Configurable
  mediante `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED`.
- **Apagado controlado** — manejadores SIGTERM/SIGINT drenan solicitudes en vuelo hasta 10s,
  vacían escrituras Postgres pendientes, cierran el pool, fuerzan la salida a los 15s.
- **Índices de base de datos** — índices B-tree en `(project_id)` / `(status)` /
  `(created_at)` para `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs`. Índices GIN en jsonb `content` y `metadata`.
- **Validación de entrada MCP con zod** — cada herramienta MCP ahora ejecuta `safeParse`
  contra un esquema zod por herramienta; los fallos retornan JSON-RPC `-32602` con problemas
  saneados.
- **`destructiveHint` MCP + `reason` requerido** — cada herramienta mutante
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) requiere un
  `reason` de al menos 8 caracteres y expone `destructiveHint: true`.
- 117+ nuevos casos de prueba en `apps/api`, `apps/mcp-server`, `packages/eval`,
  `packages/governance`, `packages/mif`, `packages/agentmemory-adapter`.
- Documentación multilingüe: README en 17 idiomas bajo `docs/i18n/<lang>/`.
- `CHANGELOG.md` (este archivo).
- `docs/getting-started.md` — inicio rápido de 5 minutos para desarrolladores.
- `docs/api-reference.md` — referencia de endpoints de API REST.
- `docs/i18n/README.md` — guía de contribución de traducciones.

### Cambiado

- **`packages/mif`** versión del sobre `"0.1"` → `"0.2"`. Importación compatible con versiones anteriores.
- **`LORE_POSTGRES_AUTO_SCHEMA`** predeterminado `true` → `false`. Los despliegues en producción
  deben optar explícitamente por la aplicación automática del esquema o ejecutar `pnpm db:schema`.
- **`apps/api`** el analizador de cuerpo de solicitud ahora es de transmisión con un límite
  estricto de tamaño de carga útil (`LORE_MAX_JSON_BYTES`, predeterminado 1 MiB). Las
  solicitudes demasiado grandes retornan 413.
- **Autenticación de loopback** cambiada: se eliminó la dependencia del encabezado URL `Host`;
  la detección de loopback ahora usa `req.socket.remoteAddress` únicamente. En producción sin
  claves API configuradas, la API falla cerrada y rechaza solicitudes (antes: otorgaba admin
  silenciosamente).
- **Las claves API con alcance** ahora deben proporcionar `project_id` para `/v1/memory/list`,
  `/v1/eval/run` e `/v1/memory/import` (antes: `project_id` indefinido creaba un cortocircuito).
- **Todos los Dockerfiles** ahora se ejecutan como usuario `node` sin root. `apps/api/Dockerfile`
  y `apps/dashboard/Dockerfile` declaran `HEALTHCHECK`.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` ahora usa `${POSTGRES_PASSWORD:?must be set}` —
  el inicio falla rápido sin una contraseña explícita.
- **`docs/deployment/compose.private-demo.yml`** — mismo patrón de requerimiento o fallo.
- **`.env.example`** — todos los valores predeterminados de demo eliminados y reemplazados con
  marcadores `# REQUIRED`. Nuevas variables documentadas para límite de tasa, tiempo de espera
  de solicitud, límite de carga útil, modo requerido de agentmemory, autenticación básica del
  dashboard.

### Corregido

- **Vulnerabilidad de omisión de autenticación por loopback** (P0). Un atacante podía enviar
  `Host: 127.0.0.1` para falsificar la detección de loopback y obtener el rol admin sin clave
  API.
- **Delegación confusa en el proxy del dashboard** (P0). El proxy del dashboard inyectaba
  `LORE_API_KEY` para solicitudes no autenticadas, otorgando poderes admin a cualquiera capaz
  de alcanzar el puerto 3001.
- **Defensa contra fuerza bruta** (P0). Las claves demo (`admin-local`, `read-local`,
  `write-local`) mostradas en el README/`.env.example` podían enumerarse indefinidamente;
  el límite de tasa y la eliminación de valores predeterminados ahora defienden contra esto.
- **Fallo por análisis JSON de `LORE_API_KEYS` malformado** — el proceso ahora sale con un
  error claro en lugar de lanzar un seguimiento de pila.
- **OOM por cuerpo de solicitud grande** — los cuerpos por encima del límite configurado ahora
  retornan 413 en lugar de bloquear el proceso Node.
- **Fuga de error MCP** — los errores de API upstream que incluían SQL sin procesar, rutas de
  archivo o seguimientos de pila ahora se sanean a `{code, generic-message}` antes de llegar
  a los clientes MCP.
- **Fallo por análisis JSON del dashboard** — las respuestas JSON inválidas ya no bloquean la
  UI; los errores se muestran como estado visible para el usuario.
- **`memory_update` / `memory_supersede` en MCP** anteriormente no requerían `reason`; esto
  ahora es obligatorio por esquema zod.
- **Pool de Postgres**: `statement_timeout` ahora configurado a 15s; anteriormente existía
  riesgo de tiempo de consulta ilimitado bajo consultas jsonb malformadas.

### Seguridad

- Todos los hallazgos de auditoría P0 (omisión de loopback / auth del dashboard / límite de
  tasa / secretos demo) resueltos. Vea public release notes para el rastro completo de auditoría.
- `pnpm audit --prod` reporta cero vulnerabilidades conocidas en el momento del lanzamiento.
- Credenciales demo eliminadas de todas las plantillas de despliegue y READMEs de ejemplo.
- Las imágenes de contenedor ahora se ejecutan como no-root por defecto.

### Notas / Limitaciones conocidas

- **P1-1 parcial**: `/v1/context/query` conserva el comportamiento permisivo de clave con
  alcance para evitar romper pruebas de consumidores existentes. Otras rutas afectadas
  (`/v1/memory/list`, `/v1/eval/run`, `/v1/memory/import`) aplican `project_id`.
  Pendiente para v0.5.
- **La sincronización en la nube multi-tenant alojada** no está implementada en v0.4.0-alpha.
  Solo despliegues locales y Compose-privados.
- **Calidad de traducción**: las localizaciones del README son generadas por LLM y están
  claramente etiquetadas; los PRs de la comunidad para refinar cada idioma son bienvenidos
  (vea [`docs/i18n/README.md`](../README.md)).
- **Especificación OpenAPI / Swagger** aún no está empaquetada. La superficie REST está
  documentada en prosa en [`docs/api-reference.md`](../../api-reference.md). Pendiente para v0.5.

### Agradecimientos

Esta versión es el resultado de un sprint de endurecimiento de producción de un solo día
que involucró ejecución paralela de sub-agentes contra un plan de auditoría estructurado.

## [v0.0.0] — pre-lanzamiento

Hitos de desarrollo interno, no publicados. Implementado:

- Andamiajes de paquetes del workspace (monorepo TypeScript, espacios de trabajo pnpm).
- Canalización compartida de compilación/prueba TypeScript.
- Sistema de tipos de memoria / contexto / evaluación / auditoría en `@lore/shared`.
- Límite del adaptador `agentmemory`.
- API REST local con enrutador y compositor de contexto.
- Persistencia en archivo JSON + almacenamiento en tiempo de ejecución Postgres opcional con
  upsert incremental.
- Flujos de detalle / edición / supersesión / olvido de memoria con eliminación permanente explícita.
- Contabilidad real de uso de memoria (`useCount`, `lastUsedAt`).
- Retroalimentación de trazas (`useful` / `wrong` / `outdated` / `sensitive`).
- Importación/exportación JSON + Markdown tipo MIF con campos de gobernanza.
- Conjunto de regex de escaneo de secretos.
- Métricas de evaluación directas basadas en sesión; ejecuciones de evaluación de comparación
  de proveedores; listado de ejecuciones de evaluación.
- Protección por clave API con separación de roles reader/writer/admin.
- Cola de revisión de gobernanza; API de registro de auditoría.
- HTML del dashboard servido por API; dashboard Next.js independiente.
- Datos semilla demo; generación de configuración de integración.
- Empaquetado privado Docker/Compose.
- Transportes MCP stdio heredado + SDK oficial.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
