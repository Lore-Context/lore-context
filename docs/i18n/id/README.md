<div align="center">

# Lore Context

**Control plane untuk memori, evaluasi, dan tata kelola agen AI.**

Ketahui apa yang diingat, digunakan, dan harus dilupakan oleh setiap agen — sebelum memori menjadi risiko produksi.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Memulai](../../getting-started.md) · [Quickstart Website](https://lorecontext.com/quickstart/) · [Metodologi Benchmark](https://lorecontext.com/benchmark/) · [Referensi API](../../api-reference.md) · [Arsitektur](../../architecture.md) · [Rencana Proyek](../../project-plan.md) · [Status Rilis](../../release-status.md) · [Peta Jalan](../../roadmap.md) · [Integrasi](../../integrations/README.md) · [Deployment](../../deployment/README.md) · [Catatan Perubahan](../../../CHANGELOG.md)

🌐 **Baca ini dalam bahasa Anda**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

Dokumen yang telah dilokalisasi mungkin tertinggal dari catatan rilis bahasa Inggris saat ini; dokumen kanonik v2.1 adalah README bahasa Inggris dan set `docs/`.

</div>

---

> Dokumen ini diterjemahkan secara otomatis dari bahasa Inggris, mungkin tertinggal dari rilis terbaru. PR sangat disambut — lihat [panduan kontributor terjemahan](../README.md).

## Apa itu Lore Context

Lore Context adalah **control plane open-core** untuk memori agen AI: ia mengkomposisi konteks dari memori, pencarian, grafik repositori, dan jejak alat; mengevaluasi kualitas pengambilan pada dataset Anda sendiri; merutekan tinjauan tata kelola untuk konten sensitif; dan mengekspor memori sebagai format pertukaran portabel yang dapat Anda pindahkan antar backend.

Ia tidak mencoba menjadi database memori lain. Nilai uniknya terletak pada apa yang berada di atas memori:

- **Context Query** — endpoint tunggal yang mengkomposisi memori + web + repo + jejak alat, mengembalikan blok konteks yang dinilai dengan provenance.
- **Memory Eval** — menjalankan Recall@K, Precision@K, MRR, stale-hit-rate, latensi p95 pada dataset yang Anda miliki; menyimpan eksekusi dan membandingkannya untuk deteksi regresi.
- **Governance Review** — siklus hidup enam status (`candidate / active / flagged / redacted / superseded / deleted`), pemindaian tag risiko, heuristik keracunan, log audit tak berubah.
- **Portabilitas Mirip MIF** — ekspor/impor JSON + Markdown yang mempertahankan `provenance / validity / confidence / source_refs / supersedes / contradicts`. Berfungsi sebagai format migrasi antar backend memori.
- **Repo Graph** — pengindeksan repositori deterministik (file, simbol, impor, panggilan, rute, uji coba) yang diekspos sebagai rute API dan alat MCP hanya-baca sehingga agen mendasarkan jawaban repositori pada kontrak konteks proyek yang stabil.
- **Multi-Agent Adapter** — integrasi `agentmemory` kelas satu dengan probe versi + fallback mode terdegradasi; kontrak adapter bersih untuk runtime tambahan.

## Kapan menggunakannya

| Gunakan Lore Context saat... | Gunakan database memori (agentmemory, Mem0, Supermemory) saat... |
|---|---|
| Anda perlu **membuktikan** apa yang diingat agen Anda, mengapa, dan apakah itu digunakan | Anda hanya membutuhkan penyimpanan memori mentah |
| Anda menjalankan beberapa agen (Claude Code, Cursor, Qwen, Hermes, Dify) dan menginginkan konteks terpercaya yang dibagikan | Anda membangun agen tunggal dan OK dengan tingkat memori terkunci vendor |
| Anda memerlukan deployment lokal atau privat untuk kepatuhan | Anda lebih suka SaaS yang dihosting |
| Anda membutuhkan evaluasi pada dataset Anda sendiri, bukan benchmark vendor | Benchmark vendor adalah sinyal yang cukup |
| Anda ingin memigrasikan memori antar sistem | Anda tidak berencana mengganti backend |

## Mulai Cepat

```bash
# 1. Clone + instal
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Jalankan pembantu quickstart dan periksa laporan aktivasi
pnpm quickstart -- --dry-run --activation-report

# 3. Buat API key nyata (jangan gunakan placeholder di lingkungan mana pun selain dev lokal saja)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. Mulai API (berbasis file, tidak perlu Postgres)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Tulis sebuah memori
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Kueri konteks, lalu periksa traceId yang dikembalikan di Evidence Ledger
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Untuk quickstart website publik, lihat
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/). Untuk
pengaturan lengkap (Postgres, Docker Compose, Dashboard, integrasi MCP), lihat
[docs/getting-started.md](../../getting-started.md).

Quickstart alpha kanonik adalah `git clone` + `pnpm quickstart`. Lore saat ini
tidak menerbitkan atau mengklaim paket npm `@lore-context/quickstart` publik.
Server MCP stdio diterbitkan secara terpisah sebagai
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
untuk distribusi registry dan klien, dan middleware SDK dikirimkan sebagai
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) dan `lore-context-middleware` (PyPI).

Untuk penemuan yang dapat dibaca AI, website menerbitkan `/llms.txt` dan `/llms-full.txt`
hanya dari dokumentasi publik. Entri MCP Registry Resmi telah diterbitkan,
dan draf distribusi tambahan ada di bawah [docs/distribution](../../distribution/).
Draf peluncuran ada di bawah [docs/launch](../../launch/), dan penerimaan mitra desain
di bawah [docs/design-partners](../../design-partners/). Halaman benchmark publik
adalah metodologi yang dapat direproduksi dan laporan smoke-run kecil, bukan klaim
kemenangan benchmark kompetitif.

## Arsitektur

```text
                       ┌───────────────────────────────────────────────┐
  MCP/REST clients ─► │ apps/api  (auth + rate limit + evidence)       │
  (Claude Code,       │   ├── Memory Inbox / lifecycle / audit         │
   Codex, Cursor,     │   ├── capture ingestion + recall hydration     │
   OpenCode...)       │   ├── context query (memory/web/repo/traces)   │
                       │   ├── repo graph query / symbol / impact       │
                       │   ├── Google sign-in + hosted MCP metadata     │
                       │   └── OpenAPI + usage + operator surfaces      │
                       └───────────────┬───────────────────────────────┘
                                       │
                         capture / embedding / graph jobs
                                       ▼
                       ┌───────────────────────────────────────────────┐
                       │ memory-worker  (AWS SQS + DLQ fan-out)        │
                       │   ├── auto redaction / curation / save        │
                       │   ├── dreaming butler (prune/merge/resolve)    │
                       │   ├── private Qwen3 embedding service         │
                       │   └── Qdrant dense+sparse indexing            │
                       └───────────────┬───────────────────────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  ▼                    ▼                    ▼
          RDS PostgreSQL 16      Qdrant derived index   apps/dashboard
          truth store + audit    lore_memories_v12      user-facing SaaS
```

Untuk detail, lihat [docs/architecture.md](../../architecture.md).

## Yang Baru di v2.1.0

`v2.1.0` adalah rilis **Repo Graph API dan MCP Tools**. Ini menjadikan grafik
repositori Lore sendiri sebagai permukaan memori agen kelas satu: pengindeksan
repositori TypeScript/JavaScript deterministik untuk file, simbol, impor,
panggilan, rute, uji coba, dan petunjuk proses, yang diekspos melalui rute API
dan alat MCP hanya-baca sehingga agen mendasarkan jawaban repositori pada
kontrak konteks proyek yang stabil daripada pencarian teks ad hoc.

v2.1.0 di-deploy ke AWS production dan website publik. Ini dibangun di atas
mesin memori hybrid (truth store RDS, fan-out worker AWS SQS, indeks turunan
Qdrant, layanan embedding Qwen3 privat, `HybridSearchOrchestrator` 7-stream),
worker konsolidasi memori dreaming butler, loop peningkatan diri memori agen,
paket middleware SDK yang diterbitkan, dan substrat SaaS komersial yang dikirimkan
di lini v1.7–v2.0.

| Kapabilitas | Status | Lokasi |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Production | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Pengindeks grafik pengetahuan kode | ✅ Production | `packages/code-indexer`, `packages/code-indexer-python` |
| Context Query mengkomposisi memori + web + repo + jejak alat | ✅ Production | `apps/api`, `docs/api-reference.md` |
| `HybridSearchOrchestrator` 7-stream (FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki) | ✅ Production | `packages/search` |
| Cross-encoder reranker (pasca-fusi, opt-in) | ✅ Production | `apps/api/src/rerankers/` |
| Konsolidasi memori dreaming butler (prune / merge / resolve / surface) | ✅ Production, dikunci flag | `apps/api/src/workers/butler-v18.ts` |
| Loop peningkatan diri memori agen + resep konteks | ✅ Production, promosi dikontrol manusia | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| SDK middleware (auto-inject + auto-retain untuk klien OpenAI / Anthropic) | ✅ Diterbitkan | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| Secret vault untuk agen AI (MCP-native, otorisasi tiga tombol) | ✅ Beta, menunggu audit kripto | `apps/mcp-server`, `apps/api` |
| Cloud Memory Engine: truth store RDS + fan-out worker SQS + indeks Qdrant | ✅ Production | `apps/api`, `apps/api/src/worker.ts` |
| Layanan vektor Qwen3-Embedding-0.6B 1024-dim privat | ✅ Production | `apps/api/src/embedding.ts` |
| Penyerapan capture otomatis dan pengecualian Memory Inbox | ✅ Production | `apps/api`, `packages/capture` |
| Google sign-in + bootstrap vault pribadi | ✅ Production | `apps/api`, `apps/dashboard` |
| SaaS komersial: langganan individu, penagihan, pembatasan kuota | ✅ Production | hosted cloud (`Lore-Context/lore-cloud`) |
| REST API dengan autentikasi API-key (reader/writer/admin) | ✅ Production | `apps/api` |
| Kontrak OpenAPI 3.1 di `/openapi.json` (melaporkan `2.1.0`) | ✅ Production | `apps/api/src/openapi.ts` |
| Server MCP stdio (legacy + transport SDK resmi) | ✅ Production | `apps/mcp-server` |
| Dashboard Next.js dengan sesi Google + Basic Auth operator | ✅ Production | `apps/dashboard` |
| Evidence Ledger API + ringkasan Dashboard | ✅ Production | `apps/api`, `apps/dashboard` |
| Mesin status tata kelola + log audit | ✅ Production | `packages/governance` |
| Eval runner (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Production | `packages/eval` |
| Impor/ekspor MIF v0.2 dengan `supersedes` + `contradicts` | ✅ Production | `packages/mif` |
| Model gateway (perutean task→model multi-penyedia) | ✅ Production | `packages/model-gateway` |
| Adapter `agentmemory` dengan probe versi + mode terdegradasi | ✅ Production | `packages/agentmemory-adapter` |
| Pembatasan laju, pencatatan JSON terstruktur dengan redaksi bidang | ✅ Production | `apps/api` |
| Deployment privat Docker Compose | ✅ Production | `docker-compose.yml` |
| Pembantu adopsi lokal `pnpm quickstart` + laporan aktivasi | ✅ Production | `scripts/lore-quickstart.mjs` |
| MCP Registry Resmi + dokumentasi distribusi / peluncuran / mitra desain | ✅ Production | `server.json`, `docs/distribution/`, `docs/launch/` |

Lihat [CHANGELOG.md](../../../CHANGELOG.md) untuk riwayat rilis lengkap.

## Status rilis saat ini

`v2.1.0` adalah sumber saat ini, production yang dihosting, dan lini rilis. Ini
di-deploy ke AWS production dan website publik melalui alur rilis yang dioptimalkan:
artefak arm64-first tak berubah, smoke API staging, deploy API production, deploy
website terisolasi, audit pasca-rilis, dan penutupan tag/rilis. Pemeriksaan
eksternal mengonfirmasi `https://api.lorecontext.com/health` mengembalikan
`status=ok`, `/openapi.json` melaporkan `2.1.0`, dan
`https://lorecontext.com/status.html` mengandung `v2.1.0`.

Production mempertahankan bentuk RDS / SQS / memory-worker / Qdrant cloud v1.1+,
menggunakan `lore_memories_v12` sebagai koleksi Qdrant, mempertahankan pgvector
1024-dim untuk jalur Postgres, dan menambahkan skema grafik repo aditif
(`apps/api/src/db/schema-v21-repo-graph.sql`).

Lihat [docs/release-status.md](../../release-status.md) untuk snapshot status
aman-publik saat ini dan [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
untuk catatan rilis lengkap.

## Fokus rilis

Rilis v2.1 menjadikan grafik repositori Lore sebagai permukaan memori agen kelas
satu. Tujuannya adalah membiarkan agen menjawab "di mana X didefinisikan", "apa
yang memanggil ini", dan "apa yang rusak jika saya mengubah ini" terhadap kontrak
konteks proyek yang deterministik dan stabil daripada pencarian teks ad hoc:

- `@lore/repo-graph` — pengindeksan repositori TypeScript/JavaScript deterministik
  untuk file, simbol, impor, panggilan, rute, uji coba, dan petunjuk proses.
- Rute API: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact`, dan `POST /v1/repo/detect-changes`.
- Alat MCP: `repo.graph_query`, `repo.symbol_context`, `repo.impact`, dan
  `repo.detect_changes` (hanya-baca).
- `context_query(repo)` kini menggunakan bukti grafik repo yang didukung penyedia
  saat tersedia, dengan fallback jujur tidak tersedia saat penyimpanan grafik repo
  tidak dikonfigurasi.
- Skema Postgres grafik repo bersifat aditif — ia berada di atas skema production
  yang ada dan diterapkan selama penyiapan skema production/staging.

Versi paket root dan API melaporkan `2.1.0` sehingga `/openapi.json` cocok dengan
tag rilis. Kereta rilis menggunakan perlindungan deployment terpisah API/website
yang dioptimalkan yang diperkenalkan setelah v2.0.9.

Lihat [docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md), dan [docs/release-governance.md](../../release-governance.md).

## Integrasi

Lore Context berbicara MCP dan REST dan berintegrasi dengan sebagian besar IDE agen dan antarmuka chat:

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

## Deployment

| Mode | Gunakan saat | Dokumentasi |
|---|---|---|
| **Berbasis file lokal** | Dev solo, prototipe, smoke testing | README ini, Mulai Cepat di atas |
| **Postgres+pgvector lokal** | Fallback lokal satu node dan pengujian migrasi | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose privat** | Deployment tim yang dihosting sendiri, jaringan terisolasi | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Hosted cloud** | RDS / SQS / memory-worker / Qdrant / embedding privat ditambah stack recall hybrid yang ditingkatkan grafik dan substrat SaaS komersial | [docs/release-status.md](../../release-status.md) |

Semua jalur deployment memerlukan rahasia eksplisit. Jalur lokal/privat memerlukan
`POSTGRES_PASSWORD`, `LORE_API_KEYS`, dan autentikasi dashboard. Deployment yang
dihosting juga memerlukan RDS, SQS, Qdrant, layanan embedding, OAuth, konfigurasi
tunnel, dan ekspor runtime production. Skrip `scripts/check-env.mjs` menolak
startup production jika nilai mana pun cocok dengan pola placeholder.

## Keamanan

v2.1.0 mempertahankan postur deployment lokal/privat dan perlindungan cloud yang
dihosting untuk akses pengguna biasa:

- **Autentikasi**: Token bearer API-key dengan pemisahan peran (`reader`/`writer`/`admin`) dan cakupan per-proyek. Mode kunci kosong gagal tertutup di production.
- **Pembatasan laju**: Bucket ganda per-IP + per-kunci dengan backoff kegagalan autentikasi (429 setelah 5 kegagalan dalam 60d, penguncian 30d).
- **Dashboard**: Alur sesi Google untuk produk yang dihosting; HTTP Basic Auth tetap tersedia untuk deployment operator lokal/privat.
- **Container**: Semua Dockerfiles berjalan sebagai pengguna `node` non-root; HEALTHCHECK pada api + dashboard.
- **Rahasia**: Nol kredensial yang dikodekan keras; semua default adalah variabel yang diperlukan-atau-gagal. `scripts/check-env.mjs` menolak nilai placeholder di production.
- **Tata Kelola**: Pemindaian regex PII / API key / JWT / private-key pada penulisan; konten bertag risiko secara otomatis dirutekan ke antrian tinjauan; log audit tak berubah pada setiap transisi status.
- **Keracunan memori**: Deteksi heuristik pada pola konsensus + kata kerja imperatif.
- **MCP**: Validasi skema zod pada setiap input alat; alat yang bermutasi memerlukan `reason` (≥8 karakter) dan memunculkan `destructiveHint: true`; kesalahan upstream dibersihkan sebelum dikembalikan ke klien.
- **Isolasi worker**: Job capture, embedding, grafik, connector, dan backfill berjalan melalui antrian AWS SQS dengan DLQ; Qdrant adalah indeks turunan dan RDS tetap otoritatif.
- **Pencatatan**: JSON terstruktur dengan redaksi otomatis bidang `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key`.

Pengungkapan kerentanan: [SECURITY.md](../../../SECURITY.md).

## Struktur proyek

```text
apps/
  api/                # REST control plane + Postgres + governance + eval + repo graph
  dashboard/          # Next.js dashboard with Google session + operator Basic Auth
  mcp-server/         # MCP stdio server (legacy + official SDK transports)
  cli/                # lore CLI (doctor, wiki-recompile, dataset import/export)
  browser-extension/  # Capture surface scaffold
  web/                # Server-side HTML renderer (no-JS fallback UI)
  website/            # Marketing site (handled separately)
packages/
  shared/             # Shared types, errors, ID/token utilities
  agentmemory-adapter # Bridge to upstream agentmemory + version probe
  search/             # 7-stream HybridSearchOrchestrator + recipe adapter
  repo-graph/         # Deterministic repository indexing (v2.1)
  code-indexer/       # Code knowledge graph indexer (TypeScript/JavaScript)
  code-indexer-python # Code knowledge graph indexer (Python)
  capture/            # Capture ingestion primitives
  connectors/         # External source connectors
  model-gateway/      # Multi-provider task→model routing
  mif/                # Memory Interchange Format (v0.2)
  eval/               # EvalRunner + metric primitives + context recipes
  governance/         # State machine + risk scan + poisoning + audit
  profile/            # Vault / account profile types
  sdk-typescript/     # TypeScript client SDK
  sdk-python/         # Python client SDK
  sdk-go/ sdk-java/ sdk-dotnet/   # Additional language SDKs
  sdk-middleware-typescript/      # Auto-inject + auto-retain middleware (npm)
  sdk-middleware-python/          # Auto-inject + auto-retain middleware (PyPI)
docs/
  i18n/<lang>/        # Localized README in 17 languages
  integrations/       # Agent-IDE integration guides
  deployment/         # Local, Docker Compose, and production automation runbooks
  legal/              # Privacy / Terms / Cookies (Singapore law)
scripts/
  check-env.mjs       # Production-mode env validation
  smoke-*.mjs         # End-to-end smoke tests
  apply-postgres-schema.mjs
```

## Persyaratan

- Node.js `>=22`
- pnpm `10.30.1`
- (Fallback lokal opsional) Postgres 16 dengan pgvector
- (Dihosting/lanjutan) RDS PostgreSQL 16, AWS SQS, Qdrant, dan layanan embedding privat

## Berkontribusi

Kontribusi disambut. Silakan baca [CONTRIBUTING.md](../../../CONTRIBUTING.md) untuk alur kerja
pengembangan, protokol pesan commit, dan ekspektasi tinjauan.

Untuk terjemahan dokumentasi, lihat [panduan kontributor i18n](../README.md).

## Dioperasikan oleh

Lore Context dioperasikan oleh **REDLAND PTE. LTD.** (Singapura, UEN 202304648K). Profil perusahaan, ketentuan hukum, dan penanganan data didokumentasikan di bawah [`docs/legal/`](../../legal/).

## Lisensi

Repositori Lore Context dilisensikan di bawah [Apache License 2.0](../../../LICENSE). Paket individual di bawah `packages/*` mendeklarasikan MIT untuk memungkinkan konsumsi hilir. Lihat [NOTICE](../../../NOTICE) untuk atribusi upstream.

## Pengakuan

Lore Context dibangun di atas [agentmemory](https://github.com/agentmemory/agentmemory) sebagai runtime memori lokal. Detail kontrak upstream dan kebijakan kompatibilitas versi didokumentasikan dalam [UPSTREAM.md](../../../UPSTREAM.md).
