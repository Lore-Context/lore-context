# REST/cURL and OpenTelemetry Fallback

Use this path for Ruby, PHP, Rust, Swift, Kotlin mobile, Dart, or any runtime that does not yet have a first-party SDK.

## Health

```bash
curl -s https://api.lorecontext.com/health
```

## Context query

```bash
curl -s https://api.lorecontext.com/v1/context/query \
  -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"What should this agent remember?","mode":"memory","token_budget":2048}'
```

## Memory write

```bash
curl -s https://api.lorecontext.com/v1/memory/write \
  -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":{"text":"User prefers concise runbooks."},"source":"rest-example"}'
```

## OpenTelemetry guidance

- Put Lore request IDs, trace IDs, and memory IDs in span attributes; do not put raw memory text into telemetry.
- Use low-cardinality attributes such as `lore.operation`, `lore.mode`, and `lore.route`.
- Record failures as errors but keep the application request path fail-open unless your product explicitly requires fail-closed memory.
