> 🤖 Este documento fue traducido por máquina del inglés. Las mejoras vía PR son bienvenidas — consulte la [guía de contribución de traducciones](../README.md).

# Política de Seguridad

Lore Context maneja memoria, trazas, registros de auditoría y credenciales de integración.
Trate los informes de seguridad como alta prioridad.

## Reportar una Vulnerabilidad

No abra un issue público para vulnerabilidades sospechadas, secretos filtrados, omisiones de
autenticación, exposición de datos o problemas de aislamiento de inquilinos.

Ruta de reporte preferida:

1. Use el **reporte privado de vulnerabilidades de GitHub** para este repositorio cuando esté disponible.
2. Si el reporte privado no está disponible, contacte a los mantenedores de forma privada e
   incluya:
   - versión o commit afectado,
   - pasos de reproducción,
   - impacto esperado,
   - si hay secretos reales o datos personales involucrados.

Nos comprometemos a acusar recibo de reportes creíbles dentro de 72 horas.

## Versiones Compatibles

Lore Context es actualmente software alpha pre-1.0. Las correcciones de seguridad apuntan
primero a la rama `main`. Las versiones etiquetadas pueden recibir parches específicos cuando
una versión pública es utilizada activamente por operadores.

| Versión | Compatible |
|---|---|
| v0.4.x-alpha | ✅ Activa |
| v0.3.x y anteriores | ❌ Solo pre-lanzamiento interno |

## Endurecimiento Incorporado (v0.4.0-alpha)

El alpha incluye los siguientes controles de defensa en profundidad. Los operadores deben
verificar que estos estén activos en su despliegue.

### Autenticación

- **Tokens bearer de clave API** (`Authorization: Bearer <key>` o encabezado `x-lore-api-key`).
- **Separación de roles**: `reader` / `writer` / `admin`.
- **Alcance por proyecto**: las entradas JSON de `LORE_API_KEYS` pueden incluir una lista de
  permiso `projectIds: ["..."]`; las mutaciones requieren un `project_id` coincidente.
- **El modo de claves vacías falla cerrado en producción**: con `NODE_ENV=production` y sin
  claves configuradas, la API rechaza todas las solicitudes.
- **Omisión de loopback eliminada**: versiones anteriores confiaban en `Host: 127.0.0.1`;
  v0.4 usa solo la dirección remota a nivel de socket.

### Límite de Tasa

- **Limitador de cubo dual por IP y por clave** con retroceso por fallo de autenticación.
- **Predeterminados**: 60 req/min por IP para rutas no autenticadas, 600 req/min por clave autenticada.
- **5 fallos de autenticación en 60s → bloqueo de 30s** (retorna 429).
- Configurable: `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED=1` (solo dev).

### Protección del Dashboard

- **Middleware HTTP Basic Auth** (`apps/dashboard/middleware.ts`).
- **El inicio en producción se rechaza** sin `DASHBOARD_BASIC_AUTH_USER` y
  `DASHBOARD_BASIC_AUTH_PASS`.
- `LORE_DASHBOARD_DISABLE_AUTH=1` solo se respeta fuera de producción.
- El respaldo a clave admin del lado del servidor ha sido **eliminado**: un usuario debe estar
  autenticado via Basic Auth antes de que el proxy del dashboard inyecte credenciales de API
  upstream.

### Endurecimiento de Contenedores

- Todos los Dockerfiles se ejecutan como usuario `node` sin root.
- `apps/api/Dockerfile` y `apps/dashboard/Dockerfile` declaran `HEALTHCHECK` contra `/health`.
- `apps/mcp-server` es solo stdio — sin escucha de red — y no declara un `HEALTHCHECK`.

### Gestión de Secretos

- **Sin credenciales codificadas.** Todos los valores predeterminados de `docker-compose.yml`,
  `docs/deployment/compose.private-demo.yml` y `.env.example` usan la forma
  `${VAR:?must be set}` — el inicio falla rápido sin valores explícitos.
- `scripts/check-env.mjs` rechaza valores de marcador de posición
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`,
  `dev`, `password`) cuando `NODE_ENV=production`.
- Todos los documentos de despliegue y READMEs de ejemplo han sido purgados de credenciales
  demo literales.

### Gobernanza

- **Escaneo de etiquetas de riesgo en cada escritura de memoria**: claves API, claves AWS,
  tokens JWT, claves privadas, contraseñas, correos electrónicos, números de teléfono detectados.
- **Máquina de seis estados** con tabla de transición legal explícita; las transiciones ilegales
  lanzan errores.
- **Heurísticas de envenenamiento de memoria**: dominancia de fuente única + coincidencia de
  patrón de verbo imperativo → indicador `suspicious`.
- **Registro de auditoría inmutable** añadido en cada transición de estado.
- El contenido de alto riesgo se enruta automáticamente a `candidate` / `flagged` y se retiene
  de la composición de contexto hasta que sea revisado.

### Endurecimiento de MCP

- Cada entrada de herramienta MCP se **valida contra un esquema zod** antes de la invocación.
  Los fallos de validación retornan JSON-RPC `-32602` con lista de problemas saneados.
- **Todas las herramientas mutantes** requieren una cadena `reason` de al menos 8 caracteres y
  exponen `destructiveHint: true` en su esquema.
- Los errores de API upstream se **sanean** antes de ser retornados a los clientes MCP —
  SQL sin procesar, rutas de archivo y seguimientos de pila son eliminados.

### Registro

- **Salida JSON estructurada** con correlación `requestId` a través de la cadena de
  manejadores.
- **Redacción automática** de campos que coincidan con `content`, `query`, `memory`, `value`,
  `password`, `secret`, `token`, `key`. El contenido real de los registros de memoria y las
  consultas nunca se escribe en los registros.

### Límites de Datos

- El adaptador `agentmemory` sondea la versión upstream en la inicialización y advierte sobre
  incompatibilidades. `LORE_AGENTMEMORY_REQUIRED=0` cambia el adaptador a modo degradado
  silencioso si el upstream no es alcanzable.
- El analizador de cuerpo de solicitud de `apps/api` aplica un límite `LORE_MAX_JSON_BYTES`
  (predeterminado 1 MiB); las solicitudes demasiado grandes retornan 413.
- El pool de conexiones Postgres establece `statement_timeout: 15000` para acotar el tiempo
  de consulta.
- `LORE_REQUEST_TIMEOUT_MS` (predeterminado 30s) limita cada manejador de solicitud;
  los tiempos de espera retornan 504.

## Guía de Despliegue

- No exponga Lore remotamente sin `LORE_API_KEYS` configuradas.
- Prefiera claves **con separación de roles** `reader` / `writer` / `admin`.
- **Siempre establezca** `DASHBOARD_BASIC_AUTH_USER` y `DASHBOARD_BASIC_AUTH_PASS` en
  producción.
- **Genere claves con `openssl rand -hex 32`**. Nunca use los valores de marcador de posición
  mostrados en los ejemplos.
- Mantenga los endpoints raw de `agentmemory` privados; acceda a ellos solo a través de Lore.
- Mantenga las rutas de dashboard, gobernanza, importación/exportación, sincronización y
  auditoría detrás de una capa de control de acceso de red (Cloudflare Access, AWS ALB,
  Tailscale ACL, similar) para cualquier exposición fuera de loopback.
- **Ejecute `node scripts/check-env.mjs` antes de iniciar la API en producción.**
- **Nunca haga commit** de archivos `.env` de producción, claves API de proveedores,
  credenciales en la nube, datos de evaluación con contenido de clientes, o exportaciones
  privadas de memoria.

## Cronograma de Divulgación

Para vulnerabilidades de alto impacto confirmadas:

- 0 días: reporte acusado de recibo.
- 7 días: clasificación y severidad compartidas con el reportero.
- 30 días: divulgación pública coordinada (o extendida por acuerdo mutuo).
- 30+ días: emisión de CVE para severidad media o superior si aplica.

Para problemas de menor severidad, espere resolución en la próxima versión menor.

## Hoja de Ruta de Endurecimiento

Elementos planificados para versiones posteriores:

- **v0.5**: especificación OpenAPI / Swagger; integración CI de `pnpm audit --high`,
  análisis estático CodeQL y dependabot.
- **v0.6**: imágenes de contenedor firmadas con Sigstore, procedencia SLSA, publicación npm
  via GitHub OIDC en lugar de tokens de larga duración.
- **Future hosted hardening**: cifrado en reposo para contenido de memoria marcado con `risk_tags` mediante
  cifrado de sobre KMS.
