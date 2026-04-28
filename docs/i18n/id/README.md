<div align="center">

> 🤖 Dokumen ini diterjemahkan secara otomatis dari bahasa Inggris. Perbaikan melalui PR sangat diterima — lihat [panduan kontribusi terjemahan](../README.md).

# Lore Context

**Panel kontrol untuk memori, eval, dan tata kelola agen AI.**

Ketahui apa yang diingat, digunakan, dan seharusnya dilupakan oleh setiap agen — sebelum memori menjadi risiko produksi.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Memulai](../../getting-started.md) · [Referensi API](../../api-reference.md) · [Arsitektur](../../architecture.md) · [Integrasi](../../integrations/README.md) · [Penerapan](../../deployment/README.md) · [Changelog](../../../CHANGELOG.md)

🌐 **Baca dalam bahasa Anda**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](./README.md)

</div>

---

## Apa itu Lore Context

Lore Context adalah **panel kontrol open-core** untuk memori agen AI: menyusun konteks dari memori, pencarian, dan jejak alat; mengevaluasi kualitas pengambilan data pada dataset milik Anda sendiri; merutekan tinjauan tata kelola untuk konten sensitif; dan mengekspor memori sebagai format pertukaran portabel yang dapat dipindahkan antar backend.

Lore Context tidak berusaha menjadi database memori lain. Nilai uniknya terletak pada apa yang ada di atas memori:

- **Context Query** — satu endpoint yang menyusun memori + web + repo + jejak alat, mengembalikan blok konteks berperingkat beserta asal-usulnya.
- **Memory Eval** — menjalankan Recall@K, Precision@K, MRR, stale-hit-rate, latensi p95 pada dataset yang Anda miliki; menyimpan hasil dan membandingkannya untuk deteksi regresi.
- **Governance Review** — siklus hidup enam status (`candidate / active / flagged / redacted / superseded / deleted`), pemindaian tag risiko, heuristik keracunan, log audit yang tidak dapat diubah.
- **Portabilitas seperti MIF** — ekspor/impor JSON + Markdown yang mempertahankan `provenance / validity / confidence / source_refs / supersedes / contradicts`. Berfungsi sebagai format migrasi antar backend memori.
- **Multi-Agent Adapter** — integrasi `agentmemory` kelas satu dengan pemeriksaan versi + fallback mode terdegradasi; kontrak adapter yang bersih untuk runtime tambahan.

## Kapan menggunakannya

| Gunakan Lore Context ketika... | Gunakan database memori (agentmemory, Mem0, Supermemory) ketika... |
|---|---|
| Anda perlu **membuktikan** apa yang diingat agen Anda, mengapa, dan apakah itu digunakan | Anda hanya butuh penyimpanan memori mentah |
| Anda menjalankan beberapa agen (Claude Code, Cursor, Qwen, Hermes, Dify) dan menginginkan konteks bersama yang terpercaya | Anda membangun satu agen dan tidak keberatan dengan lapisan memori yang terikat vendor |
| Anda memerlukan penerapan lokal atau privat untuk kepatuhan | Anda lebih suka SaaS yang dihosting |
| Anda membutuhkan eval pada dataset Anda sendiri, bukan benchmark vendor | Benchmark vendor sudah cukup sebagai sinyal |
| Anda ingin memigrasikan memori antar sistem | Anda tidak berencana beralih backend |

## Mulai Cepat

```bash
# 1. Clone + install
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Buat kunci API nyata (jangan gunakan placeholder di lingkungan apa pun selain dev lokal saja)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. Jalankan API (berbasis file, tanpa Postgres)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Tulis memori
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Kueri konteks
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Untuk pengaturan lengkap (Postgres, Docker Compose, Dashboard, integrasi MCP), lihat [docs/getting-started.md](../../getting-started.md).

## Arsitektur

```text
                       ┌─────────────────────────────────────────────┐
   MCP clients ──────► │ apps/api  (REST + auth + rate limit + logs) │
   (Claude Code,       │   ├── context router (memory/web/repo/tool) │
    Cursor, Qwen,      │   ├── context composer                      │
    Dify, Hermes...)   │   ├── governance + audit                    │
                       │   ├── eval runner                           │
                       │   └── MIF import/export                     │
                       └────────┬────────────────────────────────────┘
                                │
                  ┌─────────────┼──────────────────────────┐
                  ▼             ▼                          ▼
           Postgres+pgvector   agentmemory adapter     packages/search
           (incremental        (version-probed,        (BM25 / hybrid
            persistence)        degraded-mode safe)     pluggable)
                                                                 ▲
                       ┌─────────────────────────────┐           │
                       │ apps/dashboard  (Next.js)   │ ──────────┘
                       │   protected by Basic Auth   │
                       │   memory · traces · eval    │
                       │   governance review queue   │
                       └─────────────────────────────┘
```

Untuk detail lebih lanjut, lihat [docs/architecture.md](../../architecture.md).

## Apa yang ada di v0.4.0-alpha

| Kemampuan | Status | Lokasi |
|---|---|---|
| REST API dengan autentikasi kunci API (reader/writer/admin) | ✅ Produksi | `apps/api` |
| Server MCP stdio (transport legacy + SDK resmi) | ✅ Produksi | `apps/mcp-server` |
| Dashboard Next.js dengan gating HTTP Basic Auth | ✅ Produksi | `apps/dashboard` |
| Postgres + pgvector persistensi inkremental | ✅ Opsional | `apps/api/src/db/` |
| Mesin status tata kelola + log audit | ✅ Produksi | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Produksi | `packages/eval` |
| Impor/ekspor MIF v0.2 dengan `supersedes` + `contradicts` | ✅ Produksi | `packages/mif` |
| Adapter `agentmemory` dengan pemeriksaan versi + mode terdegradasi | ✅ Produksi | `packages/agentmemory-adapter` |
| Batas laju (per-IP + per-kunci dengan backoff) | ✅ Produksi | `apps/api` |
| Pencatatan JSON terstruktur dengan redaksi bidang sensitif | ✅ Produksi | `apps/api/src/logger.ts` |
| Penerapan privat Docker Compose | ✅ Produksi | `docker-compose.yml` |
| Dataset demo + pengujian asap + uji UI Playwright | ✅ Produksi | `examples/`, `scripts/` |
| Sinkronisasi cloud multi-penyewa yang dihosting | ⏳ Roadmap | — |

Lihat [CHANGELOG.md](../../../CHANGELOG.md) untuk catatan rilis lengkap v0.4.0-alpha.

## Integrasi

Lore Context mendukung MCP dan REST dan berintegrasi dengan sebagian besar IDE agen dan frontend chat:

| Alat | Panduan pengaturan |
|---|---|
| Claude Code | [docs/integrations/claude-code.md](../../integrations/claude-code.md) |
| Cursor | [docs/integrations/cursor.md](../../integrations/cursor.md) |
| Qwen Code | [docs/integrations/qwen-code.md](../../integrations/qwen-code.md) |
| OpenClaw | [docs/integrations/openclaw.md](../../integrations/openclaw.md) |
| Hermes | [docs/integrations/hermes.md](../../integrations/hermes.md) |
| Dify | [docs/integrations/dify.md](../../integrations/dify.md) |
| FastGPT | [docs/integrations/fastgpt.md](../../integrations/fastgpt.md) |
| Cherry Studio | [docs/integrations/cherry-studio.md](../../integrations/cherry-studio.md) |
| Roo Code | [docs/integrations/roo-code.md](../../integrations/roo-code.md) |
| OpenWebUI | [docs/integrations/openwebui.md](../../integrations/openwebui.md) |
| Lainnya / MCP generik | [docs/integrations/README.md](../../integrations/README.md) |

## Penerapan

| Mode | Gunakan ketika | Dokumentasi |
|---|---|---|
| **Berbasis file lokal** | Dev solo, prototipe, pengujian asap | README ini, Mulai Cepat di atas |
| **Postgres+pgvector lokal** | Node tunggal kelas produksi, pencarian semantik skala besar | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose privat** | Penerapan tim self-hosted, jaringan terisolasi | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Dikelola cloud** | Hadir di v0.6 | — |

Semua jalur penerapan membutuhkan secret eksplisit: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. Skrip `scripts/check-env.mjs` menolak startup produksi jika ada nilai yang cocok dengan pola placeholder.

## Keamanan

v0.4.0-alpha mengimplementasikan postur defense-in-depth yang sesuai untuk penerapan alpha non-publik:

- **Autentikasi**: Token bearer kunci API dengan pemisahan peran (`reader`/`writer`/`admin`) dan cakupan per-proyek. Mode kunci kosong gagal tertutup dalam produksi.
- **Batas laju**: Ember ganda per-IP + per-kunci dengan backoff kegagalan autentikasi (429 setelah 5 kegagalan dalam 60 detik, penguncian 30 detik).
- **Dashboard**: Middleware HTTP Basic Auth. Menolak untuk dimulai dalam produksi tanpa `DASHBOARD_BASIC_AUTH_USER/PASS`.
- **Container**: Semua Dockerfile berjalan sebagai pengguna `node` non-root; HEALTHCHECK pada api + dashboard.
- **Secret**: Nol kredensial yang dikodekan keras; semua default adalah variabel wajib-atau-gagal. `scripts/check-env.mjs` menolak nilai placeholder dalam produksi.
- **Tata kelola**: Pemindaian PII / kunci API / JWT / kunci privat pada penulisan; konten yang diberi tag risiko secara otomatis dirutekan ke antrian tinjauan; log audit yang tidak dapat diubah pada setiap transisi status.
- **Keracunan memori**: Deteksi heuristik pada konsensus + pola kata kerja imperatif.
- **MCP**: Validasi skema zod pada setiap masukan alat; alat yang bermutasi memerlukan `reason` (≥8 karakter) dan menampilkan `destructiveHint: true`; kesalahan upstream disanitasi sebelum dikembalikan ke klien.
- **Pencatatan**: JSON terstruktur dengan redaksi otomatis bidang `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Pengungkapan kerentanan: [SECURITY.md](../../../SECURITY.md).

## Struktur proyek

```text
apps/
  api/                # REST API + Postgres + governance + eval (TypeScript)
  dashboard/          # Dashboard Next.js 16 dengan middleware Basic Auth
  mcp-server/         # Server MCP stdio (transport legacy + SDK resmi)
  web/                # Renderer HTML sisi server (UI fallback tanpa JS)
  website/            # Situs pemasaran (dikelola terpisah)
packages/
  shared/             # Tipe bersama, kesalahan, utilitas ID/token
  agentmemory-adapter # Jembatan ke agentmemory upstream + pemeriksaan versi
  search/             # Penyedia pencarian yang dapat dikonfigurasi (BM25 / hybrid)
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + primitif metrik
  governance/         # Mesin status + pemindaian risiko + keracunan + audit
docs/
  i18n/<lang>/        # README yang dilokalisasi dalam 17 bahasa
  integrations/       # 11 panduan integrasi agent-IDE
  deployment/         # Lokal + Postgres + Docker Compose
  legal/              # Privasi / Ketentuan / Cookie (hukum Singapura)
scripts/
  check-env.mjs       # Validasi env mode produksi
  smoke-*.mjs         # Pengujian asap end-to-end
  apply-postgres-schema.mjs
```

## Persyaratan

- Node.js `>=22`
- pnpm `10.30.1`
- (Opsional) Postgres 16 dengan pgvector untuk memori berkelas pencarian semantik

## Berkontribusi

Kontribusi sangat disambut. Harap baca [CONTRIBUTING.md](../../../CONTRIBUTING.md) untuk alur kerja pengembangan, protokol pesan commit, dan ekspektasi tinjauan.

Untuk terjemahan dokumentasi, lihat [panduan kontributor i18n](../README.md).

## Dioperasikan oleh

Lore Context dioperasikan oleh **REDLAND PTE. LTD.** (Singapura, UEN 202304648K). Profil perusahaan, ketentuan hukum, dan penanganan data didokumentasikan di bawah [`docs/legal/`](../../legal/).

## Lisensi

Repositori Lore Context dilisensikan di bawah [Apache License 2.0](../../../LICENSE). Paket individual di bawah `packages/*` menyatakan MIT untuk memungkinkan konsumsi hilir. Lihat [NOTICE](../../../NOTICE) untuk atribusi upstream.

## Ucapan Terima Kasih

Lore Context dibangun di atas [agentmemory](https://github.com/agentmemory/agentmemory) sebagai runtime memori lokal. Detail kontrak upstream dan kebijakan kompatibilitas versi didokumentasikan dalam [UPSTREAM.md](../../../UPSTREAM.md).
