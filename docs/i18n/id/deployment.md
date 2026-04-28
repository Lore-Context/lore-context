> 🤖 Dokumen ini diterjemahkan secara otomatis dari bahasa Inggris. Perbaikan melalui PR sangat diterima — lihat [panduan kontribusi terjemahan](../README.md).

# Penerapan Privat

> **Buat kunci dengan `openssl rand -hex 32` — jangan gunakan placeholder di bawah ini dalam produksi.**

Bagian ini mengemas Lore untuk demo privat atau peluncuran tim internal tanpa mengubah jalur kode aplikasi. Bundle penerapan terdiri dari:

- `apps/api/Dockerfile`: image REST API.
- `apps/dashboard/Dockerfile`: image dashboard Next.js mandiri.
- `Dockerfile`: image peluncur MCP opsional untuk klien stdio.
- `docs/deployment/compose.private-demo.yml`: tumpukan compose siap-pakai untuk Postgres, API, dashboard, dan layanan MCP sesuai permintaan.
- `examples/demo-dataset/**`: data seed untuk alur file-store, impor, dan eval.

## Topologi yang Direkomendasikan

- `postgres`: penyimpanan tahan lama untuk demo bersama atau multi-operator.
- `api`: Lore REST API pada jaringan bridge internal, diterbitkan ke loopback secara default.
- `dashboard`: UI operator, diterbitkan ke loopback secara default dan mem-proxy ke API melalui `LORE_API_URL`.
- `mcp`: container stdio opsional untuk operator Claude, Cursor, dan Qwen yang menginginkan peluncur yang dikontainerkan alih-alih `node apps/mcp-server/dist/index.js` di host.

Tumpukan compose dengan sengaja menjaga paparan publik seminimal mungkin. Postgres, API, dan dashboard semuanya terikat ke `127.0.0.1` secara default melalui pemetaan port yang dapat dikonfigurasi.

## Pemeriksaan Awal

1. Salin `.env.example` ke file runtime privat seperti `.env.private`.
2. Ganti `POSTGRES_PASSWORD`.
3. Utamakan `LORE_API_KEYS` daripada satu `LORE_API_KEY`.
4. Atur `DASHBOARD_LORE_API_KEY` ke kunci `admin` untuk alur kerja operator penuh, atau ke kunci `reader` scoped untuk demo hanya-baca. Atur `MCP_LORE_API_KEY` ke kunci `writer` atau `reader` tergantung apakah klien harus memutasi memori.

Contoh pemisahan peran:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
```

## Jalankan Tumpukan

Build dan jalankan tumpukan demo privat dari root repositori:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Pemeriksaan kesehatan:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Seed Data Demo

Untuk tumpukan compose berbasis Postgres, impor memori demo yang dikemas setelah API sehat:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Jalankan permintaan eval yang dikemas:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Jika Anda menginginkan demo host tunggal tanpa database, arahkan API ke snapshot file-store:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## Pola Peluncur MCP

Pola yang diutamakan:

- Jalankan peluncur MCP dekat dengan klien.
- Arahkan `LORE_API_URL` ke URL API privat.
- Berikan kunci API terkecil yang sesuai kepada peluncur.

Peluncur berbasis host:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Peluncur yang dikontainerkan:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

Peluncur yang dikontainerkan berguna untuk pengaturan workstation yang dapat direproduksi, tetapi ini masih merupakan proses stdio, bukan layanan jaringan publik yang berjalan lama.

## Default Keamanan

- Jaga `API_BIND_HOST`, `DASHBOARD_BIND_HOST`, dan `POSTGRES_BIND_HOST` pada `127.0.0.1` kecuali reverse proxy yang terautentikasi sudah ada di depan tumpukan.
- Utamakan `LORE_API_KEYS` dengan pemisahan `reader` / `writer` / `admin` alih-alih menggunakan ulang satu kunci admin global di mana saja.
- Gunakan kunci scoped proyek untuk klien demo. ID proyek demo yang dikemas adalah `demo-private`.
- Jaga `AGENTMEMORY_URL` pada loopback dan jangan mengekspos `agentmemory` mentah secara langsung.
- Biarkan `LORE_AGENTMEMORY_REQUIRED=0` kecuali penerapan privat benar-benar bergantung pada runtime agentmemory yang aktif.
- Jaga `LORE_POSTGRES_AUTO_SCHEMA=true` hanya untuk lingkungan internal yang terkontrol. Setelah bootstrapping skema menjadi bagian dari proses rilis Anda, Anda dapat menguncinya ke `false`.

## File untuk Digunakan Ulang

- Contoh Compose: [compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- Image API: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Image Dashboard: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- Image MCP: [Dockerfile](../../../Dockerfile)
- Data demo: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
