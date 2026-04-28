> 🤖 Dokumen ini diterjemahkan secara otomatis dari bahasa Inggris. Perbaikan melalui PR sangat diterima — lihat [panduan kontribusi terjemahan](../README.md).

# Memulai

Panduan ini membawa Anda dari nol hingga instance Lore Context yang berjalan dengan memori yang ditulis,
konteks yang dikueri, dan dashboard yang dapat diakses. Rencanakan sekitar 15 menit total, sekitar 5 menit untuk jalur
inti.

## Prasyarat

- **Node.js** `>=22` (gunakan `nvm`, `mise`, atau manajer paket distro Anda)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (Opsional) **Docker + Docker Compose** untuk jalur Postgres+pgvector
- (Opsional) **psql** jika Anda lebih suka menerapkan skema sendiri

## 1. Clone dan install

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Jika `pnpm test` tidak hijau, jangan lanjutkan — buka isu dengan log kegagalan.

## 2. Buat secret nyata

Lore Context menolak untuk memulai dalam produksi dengan nilai placeholder. Buat kunci nyata
bahkan untuk pengembangan lokal agar kebiasaan Anda tetap konsisten.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Untuk pengaturan lokal multi-peran:

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

## 3. Jalankan API (berbasis file, tanpa database)

Jalur paling sederhana menggunakan file JSON lokal sebagai backend penyimpanan. Cocok untuk pengembangan solo
dan pengujian asap.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Di shell lain, verifikasi kesehatan:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Diharapkan: `{"status":"ok",...}`.

## 4. Tulis memori pertama Anda

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

Diharapkan: respons `200` dengan `id` memori baru dan `governance.state` berupa `active` atau
`candidate` (yang terakhir jika konten cocok dengan pola risiko seperti secret).

## 5. Susun konteks

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

Anda seharusnya melihat memori Anda dikutip dalam array `evidence.memory`, ditambah `traceId` yang
dapat Anda gunakan nanti untuk memeriksa perutean dan umpan balik.

## 6. Jalankan dashboard

Di terminal baru:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Buka http://127.0.0.1:3001 di browser Anda. Browser akan meminta kredensial Basic Auth.
Setelah terautentikasi, dashboard merender inventaris memori, jejak, hasil eval,
dan antrian tinjauan tata kelola.

## 7. (Opsional) Hubungkan Claude Code melalui MCP

Tambahkan ini ke bagian server MCP di `claude_desktop_config.json` Claude Code:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<tempel $LORE_API_KEY Anda di sini>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Mulai ulang Claude Code. Alat MCP Lore Context (`context_query`, `memory_write`, dll.)
menjadi tersedia.

Untuk IDE agen lainnya (Cursor, Qwen, Dify, FastGPT, dll.), lihat matriks integrasi di
[docs/integrations/README.md](../../integrations/README.md).

## 8. (Opsional) Beralih ke Postgres + pgvector

Ketika Anda sudah melampaui penyimpanan file JSON:

```bash
docker compose up -d postgres
pnpm db:schema   # menerapkan apps/api/src/db/schema.sql melalui psql
```

Kemudian jalankan API dengan `LORE_STORE_DRIVER=postgres`:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Jalankan `pnpm smoke:postgres` untuk memverifikasi bahwa round-trip tulis-mulai ulang-baca berhasil.

## 9. (Opsional) Seed dataset demo dan jalankan eval

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

Laporan eval tersimpan di `output/eval-reports/` sebagai Markdown dan JSON.

## Langkah Selanjutnya

- **Penerapan produksi** — [docs/deployment/README.md](../../deployment/README.md)
- **Referensi API** — [docs/api-reference.md](../../api-reference.md)
- **Penyelaman mendalam arsitektur** — [docs/architecture.md](../../architecture.md)
- **Alur kerja tinjauan tata kelola** — lihat bagian `Alur Tata Kelola` di
  [docs/architecture.md](../../architecture.md)
- **Portabilitas memori (MIF)** — `pnpm --filter @lore/mif test` menampilkan contoh round-trip
- **Berkontribusi** — [CONTRIBUTING.md](../../../CONTRIBUTING.md)

## Jebakan Umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Proses lain menggunakan port 3000 | `lsof -i :3000` untuk menemukannya; atau atur `PORT=3010` |
| `503 Dashboard Basic Auth not configured` | Mode produksi tanpa `DASHBOARD_BASIC_AUTH_USER/PASS` | Ekspor variabel env atau lewatkan `LORE_DASHBOARD_DISABLE_AUTH=1` (hanya dev) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Env apa pun cocok dengan `admin-local` / `change-me` / `demo` dll | Buat nilai nyata melalui `openssl rand -hex 32` |
| `429 Too Many Requests` | Batas laju terpicu | Tunggu jendela pendinginan (default 30 detik setelah 5 kegagalan autentikasi); atau atur `LORE_RATE_LIMIT_DISABLED=1` dalam dev |
| `agentmemory adapter unhealthy` | Runtime agentmemory lokal tidak berjalan | Jalankan agentmemory atau atur `LORE_AGENTMEMORY_REQUIRED=0` untuk lewati diam |
| Klien MCP melihat `-32602 Invalid params` | Masukan alat gagal validasi skema zod | Periksa array `invalid_params` dalam body kesalahan |
| Dashboard 401 di setiap halaman | Kredensial Basic Auth salah | Ekspor ulang variabel env dan mulai ulang proses dashboard |

## Mendapatkan Bantuan

- Ajukan bug: https://github.com/Lore-Context/lore-context/issues
- Pengungkapan keamanan: lihat [SECURITY.md](../../../SECURITY.md)
- Kontribusi dokumentasi: lihat [CONTRIBUTING.md](../../../CONTRIBUTING.md)
