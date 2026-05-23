<div align="center">

# Lore Context

**AI ajan belleği, değerlendirme ve yönetişim için kontrol düzlemi.**

Her ajanın ne hatırladığını, ne kullandığını ve ne unutması gerektiğini bilin — bellek bir üretim riskine dönüşmeden önce.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v2.1.0-orange.svg)](../../../CHANGELOG.md)
[![DCO](https://img.shields.io/badge/DCO-required-blue.svg)](../../../CONTRIBUTING.md#dco-developer-certificate-of-origin)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Başlarken](../../getting-started.md) · [Web Sitesi Hızlı Başlangıç](https://lorecontext.com/quickstart/) · [Kıyaslama Metodolojisi](https://lorecontext.com/benchmark/) · [API Referansı](../../api-reference.md) · [Mimari](../../architecture.md) · [Proje Planı](../../project-plan.md) · [Yayın Durumu](../../release-status.md) · [Yol Haritası](../../roadmap.md) · [Entegrasyonlar](../../integrations/README.md) · [Dağıtım](../../deployment/README.md) · [Değişiklik Günlüğü](../../../CHANGELOG.md)

🌐 **Bunu kendi dilinizde okuyun**: [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

Yerelleştirilmiş belgeler, mevcut İngilizce sürüm notlarının gerisinde kalabilir; kanonik v2.1 belgeleri İngilizce README ve `docs/` setidir.

</div>

---

> Bu belge İngilizceden makine çevirisiyle oluşturulmuştur, en son sürümün gerisinde kalabilir. PR'lar her zaman memnuniyetle karşılanır — [çeviri katkıcı rehberine](../README.md) bakın.

## Lore Context nedir

Lore Context, AI ajan belleği için bir **açık çekirdekli kontrol düzlemi**dir: bellek, arama, depo grafikleri ve araç izlerinden bağlamı bir araya getirir; kendi veri kümelerinizde geri alma kalitesini değerlendirir; hassas içerik için yönetişim incelemesini yönlendirir ve belleği backend'ler arasında taşıyabileceğiniz taşınabilir bir değişim formatı olarak dışa aktarır.

Başka bir bellek veritabanı olmaya çalışmaz. Benzersiz değer, belleğin üzerinde yer alan şeydedir:

- **Context Query** — bellek + web + depo + araç izlerini bir araya getiren tek endpoint; provenance ile derecelendirilmiş bir bağlam bloğu döndürür.
- **Memory Eval** — sahip olduğunuz veri kümelerinde Recall@K, Precision@K, MRR, stale-hit-rate, p95 gecikmeyi çalıştırır; çalışmaları kalıcı hale getirir ve regresyon tespiti için bunları karşılaştırır.
- **Governance Review** — altı durumlu yaşam döngüsü (`candidate / active / flagged / redacted / superseded / deleted`), risk etiketi taraması, zehirleme sezgisel yöntemleri, değiştirilemez denetim günlüğü.
- **MIF Benzeri Taşınabilirlik** — `provenance / validity / confidence / source_refs / supersedes / contradicts`'i koruyan JSON + Markdown dışa/içe aktarma. Bellek backend'leri arasında geçiş formatı olarak çalışır.
- **Repo Graph** — ajanların depo yanıtlarını kararlı bir proje bağlamı sözleşmesinde temellendirmesi için API rotaları ve salt okunur MCP araçları olarak sunulan deterministik depo indeksleme (dosyalar, semboller, içe aktarmalar, çağrılar, rotalar, testler).
- **Multi-Agent Adapter** — versiyon araştırması + düşürülmüş mod geri dönüşlü birinci sınıf `agentmemory` entegrasyonu; ek çalışma zamanları için temiz adaptör sözleşmesi.

## Ne zaman kullanılır

| Lore Context'i şu durumlarda kullanın... | Bellek veritabanını (agentmemory, Mem0, Supermemory) şu durumlarda kullanın... |
|---|---|
| Ajanınızın ne hatırladığını, neden ve kullanılıp kullanılmadığını **kanıtlamanız** gerekiyor | Yalnızca ham bellek depolama alanına ihtiyacınız var |
| Birden fazla ajan çalıştırıyorsunuz (Claude Code, Cursor, Qwen, Hermes, Dify) ve güvenilir paylaşılan bağlam istiyorsunuz | Tek bir ajan oluşturuyorsunuz ve satıcıya kilitli bellek katmanıyla sorun yok |
| Uyumluluk için yerel veya özel dağıtım gerektiriyorsunuz | Barındırılan SaaS tercih ediyorsunuz |
| Kendi veri kümelerinizde değerlendirmeye ihtiyacınız var, satıcı kıyaslamalarına değil | Satıcı kıyaslamaları yeterli sinyal |
| Belleği sistemler arasında taşımak istiyorsunuz | Backend değiştirmeyi planlamıyorsunuz |

## Hızlı Başlangıç

```bash
# 1. Klon + kurulum
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Hızlı başlangıç yardımcısını çalıştırın ve aktivasyon raporunu inceleyin
pnpm quickstart -- --dry-run --activation-report

# 3. Gerçek bir API anahtarı oluşturun (yalnızca yerel geliştirme ortamlarının ötesinde yer tutucular kullanmayın)
export LORE_API_KEY=$(openssl rand -hex 32)

# 4. API'yi başlatın (dosya tabanlı, Postgres gerekmez)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 5. Bir bellek yazın
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use RDS as truth store and Qdrant as the derived recall index for Lore Context production.","memory_type":"project_rule","project_id":"demo"}'

# 6. Bağlamı sorgulayın, ardından Evidence Ledger'daki döndürülen traceId'yi inceleyin
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Genel web sitesi hızlı başlangıcı için
[lorecontext.com/quickstart](https://lorecontext.com/quickstart/) adresine bakın.
Tam kurulum (Postgres, Docker Compose, Dashboard, MCP entegrasyonu) için
[docs/getting-started.md](../../getting-started.md) adresine bakın.

Kanonik alfa hızlı başlangıcı `git clone` + `pnpm quickstart`'tır. Lore şu anda
genel bir `@lore-context/quickstart` npm paketi yayınlamamakta veya talep
etmemektedir. MCP stdio sunucusu registry ve istemci dağıtımı için ayrıca
[`@lore-context/server`](https://www.npmjs.com/package/@lore-context/server)
olarak yayınlanmaktadır ve SDK ara katmanı
[`@lore-context/sdk-middleware`](https://www.npmjs.com/package/@lore-context/sdk-middleware)
(npm) ve `lore-context-middleware` (PyPI) olarak sunulmaktadır.

AI tarafından okunabilir keşif için web sitesi yalnızca genel belgelerden `/llms.txt`
ve `/llms-full.txt` yayınlamaktadır. Resmi MCP Registry girişi yayınlanmıştır
ve ek dağıtım taslakları [docs/distribution](../../distribution/) altında yer
almaktadır. Lansman taslakları [docs/launch](../../launch/) altında ve tasarım
ortağı kabulü [docs/design-partners](../../design-partners/) altındadır. Genel
kıyaslama sayfası, rekabetçi bir kıyaslama-kazanma iddiası değil, tekrarlanabilir
bir metodoloji ve küçük smoke-run raporudur.

## Mimari

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

Ayrıntılar için [docs/architecture.md](../../architecture.md) adresine bakın.

## v2.1.0'daki Yenilikler

`v2.1.0`, **Repo Graph API ve MCP Tools** sürümüdür. Lore'un kendi depo grafiğini
birinci sınıf bir ajan belleği yüzeyi haline getirir: dosyalar, semboller, içe
aktarmalar, çağrılar, rotalar, testler ve süreç ipuçları için deterministik
TypeScript/JavaScript depo indeksleme, API rotaları ve salt okunur MCP araçları
aracılığıyla sunulur; böylece ajanlar depo yanıtlarını geçici metin aramak
yerine kararlı bir proje bağlamı sözleşmesinde temellendirer.

v2.1.0, AWS üretim ortamına ve genel web sitesine dağıtıldı. Hibrit bellek motoru
(RDS gerçeklik deposu, AWS SQS worker fan-out, Qdrant türetilmiş indeksi, özel
Qwen3 gömme hizmeti, 7-stream `HybridSearchOrchestrator`), dreaming butler
bellek-birleştirme worker'ı, ajan belleği öz-iyileştirme döngüsü, yayınlanan SDK
ara katman paketleri ve v1.7–v2.0 hattında sunulan ticari SaaS altyapısı üzerine
inşa edilmiştir.

| Yetenek | Durum | Konum |
|---|---|---|
| Repo graph API + MCP tools (`repo.graph_query` / `symbol_context` / `impact` / `detect_changes`) | ✅ Üretim | `packages/repo-graph`, `apps/api`, `apps/mcp-server` |
| Kod bilgi grafiği indeksleyici | ✅ Üretim | `packages/code-indexer`, `packages/code-indexer-python` |
| Bellek + web + depo + araç izlerini birleştiren Context Query | ✅ Üretim | `apps/api`, `docs/api-reference.md` |
| 7-stream `HybridSearchOrchestrator` (FTS / pgvector / Qdrant dense+sparse / graph / temporal / wiki) | ✅ Üretim | `packages/search` |
| Çapraz kodlayıcı yeniden sıralayıcı (birleşim sonrası, isteğe bağlı) | ✅ Üretim | `apps/api/src/rerankers/` |
| Dreaming butler bellek birleştirme (prune / merge / resolve / surface) | ✅ Üretim, bayrak kilitli | `apps/api/src/workers/butler-v18.ts` |
| Ajan belleği öz-iyileştirme döngüsü + bağlam tarifleri | ✅ Üretim, insan kontrollü tanıtım | `packages/eval`, `packages/search`, `ops/context-recipes/` |
| SDK ara katmanı (OpenAI / Anthropic istemcileri için auto-inject + auto-retain) | ✅ Yayınlandı | `packages/sdk-middleware-typescript`, `packages/sdk-middleware-python` |
| AI ajanlar için gizli kasa (MCP-native, üç düğmeli yetkilendirme) | ✅ Beta, kripto denetimi bekleniyor | `apps/mcp-server`, `apps/api` |
| Cloud Memory Engine: RDS gerçeklik deposu + SQS worker fan-out + Qdrant indeksi | ✅ Üretim | `apps/api`, `apps/api/src/worker.ts` |
| Özel Qwen3-Embedding-0.6B 1024 boyutlu vektör hizmeti | ✅ Üretim | `apps/api/src/embedding.ts` |
| Otomatik yakalama alımı ve Memory Inbox istisnaları | ✅ Üretim | `apps/api`, `packages/capture` |
| Google oturum açma + kişisel kasa önyüklemesi | ✅ Üretim | `apps/api`, `apps/dashboard` |
| Ticari SaaS: bireysel abonelikler, faturalandırma, kota kapısı | ✅ Üretim | barındırılan bulut (`Lore-Context/lore-cloud`) |
| API-key kimlik doğrulamalı REST API (reader/writer/admin) | ✅ Üretim | `apps/api` |
| `/openapi.json` adresinde OpenAPI 3.1 sözleşmesi (`2.1.0` raporluyor) | ✅ Üretim | `apps/api/src/openapi.ts` |
| MCP stdio sunucusu (eski + resmi SDK aktarımı) | ✅ Üretim | `apps/mcp-server` |
| Google oturumu + operatör Temel Auth ile Next.js panosu | ✅ Üretim | `apps/dashboard` |
| Evidence Ledger API + Pano özeti | ✅ Üretim | `apps/api`, `apps/dashboard` |
| Yönetişim durum makinesi + denetim günlüğü | ✅ Üretim | `packages/governance` |
| Eval çalıştırıcı (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Üretim | `packages/eval` |
| `supersedes` + `contradicts` ile MIF v0.2 içe/dışa aktarma | ✅ Üretim | `packages/mif` |
| Model ağ geçidi (çok sağlayıcılı task→model yönlendirmesi) | ✅ Üretim | `packages/model-gateway` |
| Versiyon araştırması + düşürülmüş modlu `agentmemory` adaptörü | ✅ Üretim | `packages/agentmemory-adapter` |
| Hız sınırlama, alan düzenlemeli yapılandırılmış JSON günlükleme | ✅ Üretim | `apps/api` |
| Docker Compose özel dağıtım | ✅ Üretim | `docker-compose.yml` |
| `pnpm quickstart` yerel benimseme yardımcısı + aktivasyon raporu | ✅ Üretim | `scripts/lore-quickstart.mjs` |
| Resmi MCP Registry + dağıtım / lansman / tasarım ortağı belgeleri | ✅ Üretim | `server.json`, `docs/distribution/`, `docs/launch/` |

Tam sürüm geçmişi için [CHANGELOG.md](../../../CHANGELOG.md) adresine bakın.

## Mevcut sürüm durumu

`v2.1.0`, mevcut kaynak, barındırılan üretim ve sürüm hattıdır. Optimize edilmiş
sürüm akışı aracılığıyla AWS üretim ortamına ve genel web sitesine dağıtıldı:
değiştirilemez arm64-first artifact'lar, staging API smoke'u, üretim API dağıtımı,
izole web sitesi dağıtımı, sürüm sonrası denetim ve etiket/sürüm kapanışı. Dış
kontroller `https://api.lorecontext.com/health`'in `status=ok` döndürdüğünü,
`/openapi.json`'ın `2.1.0` raporladığını ve
`https://lorecontext.com/status.html`'nin `v2.1.0` içerdiğini doğrular.

Üretim, v1.1+ RDS / SQS / memory-worker / Qdrant bulut şeklini korur, Qdrant
koleksiyonu olarak `lore_memories_v12` kullanır, Postgres yolu için 1024 boyutlu
pgvector'ı korur ve eklenebilir depo grafik şemasını ekler
(`apps/api/src/db/schema-v21-repo-graph.sql`).

Mevcut genel güvenli durum anlık görüntüsü için [docs/release-status.md](../../release-status.md)
ve tam sürüm notları için [docs/release-notes/v2.1.0.md](../../release-notes/v2.1.0.md)
adreslerine bakın.

## Sürüm odağı

v2.1 sürümü, Lore'un depo grafiğini birinci sınıf bir ajan belleği yüzeyi haline
getirir. Amaç, ajanların "X nerede tanımlanmış", "bunu ne çağırıyor" ve "bunu
değiştirirsem ne bozulur" sorularını geçici metin aramak yerine deterministik,
kararlı bir proje bağlamı sözleşmesine karşı yanıtlamasına izin vermektir:

- `@lore/repo-graph` — dosyalar, semboller, içe aktarmalar, çağrılar, rotalar,
  testler ve süreç ipuçları için deterministik TypeScript/JavaScript depo indeksleme.
- API rotaları: `POST /v1/repo/graph/query`, `POST /v1/repo/symbol/context`,
  `POST /v1/repo/impact` ve `POST /v1/repo/detect-changes`.
- MCP araçları: `repo.graph_query`, `repo.symbol_context`, `repo.impact` ve
  `repo.detect_changes` (salt okunur).
- `context_query(repo)` artık mevcut olduğunda sağlayıcı destekli depo grafik
  kanıtlarını kullanır; depo grafik depolama yapılandırılmadığında dürüst bir
  kullanılamaz geri dönüşüyle.
- Depo grafiği Postgres şeması eklenebilirdir — mevcut üretim şemasının üstüne
  oturur ve üretim/staging şema kurulumu sırasında uygulanır.

Kök ve API paket sürümleri `2.1.0` raporlar; böylece `/openapi.json` sürüm
etiketiyle eşleşir. Sürüm treni, v2.0.9'dan sonra tanıtılan optimize edilmiş
bölünmüş API/web sitesi dağıtım önlemlerini kullanır.

[docs/project-plan.md](../../project-plan.md), [docs/roadmap.md](../../roadmap.md) ve [docs/release-governance.md](../../release-governance.md) adreslerine bakın.

## Entegrasyonlar

Lore Context, MCP ve REST konuşur ve çoğu ajan IDE'siyle ve sohbet ön yüzüyle entegre olur:

| Araç | Kurulum kılavuzu |
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
| Diğer / genel MCP | [docs/integrations/README.md](../../integrations/README.md) |

## Dağıtım

| Mod | Ne zaman kullanılır | Belge |
|---|---|---|
| **Yerel dosya tabanlı** | Tekil geliştirme, prototip, smoke testi | Bu README, yukarıdaki Hızlı Başlangıç |
| **Yerel Postgres+pgvector** | Tek düğümlü yerel geri dönüş ve geçiş testi | [docs/deployment/README.md](../../deployment/README.md) |
| **Docker Compose özel** | Kendi sunucusunda barındırılan takım dağıtımı, izole ağ | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Barındırılan bulut** | RDS / SQS / memory-worker / Qdrant / özel gömme artı grafik güçlendirilmiş hibrit geri çağırma yığını ve ticari SaaS altyapısı | [docs/release-status.md](../../release-status.md) |

Tüm dağıtım yolları açık gizli anahtar gerektirir. Yerel/özel yollar
`POSTGRES_PASSWORD`, `LORE_API_KEYS` ve pano kimlik doğrulaması gerektirir.
Barındırılan dağıtımlar aynı zamanda RDS, SQS, Qdrant, gömme hizmeti, OAuth,
tünel yapılandırması ve üretim çalışma zamanı dışa aktarmalarına ihtiyaç duyar.
`scripts/check-env.mjs` betiği, herhangi bir değer yer tutucu kalıbıyla eşleşirse
üretim başlatmayı reddeder.

## Güvenlik

v2.1.0, olağan kullanıcı erişimi için yerel/özel dağıtım duruşunu ve barındırılan
bulut korumalarını korur:

- **Kimlik Doğrulama**: Rol ayrımı (`reader`/`writer`/`admin`) ve proje başına kapsam belirleme ile API-key taşıyıcı token'lar. Boş anahtarlar modu üretimde kapalı başarısız olur.
- **Hız Sınırlama**: Kimlik doğrulama hatası geri çekilmeli çift IP + anahtar başına kova (60 saniyede 5 başarısızlıktan sonra 429, 30 saniyelik kilit).
- **Pano**: Barındırılan ürün için Google oturum akışı; HTTP Basic Auth yerel/özel operatör dağıtımları için kullanılabilir olmaya devam eder.
- **Konteynerler**: Tüm Dockerfiles kök olmayan `node` kullanıcısı olarak çalışır; api + pano üzerinde HEALTHCHECK.
- **Gizli Anahtarlar**: Sıfır sabit kodlanmış kimlik bilgisi; tüm varsayılanlar gerekli-veya-başarısız değişkenlerdir. `scripts/check-env.mjs` üretimde yer tutucu değerleri reddeder.
- **Yönetişim**: Yazmalarda PII / API key / JWT / özel anahtar regex taraması; risk etiketli içerik otomatik olarak inceleme kuyruğuna yönlendirilir; her durum geçişinde değiştirilemez denetim günlüğü.
- **Bellek zehirlenmesi**: Uzlaşma + emir kipi fiil kalıplarında sezgisel tespit.
- **MCP**: Her araç girdisinde zod şema doğrulama; değiştiren araçlar `reason` (≥8 karakter) gerektirir ve `destructiveHint: true` gösterir; yukarı akış hataları istemciye döndürülmeden önce temizlenir.
- **Worker yalıtımı**: Yakalama, gömme, grafik, bağlayıcı ve geri dolum işleri DLQ'lu AWS SQS kuyrukları aracılığıyla çalışır; Qdrant türetilmiş bir indekstir ve RDS yetkili olmaya devam eder.
- **Günlükleme**: `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key` alanlarının otomatik düzenlenmesiyle yapılandırılmış JSON.

Güvenlik açığı bildirimleri: [SECURITY.md](../../../SECURITY.md).

## Proje yapısı

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

## Gereksinimler

- Node.js `>=22`
- pnpm `10.30.1`
- (İsteğe bağlı yerel geri dönüş) pgvector ile Postgres 16
- (Barındırılan/gelişmiş) RDS PostgreSQL 16, AWS SQS, Qdrant ve özel gömme hizmeti

## Katkıda Bulunma

Katkılar memnuniyetle karşılanır. Geliştirme iş akışı, commit mesaj protokolü ve
inceleme beklentileri için lütfen [CONTRIBUTING.md](../../../CONTRIBUTING.md) adresini okuyun.

Belge çevirileri için [i18n katkıcı kılavuzuna](../README.md) bakın.

## İşleten

Lore Context, **REDLAND PTE. LTD.** (Singapur, UEN 202304648K) tarafından işletilmektedir. Şirket profili, yasal şartlar ve veri işleme [`docs/legal/`](../../legal/) altında belgelenmiştir.

## Lisans

Lore Context deposu [Apache License 2.0](../../../LICENSE) altında lisanslanmıştır. `packages/*` altındaki bireysel paketler, aşağı akış tüketimini sağlamak için MIT bildirmektedir. Yukarı akış atıfı için [NOTICE](../../../NOTICE) adresine bakın.

## Teşekkürler

Lore Context, yerel bir bellek çalışma zamanı olarak [agentmemory](https://github.com/agentmemory/agentmemory) üzerine inşa edilmiştir. Yukarı akış sözleşme ayrıntıları ve sürüm uyumluluğu politikası [UPSTREAM.md](../../../UPSTREAM.md) içinde belgelenmiştir.
