> 🤖 Dokumen ini diterjemahkan secara otomatis dari bahasa Inggris. Perbaikan melalui PR sangat diterima — lihat [panduan kontribusi terjemahan](../README.md).

# Referensi API

Lore Context mengekspos REST API di bawah `/v1/*` dan server MCP stdio. Dokumen ini
mencakup permukaan REST. Nama alat MCP tercantum di bagian akhir.

Semua contoh mengasumsikan:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Konvensi

- Semua endpoint menerima dan mengembalikan JSON.
- Autentikasi: header `Authorization: Bearer <key>` (atau `x-lore-api-key`).
  `/health` adalah satu-satunya rute yang tidak memerlukan autentikasi.
- Peran: `reader < writer < admin`. Setiap endpoint mencantumkan peran minimumnya.
- Kesalahan: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Batas laju: header `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  pada setiap respons. `429 Too Many Requests` menyertakan header `Retry-After`.
- Semua mutasi dicatat dalam log audit. Akses hanya admin melalui
  `/v1/governance/audit-log`.

## Kesehatan dan Kesiapan

### `GET /health`
- **Autentikasi**: tidak ada
- **Respons 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Konteks

### `POST /v1/context/query`
Menyusun konteks dari memori + web + repo + jejak alat.

- **Autentikasi**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Respons 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Memori

### `POST /v1/memory/write`
- **Autentikasi**: writer+ (penulis scoped proyek harus menyertakan `project_id` yang cocok)
- **Body**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Respons 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Autentikasi**: reader+
- **Respons 200**: rekaman memori lengkap termasuk status tata kelola.

### `POST /v1/memory/:id/update`
Patch memori di tempat (hanya koreksi kecil).
- **Autentikasi**: writer+
- **Body**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Membuat memori baru yang menggantikan memori lama.
- **Autentikasi**: writer+
- **Body**: `{ "content": string, "reason": string }`
- **Respons 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Penghapusan lunak secara default; admin dapat melakukan penghapusan keras.
- **Autentikasi**: writer+ (lunak) / admin (keras)
- **Body**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Pencarian langsung tanpa komposisi.
- **Autentikasi**: reader+
- **Body**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Autentikasi**: reader+
- **Kueri**: `project_id` (WAJIB untuk kunci scoped), `state`, `limit`, `offset`
- **Respons 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Mengekspor memori sebagai JSON MIF v0.2.
- **Autentikasi**: admin
- **Kueri**: `project_id`, `format` (`json` atau `markdown`)
- **Respons 200**: envelope MIF dengan `provenance`, `validity`, `confidence`,
  `source_refs`, `supersedes`, `contradicts`.

### `POST /v1/memory/import`
Mengimpor envelope MIF v0.1 atau v0.2.
- **Autentikasi**: admin (atau penulis scoped dengan `project_id` eksplisit)
- **Body**: envelope MIF sebagai string JSON atau objek
- **Respons 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Tata Kelola

### `GET /v1/governance/review-queue`
- **Autentikasi**: admin
- **Respons 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
Promosikan candidate/flagged → active.
- **Autentikasi**: admin
- **Body**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
Promosikan candidate/flagged → deleted.
- **Autentikasi**: admin
- **Body**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Autentikasi**: admin
- **Kueri**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Respons 200**: `{ "entries": AuditLog[], "total": number }`

## Eval

### `GET /v1/eval/providers`
- **Autentikasi**: reader+
- **Respons 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Autentikasi**: writer+ (penulis scoped proyek harus menyertakan `project_id` yang cocok)
- **Body**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Respons 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Mengambil eval run yang tersimpan.
- **Autentikasi**: reader+

### `GET /v1/eval/report`
Merender eval terbaru sebagai Markdown atau JSON.
- **Autentikasi**: reader+
- **Kueri**: `project_id`, `format` (`md`|`json`)

## Event dan Jejak

### `POST /v1/events/ingest`
Mendorong telemetri agen ke Lore.
- **Autentikasi**: writer+
- **Body**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Autentikasi**: reader+
- **Kueri**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Memeriksa jejak kueri konteks tunggal.
- **Autentikasi**: reader+

### `POST /v1/traces/:trace_id/feedback`
Mencatat umpan balik pada kueri konteks.
- **Autentikasi**: writer+
- **Body**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Integrasi

### `GET /v1/integrations/agentmemory/health`
Memeriksa upstream agentmemory + kompatibilitas versi.
- **Autentikasi**: reader+
- **Respons 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
Menarik memori dari agentmemory ke Lore.
- **Autentikasi**: admin (tidak scoped — sinkronisasi melewati proyek)
- **Body**: `{ "project_id"?: string, "dry_run"?: boolean }`

## Server MCP (stdio)

Server MCP mengekspos alat-alat berikut. `inputSchema` setiap alat adalah
JSON Schema yang divalidasi zod. Alat yang bermutasi memerlukan string `reason` minimal 8 karakter.

| Alat | Bermutasi | Deskripsi |
|---|---|---|
| `context_query` | tidak | Menyusun konteks untuk kueri |
| `memory_write` | ya | Menulis memori baru |
| `memory_search` | tidak | Pencarian langsung tanpa komposisi |
| `memory_get` | tidak | Mengambil berdasarkan id |
| `memory_list` | tidak | Daftar memori dengan filter |
| `memory_update` | ya | Patch di tempat |
| `memory_supersede` | ya | Menggantikan dengan versi baru |
| `memory_forget` | ya | Penghapusan lunak atau keras |
| `memory_export` | tidak | Mengekspor envelope MIF |
| `eval_run` | tidak | Menjalankan eval terhadap dataset |
| `trace_get` | tidak | Memeriksa jejak berdasarkan id |

Kode kesalahan JSON-RPC:
- `-32602` Parameter tidak valid (kegagalan validasi zod)
- `-32603` Kesalahan internal (disanitasi; aslinya ditulis ke stderr)

Jalankan dengan transport SDK resmi:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Spesifikasi OpenAPI 3.0 formal dilacak untuk v0.5. Hingga saat itu, referensi prosa ini
adalah otoritatif.
