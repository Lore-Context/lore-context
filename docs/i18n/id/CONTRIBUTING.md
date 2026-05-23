> 🤖 Dokumen ini diterjemahkan secara otomatis dari bahasa Inggris. Perbaikan melalui PR sangat diterima — lihat [panduan kontribusi terjemahan](../README.md).

# Berkontribusi ke Lore Context

Terima kasih telah meningkatkan Lore Context. Proyek ini adalah panel kontrol konteks agen AI tahap alpha, sehingga perubahan harus mempertahankan operasi lokal-utama, kemampuan audit, dan keamanan penerapan.

## Kode Etik

Proyek ini mengikuti [Contributor Covenant](../../CODE_OF_CONDUCT.md). Dengan berpartisipasi
Anda setuju untuk mematuhinya.

## Pengaturan Pengembangan

Persyaratan:

- Node.js 22 atau lebih baru
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (Opsional) Docker untuk jalur Postgres
- (Opsional) `psql` jika Anda lebih suka menerapkan skema sendiri

Perintah umum:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # memerlukan docker compose up -d postgres
pnpm run doctor
```

Untuk pekerjaan per-paket:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore-context/server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Ekspektasi Pull Request

- **Pertahankan perubahan yang terfokus dan dapat dibalik.** Satu masalah per PR; satu PR per masalah.
- **Tambahkan tes** untuk perubahan perilaku. Utamakan assertion nyata daripada snapshot.
- **Jalankan `pnpm build` dan `pnpm test`** sebelum meminta tinjauan. CI juga menjalankannya,
  tetapi secara lokal lebih cepat.
- **Jalankan tes asap yang relevan** saat mengubah perilaku API, dashboard, MCP, Postgres,
  impor/ekspor, eval, atau penerapan.
- **Jangan commit** output build yang dihasilkan, penyimpanan lokal, file `.env`,
  kredensial, atau data pelanggan privat. `.gitignore` mencakup sebagian besar jalur;
  jika Anda membuat artefak baru, pastikan artefak tersebut dikecualikan.
- **Tetap dalam cakupan PR Anda.** Jangan refaktor kode yang tidak terkait secara sambil lalu.

## Penjaga Arsitektur

Ini tidak dapat dinegosiasikan untuk v0.4.x. Jika PR melanggar salah satunya, harapkan permintaan untuk
membagi atau mengerjakan ulang:

- **Lokal-utama tetap primer.** Fitur baru harus bekerja tanpa layanan yang dihosting
  atau ketergantungan SaaS pihak ketiga.
- **Tidak ada bypass permukaan autentikasi baru.** Setiap rute tetap dijaga oleh kunci API + peran.
  Loopback bukan kasus khusus dalam produksi.
- **Tidak ada paparan `agentmemory` mentah.** Pemanggil eksternal mengakses memori hanya melalui endpoint Lore.
- **Integritas log audit.** Setiap mutasi yang memengaruhi status memori menulis entri audit.
- **Gagal tertutup pada konfigurasi yang hilang.** Startup mode produksi menolak untuk memulai jika
  variabel env yang diperlukan adalah placeholder atau tidak ada.

## Pesan Commit

Lore Context menggunakan format commit kecil yang beropini, terinspirasi oleh panduan
kernel Linux.

### Format

```text
<type>: <ringkasan singkat dalam suasana imperatif>

<isi opsional yang menjelaskan mengapa perubahan ini diperlukan dan tradeoff apa yang berlaku>

<trailer opsional>
```

### Tipe

- `feat` — kemampuan baru yang terlihat pengguna atau endpoint API
- `fix` — perbaikan bug
- `refactor` — restrukturisasi kode tanpa perubahan perilaku
- `chore` — kebersihan repositori (dependensi, tooling, pemindahan file)
- `docs` — hanya dokumentasi
- `test` — perubahan hanya tes
- `perf` — peningkatan performa dengan dampak yang terukur
- `revert` — pembalikan commit sebelumnya

### Gaya

- **Huruf kecil** untuk tipe dan kata pertama ringkasan.
- **Tanpa titik akhir** pada baris ringkasan.
- **≤72 karakter** pada baris ringkasan; bungkus isi pada 80.
- **Suasana imperatif**: "fix loopback bypass", bukan "fixed" atau "fixes".
- **Mengapa lebih dari apa**: diff menunjukkan apa yang berubah; isi harus menjelaskan mengapa.
- **Jangan sertakan** trailer `Co-Authored-By`, atribusi AI, atau
  baris signed-off-by kecuali secara eksplisit diminta oleh pengguna.

### Trailer yang Berguna

Jika relevan, tambahkan trailer untuk menangkap batasan dan konteks peninjau:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### Contoh

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

## Granularitas Commit

- Satu perubahan logis per commit. Peninjau dapat membalik secara atomis tanpa
  kerusakan kolateral.
- Gabungkan perbaikan sepele (`typo`, `lint`, `prettier`) ke dalam commit induk
  sebelum membuka atau memperbarui PR.
- Refaktor multi-file boleh dalam satu commit jika memiliki satu alasan tunggal.

## Proses Tinjauan

- Pengelola akan meninjau PR Anda dalam 7 hari selama aktivitas normal.
- Tangani semua komentar pemblokir sebelum meminta tinjauan ulang.
- Untuk komentar non-pemblokir, membalas secara inline dengan alasan atau isu tindak lanjut
  dapat diterima.
- Pengelola dapat menambahkan label `merge-queue` setelah PR disetujui; jangan
  melakukan rebase atau force-push setelah label tersebut diterapkan.

## Terjemahan Dokumentasi

Jika Anda ingin meningkatkan README atau file dokumentasi yang diterjemahkan, lihat
[panduan kontributor i18n](../README.md).

## Melaporkan Bug

- Ajukan isu publik di https://github.com/Lore-Context/lore-context/issues
  kecuali bug tersebut adalah kerentanan keamanan.
- Untuk masalah keamanan, ikuti [SECURITY.md](../../../SECURITY.md).
- Sertakan: versi atau commit, lingkungan, reproduksi, yang diharapkan vs aktual,
  log (dengan konten sensitif yang diredaksi).

## Terima Kasih

Lore Context adalah proyek kecil yang berusaha melakukan sesuatu yang berguna untuk
infrastruktur agen AI. Setiap PR yang terfokus dengan baik memajukannya.
