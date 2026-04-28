> 🤖 Dokumen ini diterjemahkan secara otomatis dari bahasa Inggris. Perbaikan melalui PR sangat diterima — lihat [panduan kontribusi terjemahan](../README.md).

# Kebijakan Keamanan

Lore Context menangani memori, jejak, log audit, dan kredensial integrasi. Perlakukan
laporan keamanan sebagai prioritas tinggi.

## Melaporkan Kerentanan

Jangan membuka isu publik untuk kerentanan yang dicurigai, secret yang bocor, bypass
autentikasi, paparan data, atau masalah isolasi penyewa.

Jalur pelaporan yang diutamakan:

1. Gunakan **pelaporan kerentanan privat GitHub** untuk repositori ini jika tersedia.
2. Jika pelaporan privat tidak tersedia, hubungi pengelola secara privat dan
   sertakan:
   - versi atau commit yang terpengaruh,
   - langkah reproduksi,
   - dampak yang diperkirakan,
   - apakah ada secret nyata atau data pribadi yang terlibat.

Kami bertujuan untuk mengakui laporan yang kredibel dalam waktu 72 jam.

## Versi yang Didukung

Lore Context saat ini adalah perangkat lunak alpha pra-1.0. Perbaikan keamanan menargetkan cabang `main`
terlebih dahulu. Rilis yang diberi tag dapat menerima patch khusus ketika rilis publik
aktif digunakan oleh operator hilir.

| Versi | Didukung |
|---|---|
| v0.4.x-alpha | ✅ Aktif |
| v0.3.x dan sebelumnya | ❌ Hanya internal pra-rilis |

## Pengerasan Bawaan (v0.4.0-alpha)

Alpha ini dikirimkan dengan kontrol defense-in-depth berikut. Operator harus
memverifikasi bahwa kontrol ini aktif dalam penerapan mereka.

### Autentikasi

- **Token bearer kunci API** (`Authorization: Bearer <key>` atau
  header `x-lore-api-key`).
- **Pemisahan peran**: `reader` / `writer` / `admin`.
- **Cakupan per-proyek**: entri JSON `LORE_API_KEYS` dapat menyertakan
  daftar izin `projectIds: ["..."]`; mutasi memerlukan `project_id` yang cocok.
- **Mode kunci kosong gagal tertutup dalam produksi**: dengan `NODE_ENV=production` dan tanpa
  kunci yang dikonfigurasi, API menolak semua permintaan.
- **Bypass loopback dihapus**: versi sebelumnya mempercayai `Host: 127.0.0.1`; v0.4 menggunakan
  alamat remote tingkat socket saja.

### Batas Laju

- **Pembatas ember ganda per-IP dan per-kunci** dengan backoff kegagalan autentikasi.
- **Default**: 60 req/mnt per IP untuk jalur tidak terautentikasi, 600 req/mnt per kunci terautentikasi.
- **5 kegagalan autentikasi dalam 60 detik → penguncian 30 detik** (mengembalikan 429).
- Dapat dikonfigurasi: `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED=1` (hanya dev).

### Perlindungan Dashboard

- **Middleware HTTP Basic Auth** (`apps/dashboard/middleware.ts`).
- **Startup produksi menolak untuk memulai** tanpa
  `DASHBOARD_BASIC_AUTH_USER` dan `DASHBOARD_BASIC_AUTH_PASS`.
- `LORE_DASHBOARD_DISABLE_AUTH=1` hanya dihormati di luar produksi.
- Fallback kunci admin sisi server **dihapus**: pengguna harus terautentikasi melalui
  Basic Auth sebelum proxy dashboard menyuntikkan kredensial API upstream.

### Pengerasan Container

- Semua Dockerfile berjalan sebagai pengguna `node` non-root.
- `apps/api/Dockerfile` dan `apps/dashboard/Dockerfile` mendeklarasikan `HEALTHCHECK`
  terhadap `/health`.
- `apps/mcp-server` hanya stdio — tanpa listener jaringan — dan tidak mendeklarasikan
  `HEALTHCHECK`.

### Manajemen Secret

- **Nol kredensial yang dikodekan keras.** Semua default `docker-compose.yml`,
  `docs/deployment/compose.private-demo.yml`, dan `.env.example` menggunakan
  bentuk `${VAR:?must be set}` — startup gagal cepat tanpa nilai eksplisit.
- `scripts/check-env.mjs` menolak nilai placeholder
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`,
  `dev`, `password`) ketika `NODE_ENV=production`.
- Semua dokumen penerapan dan README contoh telah dibersihkan dari kredensial demo literal.

### Tata Kelola

- **Pemindaian tag risiko pada setiap penulisan memori**: kunci API, kunci AWS, token JWT,
  kunci privat, kata sandi, email, nomor telepon terdeteksi.
- **Mesin status enam tahap** dengan tabel transisi legal eksplisit; transisi ilegal melempar.
- **Heuristik keracunan memori**: dominasi sumber yang sama + pencocokan pola kata kerja imperatif
  → flag `suspicious`.
- **Log audit yang tidak dapat diubah** ditambahkan pada setiap transisi status.
- Konten berisiko tinggi secara otomatis dirutekan ke `candidate` / `flagged` dan ditahan dari
  komposisi konteks hingga ditinjau.

### Pengerasan MCP

- Setiap masukan alat MCP **divalidasi terhadap skema zod** sebelum dipanggil.
  Kegagalan validasi mengembalikan JSON-RPC `-32602` dengan daftar isu yang telah disanitasi.
- **Semua alat yang bermutasi** memerlukan string `reason` minimal 8 karakter dan
  menampilkan `destructiveHint: true` dalam skema mereka.
- Kesalahan API upstream **disanitasi** sebelum dikembalikan ke klien MCP —
  SQL mentah, jalur file, dan stack trace dibersihkan.

### Pencatatan

- **Output JSON terstruktur** dengan korelasi `requestId` di seluruh rantai handler.
- **Redaksi otomatis** bidang yang cocok dengan `content`, `query`, `memory`, `value`,
  `password`, `secret`, `token`, `key`. Konten aktual rekaman memori dan
  kueri tidak pernah ditulis ke log.

### Batas Data

- Adapter `agentmemory` memeriksa versi upstream saat inisialisasi dan memperingatkan jika
  tidak kompatibel. `LORE_AGENTMEMORY_REQUIRED=0` mengalihkan adapter ke mode terdegradasi diam
  jika upstream tidak dapat dijangkau.
- Parser body permintaan `apps/api` menegakkan batas `LORE_MAX_JSON_BYTES` (default 1
  MiB); permintaan terlalu besar mengembalikan 413.
- Pool koneksi Postgres mengatur `statement_timeout: 15000` untuk membatasi waktu kueri.
- `LORE_REQUEST_TIMEOUT_MS` (default 30 detik) membatasi setiap handler permintaan;
  timeout mengembalikan 504.

## Panduan Penerapan

- Jangan mengekspos Lore dari jarak jauh tanpa `LORE_API_KEYS` yang dikonfigurasi.
- Utamakan kunci `reader` / `writer` / `admin` yang **terpisah peran**.
- **Selalu atur** `DASHBOARD_BASIC_AUTH_USER` dan `DASHBOARD_BASIC_AUTH_PASS` dalam
  produksi.
- **Buat kunci dengan `openssl rand -hex 32`**. Jangan pernah menggunakan nilai placeholder
  yang ditampilkan dalam contoh.
- Jaga endpoint `agentmemory` mentah tetap privat; akses hanya melalui Lore.
- Jaga dashboard, tata kelola, impor/ekspor, sinkronisasi, dan rute audit di balik lapisan
  kontrol akses jaringan (Cloudflare Access, AWS ALB, Tailscale ACL,
  sejenisnya) untuk paparan non-loopback apa pun.
- **Jalankan `node scripts/check-env.mjs` sebelum memulai API dalam produksi.**
- **Jangan pernah commit** file `.env` produksi, kunci API penyedia, kredensial cloud,
  data eval yang berisi konten pelanggan, atau ekspor memori privat.

## Timeline Pengungkapan

Untuk kerentanan berdampak tinggi yang dikonfirmasi:

- 0 hari: laporan diakui.
- 7 hari: triase dan klasifikasi tingkat keparahan dibagikan kepada pelapor.
- 30 hari: pengungkapan publik terkoordinasi (atau diperpanjang dengan persetujuan bersama).
- 30+ hari: penerbitan CVE untuk tingkat keparahan menengah ke atas jika berlaku.

Untuk masalah tingkat keparahan lebih rendah, harapkan resolusi dalam rilis minor berikutnya.

## Roadmap Pengerasan

Item yang direncanakan untuk rilis berikutnya:

- **v0.5**: Spesifikasi OpenAPI / Swagger; integrasi CI dari `pnpm audit --high`,
  analisis statis CodeQL, dan dependabot.
- **v0.6**: Image container bertanda tangan Sigstore, provenance SLSA, penerbitan npm melalui
  GitHub OIDC alih-alih token berumur panjang.
- **v0.7**: Enkripsi saat istirahat untuk konten memori yang diberi flag `risk_tags` melalui enkripsi
  envelope KMS.
