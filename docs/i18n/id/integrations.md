> 🤖 Dokumen ini diterjemahkan secara otomatis dari bahasa Inggris. Perbaikan melalui PR sangat diterima — lihat [panduan kontribusi terjemahan](../README.md).

# Panduan Integrasi

Panduan ini mendokumentasikan kontrak integrasi Lore Context terhadap MVP lokal saat ini.

## Status Repositori Saat Ini

- Repositori ini kini menyertakan REST API lokal, router/komposer konteks, persistensi file JSON opsional, penyimpanan runtime Postgres opsional, jejak, impor/ekspor memori, perbandingan penyedia eval, dashboard HTML yang disajikan API, dashboard Next.js mandiri, dan batas adapter `agentmemory`.
- `apps/mcp-server/src/index.ts` menyediakan peluncur MCP stdio JSON-RPC yang dapat dijalankan yang mem-proxy alat ke Lore REST API melalui `LORE_API_URL` dan meneruskan `LORE_API_KEY` sebagai token Bearer jika dikonfigurasi. Ini mendukung loop stdio bawaan legacy dan transport stdio `@modelcontextprotocol/sdk` resmi melalui `LORE_MCP_TRANSPORT=sdk`.
- Dokumen di bawah ini adalah kontrak integrasi. Integrasi API-first dapat menggunakan server REST lokal hari ini; klien yang mendukung MCP dapat menggunakan peluncur stdio lokal setelah `pnpm build`.

## Desain Bersama

- Klien yang mendukung MCP harus terhubung ke server MCP Lore kecil, bukan langsung ke `agentmemory` mentah.
- Klien API-first harus memanggil endpoint REST Lore, dengan `POST /v1/context/query` sebagai jalur baca utama.
- `POST /v1/context/query` menerima `mode`, `sources`, `freshness`, `token_budget`, `writeback_policy`, dan `include_sources` sehingga klien dapat memaksa atau menonaktifkan perutean memori/web/repo/tool-trace sesuai kebutuhan.
- Lore membungkus runtime `agentmemory` lokal melalui `packages/agentmemory-adapter`.
- `agentmemory` lokal diharapkan pada `http://127.0.0.1:3111`.

## Permukaan MCP yang Tersedia

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

## Permukaan REST yang Tersedia

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` dengan `project_id`, `scope`, `status`, `memory_type`, `q`, dan `limit` opsional
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

## Pengujian Asap API Lokal

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

Jalur pengujian asap otomatis adalah:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Pengujian Asap MCP Lokal

Peluncur MCP membaca JSON-RPC yang dibatasi baris baru dari stdin dan hanya menulis pesan JSON-RPC ke stdout:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Jangan meluncurkan ini melalui `pnpm start` dari klien MCP karena banner manajer paket akan mencemari stdout.

## Keselarasan Penerapan Privat

Pengemasan demo privat di [docs/deployment/README.md](../../deployment/README.md) mengasumsikan:

- API dan dashboard Lore berjalan sebagai container berumur panjang.
- Postgres adalah penyimpanan tahan lama default untuk demo bersama.
- Peluncur MCP tetap menjadi proses stdio dekat dengan klien, atau berjalan sebagai layanan compose `mcp` opsional sesuai permintaan.
- Seeding demo berasal dari [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json), sementara pengujian asap eval berasal dari [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json).

Untuk penerapan privat, arahkan peluncur klien ke URL API privat dan berikan peran terkecil yang sesuai:

- `reader`: dashboard dan kopilot hanya-baca.
- `writer`: agen yang harus menulis memori, umpan balik, atau eval run.
- `admin`: alur impor, ekspor, tata kelola, audit, dan forget.

## Template Klien Sadar Penerapan

### Claude Code

Utamakan proses stdio lokal workstation yang menargetkan API privat:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY=write-local \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

Jika Anda menggunakan container MCP yang dikemas alih-alih `node .../dist/index.js`, pertahankan pasangan `LORE_API_URL` / `LORE_API_KEY` yang sama dan jalankan peluncur stdio melalui `docker compose run --rm mcp`.

### Cursor

JSON MCP gaya Cursor harus menjaga peluncur tetap lokal dan hanya mengubah target API dan kunci:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "read-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Gunakan kunci `writer` hanya ketika alur kerja Cursor dengan sengaja menulis balik memori proyek yang tahan lama.

### Qwen Code

JSON `mcpServers` gaya Qwen mengikuti batas yang sama:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "write-local",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Gunakan `reader` untuk asisten pengambilan hanya-pencarian dan `writer` untuk alur agentik yang memerlukan alat `memory_write`, `memory_update`, atau umpan balik `trace`.

## Default Aman

- Utamakan `stdio` secara lokal untuk MCP; gunakan HTTP streamable yang terautentikasi hanya ketika transport jarak jauh diperlukan.
- Perlakukan SSE sebagai kompatibilitas legacy, bukan jalur default.
- Daftarkan alat dengan `includeTools` atau padanan klien.
- Jangan aktifkan mode kepercayaan luas secara default.
- Wajibkan `reason` pada operasi yang bermutasi.
- Jaga `memory_forget` pada penghapusan lunak kecuali admin dengan sengaja mengatur `hard_delete: true` untuk penghapusan terkontrol.
- Gunakan pemisahan peran `LORE_API_KEYS` untuk paparan API lokal atau jarak jauh bersama: `reader` untuk klien hanya-baca, `writer` untuk writeback agen, dan `admin` hanya untuk operasi sinkronisasi/impor/ekspor/forget/tata kelola/audit. Tambahkan `projectIds` untuk mencakupkan kunci klien ke proyek yang dapat mereka lihat atau mutasi.
- Jaga `agentmemory` terikat ke `127.0.0.1`.
- Jangan mengekspos penampil atau konsol `agentmemory` mentah secara publik.
- Kontrak `agentmemory` 0.9.3 live saat ini: `remember`, `export`, `audit`, dan `forget(memoryId)` dapat digunakan untuk pengujian sinkronisasi/kontrak Lore; `smart-search` mencari observasi dan tidak boleh dianggap sebagai bukti bahwa rekaman memori yang baru diingat dapat langsung dicari.
