> 🤖 Este documento fue traducido por máquina del inglés. Las mejoras vía PR son bienvenidas — consulte la [guía de contribución de traducciones](../README.md).

# Contribuir a Lore Context

Gracias por mejorar Lore Context. Este proyecto es un plano de control de contexto para agentes
de IA en etapa alpha, por lo que los cambios deben preservar la operación local-first, la
auditabilidad y la seguridad del despliegue.

## Código de Conducta

Este proyecto sigue el [Contributor Covenant](../../../CODE_OF_CONDUCT.md). Al participar
usted acepta cumplirlo.

## Configuración de Desarrollo

Requisitos:

- Node.js 22 o más reciente
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (Opcional) Docker para la ruta de Postgres
- (Opcional) `psql` si prefiere aplicar el esquema usted mismo

Comandos comunes:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # requiere docker compose up -d postgres
pnpm run doctor
```

Para trabajo por paquete:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore/mcp-server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Expectativas de Pull Request

- **Mantenga los cambios enfocados y reversibles.** Una preocupación por PR; un PR por preocupación.
- **Añada pruebas** para cambios de comportamiento. Prefiera aserciones reales sobre instantáneas.
- **Ejecute `pnpm build` y `pnpm test`** antes de solicitar revisión. CI también los ejecuta,
  pero localmente es más rápido.
- **Ejecute la prueba de humo relevante** al cambiar comportamiento de API, dashboard, MCP,
  Postgres, importación/exportación, evaluación o despliegue.
- **No haga commit** de salidas de compilación generadas, almacenes locales, archivos `.env`,
  credenciales o datos privados de clientes. El `.gitignore` cubre la mayoría de las rutas;
  si crea nuevos artefactos, asegúrese de que estén excluidos.
- **Manténgase dentro del alcance de su PR.** No refactorice código no relacionado de paso.

## Restricciones Arquitectónicas

Estas son no negociables para v0.4.x. Si un PR viola una, espere una solicitud de división
o reformulación:

- **Local-first sigue siendo primario.** Una nueva característica debe funcionar sin un
  servicio alojado o dependencia SaaS de terceros.
- **Sin nuevas omisiones de superficie de autenticación.** Cada ruta permanece protegida por
  clave API + rol. El loopback no es un caso especial en producción.
- **Sin exposición raw de `agentmemory`.** Los llamantes externos acceden a la memoria solo
  a través de los endpoints de Lore.
- **Integridad del registro de auditoría.** Cada mutación que afecte el estado de la memoria
  escribe una entrada de auditoría.
- **Falla cerrado en configuración faltante.** El inicio en modo producción se rechaza si
  las variables de entorno requeridas son marcadores de posición o están faltantes.

## Mensajes de Commit

Lore Context usa un formato de commit pequeño y opinado inspirado en las pautas del kernel de Linux.

### Formato

```text
<tipo>: <resumen corto en modo imperativo>

<cuerpo opcional que explica por qué se necesita este cambio y qué compromisos aplican>

<trailers opcionales>
```

### Tipos

- `feat` — nueva capacidad visible para el usuario o endpoint de API
- `fix` — corrección de error
- `refactor` — reestructuración de código sin cambio de comportamiento
- `chore` — higiene del repositorio (deps, herramientas, movimientos de archivos)
- `docs` — solo documentación
- `test` — cambios solo de prueba
- `perf` — mejora de rendimiento con impacto medible
- `revert` — reversión de un commit anterior

### Estilo

- **Minúsculas** para el tipo y la primera palabra del resumen.
- **Sin punto final** en la línea de resumen.
- **≤72 caracteres** en la línea de resumen; envuelva el cuerpo a 80.
- **Modo imperativo**: "fix loopback bypass", no "fixed" o "fixes".
- **Por qué sobre qué**: el diff muestra qué cambió; el cuerpo debe explicar por qué.
- **No incluya** trailers `Co-Authored-By`, atribución de IA o líneas signed-off-by a menos
  que el usuario lo requiera explícitamente.

### Trailers Útiles

Cuando sea relevante, añada trailers para capturar restricciones y contexto del revisor:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### Ejemplo

```text
fix: loopback bypass — remove host-header trust, fail closed in production

Previous versions trusted the Host header for loopback detection, allowing a
remote attacker to spoof "Host: 127.0.0.1" and obtain admin role with no API
key when LORE_API_KEYS was unset. Loopback detection now uses
req.socket.remoteAddress only, and production with empty keys returns 401.

Constraint: Local development without keys still works on loopback
Confidence: high
Scope-risk: narrow (auth path only)
Tested: pnpm test (added loopback-bypass test case), pnpm smoke:api
```

## Granularidad de Commits

- Un cambio lógico por commit. Los revisores pueden revertir atómicamente sin daño colateral.
- Combine correcciones triviales (`typo`, `lint`, `prettier`) en el commit padre antes de
  abrir o actualizar un PR.
- Las refactorizaciones de múltiples archivos están bien en un único commit si comparten una
  única razón.

## Proceso de Revisión

- Un mantenedor revisará su PR dentro de 7 días durante la actividad típica.
- Resuelva todos los comentarios bloqueantes antes de solicitar revisión nuevamente.
- Para comentarios no bloqueantes, responder en línea con justificación o un issue de
  seguimiento es aceptable.
- Los mantenedores pueden añadir una etiqueta `merge-queue` una vez aprobado el PR; no
  rebase ni force-push después de que esa etiqueta sea aplicada.

## Traducciones de Documentación

Si desea mejorar un README traducido o un archivo de documentación, vea la
[guía de contribución i18n](../README.md).

## Reportar Errores

- Abra un issue público en https://github.com/Lore-Context/lore-context/issues a menos que
  el error sea una vulnerabilidad de seguridad.
- Para problemas de seguridad, siga [SECURITY.md](../../../SECURITY.md).
- Incluya: versión o commit, entorno, reproducción, esperado vs actual, registros (con
  contenido sensible redactado).

## Gracias

Lore Context es un pequeño proyecto que intenta hacer algo útil para la infraestructura de
agentes de IA. Cada PR bien delimitado lo hace avanzar.
