> 🤖 Dokumen ini diterjemahkan secara otomatis dari bahasa Inggris. Perbaikan melalui PR sangat diterima — lihat [panduan kontribusi terjemahan](../README.md).

# Changelog

Semua perubahan penting pada Lore Context didokumentasikan di sini. Format ini didasarkan pada
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) dan proyek ini
mengikuti [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [v0.4.0-alpha] — 2026-04-28

Alpha publik pertama. Menutup sprint pengerasan produksi yang mengubah MVP yang gagal audit
menjadi alpha kandidat rilis. Semua item audit P0 telah dibersihkan, 12 dari 13 item P1
dibersihkan (satu parsial — lihat Catatan), 117+ tes lulus, build monorepo penuh bersih.

### Ditambahkan

- **`packages/eval/src/runner.ts`** — `EvalRunner` nyata (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). Eval kini dapat menjalankan evaluasi pengambilan end-to-end terhadap
  dataset milik pengguna dan menyimpan hasil sebagai JSON untuk deteksi regresi lintas waktu.
- **`packages/governance/src/state.ts`** — mesin status tata kelola enam status
  (`candidate / active / flagged / redacted / superseded / deleted`) dengan tabel transisi legal eksplisit.
  Transisi ilegal melempar pengecualian.
- **`packages/governance/src/audit.ts`** — pembantu append log audit yang tidak dapat diubah, terintegrasi
  dengan tipe `AuditLog` dari `@lore/shared`.
- **`packages/governance/detectPoisoning`** — heuristik untuk deteksi keracunan memori
  menggunakan dominasi sumber yang sama (>80%) dan pencocokan pola kata kerja imperatif.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — pemeriksaan versi upstream
  berbasis semver dengan perbandingan buatan sendiri (tanpa dependensi baru). Menghormati
  `LORE_AGENTMEMORY_REQUIRED=0` untuk mode terdegradasi diam.
- **`packages/mif`** — bidang `supersedes: string[]` dan `contradicts: string[]` ditambahkan
  ke `LoreMemoryItem`. Round-trip dipertahankan di seluruh format JSON dan Markdown.
- **`apps/api/src/logger.ts`** — logger JSON terstruktur dengan redaksi otomatis bidang
  sensitif (`content` / `query` / `memory` / `value` / `password` / `secret` /
  `token` / `key`). `requestId` mengalir melalui setiap permintaan.
- **`apps/dashboard/middleware.ts`** — middleware HTTP Basic Auth. Startup produksi
  menolak untuk memulai tanpa `DASHBOARD_BASIC_AUTH_USER` dan `DASHBOARD_BASIC_AUTH_PASS`.
- **`scripts/check-env.mjs`** — validator env mode produksi. Menolak untuk memulai
  aplikasi jika ada nilai lingkungan yang cocok dengan pola placeholder (`read-local`,
  `write-local`, `admin-local`, `change-me`, `demo`, `test`, `dev`, `password`).
- **Batas laju** — pembatas token ember ganda per-IP dan per-kunci dengan backoff kegagalan
  autentikasi (5 kegagalan dalam 60 detik → penguncian 30 detik → respons 429). Dapat dikonfigurasi melalui
  `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`, `LORE_RATE_LIMIT_DISABLED`.
- **Pematian terkendali** — handler SIGTERM/SIGINT menguras permintaan yang sedang berlangsung hingga 10 detik,
  menyiram penulisan Postgres yang tertunda, menutup pool, keluar paksa pada 15 detik.
- **Indeks database** — indeks B-tree pada `(project_id)` / `(status)` /
  `(created_at)` untuk `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs`. Indeks GIN pada jsonb `content` dan `metadata`.
- **Validasi masukan MCP zod** — setiap alat MCP kini menjalankan `safeParse` terhadap
  skema zod per-alat; kegagalan mengembalikan JSON-RPC `-32602` dengan isu yang telah disanitasi.
- **`destructiveHint` MCP + `reason` wajib** — setiap alat yang bermutasi
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) memerlukan
  `reason` minimal 8 karakter dan menampilkan `destructiveHint: true`.
- 117+ kasus uji baru di `apps/api`, `apps/mcp-server`, `packages/eval`,
  `packages/governance`, `packages/mif`, `packages/agentmemory-adapter`.
- Dokumentasi multibahasa: README dalam 17 bahasa di bawah `docs/i18n/<lang>/`.
- `CHANGELOG.md` (file ini).
- `docs/getting-started.md` — panduan mulai cepat pengembang 5 menit.
- `docs/api-reference.md` — referensi endpoint REST API.
- `docs/i18n/README.md` — panduan kontributor terjemahan.

### Diubah

- Versi envelope **`packages/mif`** `"0.1"` → `"0.2"`. Impor kompatibel ke belakang.
- Default **`LORE_POSTGRES_AUTO_SCHEMA`** `true` → `false`. Penerapan produksi
  harus memilih secara eksplisit untuk penerapan skema otomatis atau menjalankan `pnpm db:schema`.
- Parser body permintaan **`apps/api`** kini streaming dengan batas ukuran muatan yang ketat
  (`LORE_MAX_JSON_BYTES`, default 1 MiB). Permintaan terlalu besar mengembalikan 413.
- **Autentikasi loopback** diubah: menghapus ketergantungan pada header URL `Host`; deteksi loopback
  kini hanya menggunakan `req.socket.remoteAddress`. Dalam produksi tanpa kunci API
  yang dikonfigurasi, API gagal tertutup dan menolak permintaan (sebelumnya: diam-diam memberikan admin).
- **Kunci API scoped** kini harus menyediakan `project_id` untuk `/v1/memory/list`,
  `/v1/eval/run`, dan `/v1/memory/import` (sebelumnya: `project_id` yang tidak terdefinisi memotong jalur).
- **Semua Dockerfile** kini berjalan sebagai pengguna `node` non-root. `apps/api/Dockerfile` dan
  `apps/dashboard/Dockerfile` mendeklarasikan `HEALTHCHECK`.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` kini menggunakan `${POSTGRES_PASSWORD:?must
  be set}` — startup gagal cepat tanpa kata sandi eksplisit.
- **`docs/deployment/compose.private-demo.yml`** — pola wajib-atau-gagal yang sama.
- **`.env.example`** — semua default demo dihapus dan diganti dengan placeholder `# REQUIRED`.
  Variabel baru didokumentasikan untuk batas laju, timeout permintaan, batas muatan,
  mode wajib agentmemory, basic auth dashboard.

### Diperbaiki

- **Kerentanan bypass autentikasi loopback** (P0). Penyerang dapat mengirim `Host: 127.0.0.1`
  untuk memalsukan deteksi loopback dan mendapatkan peran admin tanpa kunci API.
- **Confused-deputy pada proxy dashboard** (P0). Proxy dashboard menyuntikkan
  `LORE_API_KEY` untuk permintaan yang tidak terautentikasi, memberikan kekuatan admin kepada siapa pun yang dapat
  menjangkau port 3001.
- **Pertahanan brute-force** (P0). Kunci demo (`admin-local`, `read-local`, `write-local`)
  yang ditampilkan di README/`.env.example` dapat dienumerasi tanpa batas; batas laju dan
  penghapusan default kini melindungi dari ini.
- **Crash parse JSON pada `LORE_API_KEYS` yang cacat** — proses kini keluar dengan kesalahan yang jelas
  alih-alih melempar stack trace.
- **OOM via body permintaan besar** — body di atas batas yang dikonfigurasi kini mengembalikan 413
  alih-alih menyebabkan crash proses Node.
- **Kebocoran kesalahan MCP** — kesalahan API upstream yang menyertakan SQL mentah, jalur file, atau
  stack trace kini disanitasi menjadi `{code, pesan-generik}` sebelum mencapai klien MCP.
- **Crash parse JSON dashboard** — respons JSON tidak valid tidak lagi menyebabkan crash UI;
  kesalahan ditampilkan sebagai status yang terlihat pengguna.
- **`memory_update` / `memory_supersede` MCP** sebelumnya tidak memerlukan
  `reason`; ini kini ditegakkan oleh skema zod.
- **Pool Postgres**: `statement_timeout` kini diatur ke 15 detik; sebelumnya risiko waktu kueri tidak terbatas
  pada kueri jsonb yang cacat.

### Keamanan

- Semua temuan audit P0 (bypass loopback / autentikasi dashboard / batas laju / secret demo)
  dibersihkan. Lihat public release notes untuk jejak audit lengkap.
- `pnpm audit --prod` melaporkan nol kerentanan yang diketahui pada saat rilis.
- Kredensial demo dihapus dari semua template penerapan dan README contoh.
- Image container kini berjalan sebagai non-root secara default.

### Catatan / Keterbatasan yang diketahui

- **P1-1 Parsial**: `/v1/context/query` mempertahankan perilaku kunci scoped yang permisif untuk
  menghindari kerusakan pada tes konsumen yang ada. Rute lain yang terpengaruh (`/v1/memory/list`,
  `/v1/eval/run`, `/v1/memory/import`) menegakkan `project_id`. Dilacak untuk v0.5.
- **Sinkronisasi cloud multi-penyewa yang dihosting** tidak diimplementasikan dalam v0.4.0-alpha. Hanya penerapan
  lokal dan Compose-privat.
- **Kualitas terjemahan**: Lokalisasi README dihasilkan oleh LLM dan diberi label dengan jelas;
  PR komunitas untuk menyempurnakan setiap lokal sangat disambut (lihat
  [`docs/i18n/README.md`](../README.md)).
- **Spesifikasi OpenAPI / Swagger** belum dikemas. Antarmuka REST didokumentasikan dalam
  prosa di [`docs/api-reference.md`](../../api-reference.md). Dilacak untuk v0.5.

### Ucapan Terima Kasih

Rilis ini adalah hasil sprint pengerasan produksi satu hari yang melibatkan
eksekusi sub-agen paralel terhadap rencana audit terstruktur. Rencana dan artefak audit

## [v0.0.0] — pra-rilis

Tonggak pengembangan internal, tidak dirilis secara publik. Diimplementasikan:

- Kerangka paket workspace (monorepo TypeScript, workspace pnpm).
- Pipeline build/test TypeScript bersama.
- Sistem tipe memori / konteks / eval / audit di `@lore/shared`.
- Batas adapter `agentmemory`.
- REST API lokal dengan router dan komposer konteks.
- Persistensi file JSON + penyimpanan runtime Postgres opsional dengan upsert inkremental.
- Alur detail / edit / supersede / forget memori dengan penghapusan keras eksplisit.
- Akuntansi penggunaan memori nyata (`useCount`, `lastUsedAt`).
- Umpan balik jejak (`useful` / `wrong` / `outdated` / `sensitive`).
- Impor/ekspor JSON + Markdown seperti MIF dengan bidang tata kelola.
- Set regex pemindaian secret.
- Metrik eval berbasis sesi langsung; eval perbandingan penyedia; daftar eval run.
- Perlindungan kunci API dengan pemisahan peran reader/writer/admin.
- Antrian tinjauan tata kelola; API log audit.
- Dashboard HTML yang disajikan API; dashboard Next.js mandiri.
- Data seed demo; pembuatan konfigurasi integrasi.
- Kemasan Docker/Compose privat.
- Transport MCP stdio legacy + SDK resmi.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
