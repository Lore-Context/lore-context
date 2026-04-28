<div align="center">

# Lore Context

**AI ajan belleği, değerlendirme ve yönetişim için kontrol düzlemi.**

Her ajanın ne hatırladığını, ne kullandığını ve ne unutması gerektiğini — bellek üretim riskine dönüşmeden önce — bilin.

[![CI](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml/badge.svg)](https://github.com/Lore-Context/lore-context/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0--alpha-orange.svg)](../../../CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[Başlarken](getting-started.md) · [API Referansı](api-reference.md) · [Mimari](architecture.md) · [Entegrasyonlar](integrations.md) · [Dağıtım](deployment.md) · [Değişiklik Günlüğü](CHANGELOG.md)

🌐 **Kendi dilinizde okuyun**: [English](../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Tiếng Việt](../vi/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Русский](../ru/README.md) · [Türkçe](README.md) · [Deutsch](../de/README.md) · [Français](../fr/README.md) · [Italiano](../it/README.md) · [Ελληνικά](../el/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Bahasa Indonesia](../id/README.md)

</div>

> 🤖 Bu belge İngilizce orijinalinden makine çevirisi ile oluşturulmuştur. PR ile iyileştirmeler memnuniyetle karşılanır — [çeviri katkı kılavuzuna](../README.md) bakın.

---

## Lore Context Nedir

Lore Context, AI ajan belleği için **açık çekirdekli bir kontrol düzlemi**dir: bellek, arama ve araç izleri arasında bağlamı bir araya getirir; kendi veri kümeleriniz üzerinde getirme kalitesini değerlendirir; hassas içerik için yönetişim incelemesi yönlendirir ve belleği arka uçlar arasında taşıyabileceğiniz taşınabilir bir değişim biçimi olarak dışa aktarır.

Başka bir bellek veritabanı olmayı hedeflemiyor. Benzersiz değer, belleğin üzerinde yer alanlarda:

- **Bağlam Sorgusu** — tek uç nokta bellek + web + depo + araç izlerini bir araya getirir; köken bilgisi içeren derecelendirilmiş bir bağlam bloğu döndürür.
- **Bellek Değerlendirmesi** — sahip olduğunuz veri kümelerinde Recall@K, Precision@K, MRR, stale-hit-rate, p95 gecikmesini çalıştırır; çalıştırmaları kalıcı hale getirir ve regresyon tespiti için farklılaştırır.
- **Yönetişim İncelemesi** — altı durumlu yaşam döngüsü (`candidate / active / flagged / redacted / superseded / deleted`), risk etiketi taraması, zehirleme sezgiselleri, değiştirilemez denetim günlüğü.
- **MIF Benzeri Taşınabilirlik** — `provenance / validity / confidence / source_refs / supersedes / contradicts` alanlarını koruyan JSON + Markdown dışa/içe aktarma. Bellek arka uçları arasında geçiş biçimi olarak çalışır.
- **Çoklu Ajan Adaptörü** — sürüm araştırması + düşük performans yedek modlu birinci sınıf `agentmemory` entegrasyonu; ek çalışma zamanları için temiz adaptör sözleşmesi.

## Ne Zaman Kullanılır

| Lore Context'i şu durumlarda kullanın... | Bellek veritabanını (agentmemory, Mem0, Supermemory) şu durumlarda kullanın... |
|---|---|
| Ajanınızın ne hatırladığını, neden hatırladığını ve kullanılıp kullanılmadığını **kanıtlamanız** gerektiğinde | Yalnızca ham bellek depolamasına ihtiyacınız olduğunda |
| Birden fazla ajan çalıştırıyorsanız (Claude Code, Cursor, Qwen, Hermes, Dify) ve paylaşılan güvenilir bağlam istiyorsanız | Tek bir ajan oluşturuyorsanız ve satıcıya bağlı bellek katmanıyla iyiyseniz |
| Uyumluluk için yerel veya özel dağıtım gerekiyorsa | Barındırılan SaaS tercih ediyorsanız |
| Kendi veri kümelerinizde değerlendirme istiyorsanız, satıcı kıyaslamaları değil | Satıcı kıyaslamaları yeterli sinyal olduğunda |
| Belleği sistemler arasında taşımak istiyorsanız | Arka uçları değiştirmeyi planlamıyorsanız |

## Hızlı Başlangıç

```bash
# 1. Klonla + kur
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context && pnpm install

# 2. Gerçek bir API anahtarı oluştur (yalnızca yerel geliştirme dışında yer tutucu kullanma)
export LORE_API_KEY=$(openssl rand -hex 32)

# 3. API'yi başlat (dosya tabanlı, Postgres gerekmez)
pnpm build && PORT=3000 LORE_STORE_PATH=./data/lore-store.json pnpm start:api

# 4. Bellek yaz
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{"content":"Use Postgres pgvector for Lore Context production storage.","memory_type":"project_rule","project_id":"demo"}'

# 5. Bağlam sorgula
curl -H "Authorization: Bearer $LORE_API_KEY" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{"query":"production storage","project_id":"demo","token_budget":1200}'
```

Tam kurulum (Postgres, Docker Compose, Gösterge Tablosu, MCP entegrasyonu) için bkz. [docs/getting-started.md](getting-started.md).

## Mimari

```text
                       ┌─────────────────────────────────────────────┐
   MCP istemcileri ──► │ apps/api  (REST + auth + hız sınırı + log) │
   (Claude Code,       │   ├── bağlam yönlendiricisi (bellek/web/repo/araç) │
    Cursor, Qwen,      │   ├── bağlam oluşturucu                    │
    Dify, Hermes...)   │   ├── yönetişim + denetim                  │
                       │   ├── değerlendirme çalıştırıcısı          │
                       │   └── MIF içe/dışa aktarma                 │
                       └────────┬────────────────────────────────────┘
                                │
                  ┌─────────────┼──────────────────────────┐
                  ▼             ▼                          ▼
           Postgres+pgvector   agentmemory adaptörü    packages/search
           (artımlı            (sürüm araştırmalı,     (BM25 / hibrit
            kalıcılık)          düşük mod güvenli)      takılabilir)
                                                                 ▲
                       ┌─────────────────────────────┐           │
                       │ apps/dashboard  (Next.js)   │ ──────────┘
                       │   HTTP Basic Auth korumalı  │
                       │   bellek · izler · eval     │
                       │   yönetişim inceleme kuyruğu│
                       └─────────────────────────────┘
```

Ayrıntılar için bkz. [docs/architecture.md](architecture.md).

## v0.4.0-alpha'da Neler Var

| Yetenek | Durum | Konum |
|---|---|---|
| API anahtarı kimlik doğrulama (reader/writer/admin) ile REST API | ✅ Üretim | `apps/api` |
| MCP stdio sunucusu (eski + resmi SDK taşıması) | ✅ Üretim | `apps/mcp-server` |
| HTTP Basic Auth kapılı Next.js gösterge tablosu | ✅ Üretim | `apps/dashboard` |
| Postgres + pgvector artımlı kalıcılık | ✅ İsteğe Bağlı | `apps/api/src/db/` |
| Yönetişim durum makinesi + denetim günlüğü | ✅ Üretim | `packages/governance` |
| Değerlendirme çalıştırıcısı (Recall@K / Precision@K / MRR / staleHit / p95) | ✅ Üretim | `packages/eval` |
| `supersedes` + `contradicts` ile MIF v0.2 içe/dışa aktarma | ✅ Üretim | `packages/mif` |
| Sürüm araştırması + düşük mod ile `agentmemory` adaptörü | ✅ Üretim | `packages/agentmemory-adapter` |
| Hız sınırı (IP başına + anahtar başına ve geri çekilme) | ✅ Üretim | `apps/api` |
| Hassas alan gizleme ile yapılandırılmış JSON günlükleme | ✅ Üretim | `apps/api/src/logger.ts` |
| Docker Compose özel dağıtım | ✅ Üretim | `docker-compose.yml` |
| Demo veri kümesi + duman testleri + Playwright UI testi | ✅ Üretim | `examples/`, `scripts/` |
| Barındırılan çok kiracılı bulut senkronizasyonu | ⏳ Yol Haritası | — |

Tam v0.4.0-alpha sürüm notları için bkz. [CHANGELOG.md](CHANGELOG.md).

## Entegrasyonlar

Lore Context, MCP ve REST konuşur ve çoğu ajan IDE ve sohbet ön yüzüyle entegre olur:

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
| Diğer / genel MCP | [docs/integrations/README.md](integrations.md) |

## Dağıtım

| Mod | Ne zaman kullanılır | Belge |
|---|---|---|
| **Yerel dosya tabanlı** | Solo geliştirme, prototip, duman testi | Bu README, Yukarıdaki Hızlı Başlangıç |
| **Yerel Postgres+pgvector** | Üretim kalitesinde tek düğüm, ölçekte anlamsal arama | [docs/deployment/README.md](deployment.md) |
| **Docker Compose özel** | Kendi kendine barındırılan ekip dağıtımı, yalıtılmış ağ | [docs/deployment/compose.private-demo.yml](../../deployment/compose.private-demo.yml) |
| **Bulut yönetimli** | v0.6'da geliyor | — |

Tüm dağıtım yolları açık gizli bilgiler gerektirir: `POSTGRES_PASSWORD`, `LORE_API_KEYS`, `DASHBOARD_BASIC_AUTH_USER/PASS`. `scripts/check-env.mjs` betiği, herhangi bir değer yer tutucu desenle eşleşirse üretim başlatmayı reddeder.

## Güvenlik

v0.4.0-alpha, herkese açık olmayan alpha dağıtımları için uygun derinlemesine savunma duruşunu uygular:

- **Kimlik Doğrulama**: Rol ayrımıyla (`reader`/`writer`/`admin`) ve proje başına kapsam belirlemeyle API anahtarı taşıyıcı token'ları. Boş anahtar modu üretimde başarısızlıkla kapanır.
- **Hız Sınırı**: Kimlik doğrulama hatası geri çekilmesiyle IP başına + anahtar başına çift kova (60 saniyede 5 başarısızlıktan sonra 429, 30 saniyelik kilitleme).
- **Gösterge Tablosu**: HTTP Basic Auth ara katmanı. `DASHBOARD_BASIC_AUTH_USER/PASS` olmadan üretimde başlamayı reddeder.
- **Konteynerler**: Tüm Dockerfile'lar root olmayan `node` kullanıcısı olarak çalışır; api + dashboard üzerinde HEALTHCHECK.
- **Gizli Bilgiler**: Sıfır sabit kodlu kimlik bilgisi; tüm varsayılanlar zorunlu-yoksa-başarısız değişkenleridir. `scripts/check-env.mjs`, üretimde yer tutucu değerleri reddeder.
- **Yönetişim**: Yazmalarda PII / API anahtarı / JWT / özel anahtar regex taraması; riskli içerik otomatik olarak inceleme kuyruğuna yönlendirilir; her durum geçişinde değiştirilemez denetim günlüğü.
- **Bellek Zehirlenmesi**: Konsensüs + emir kipi fiil örüntüleri üzerinde sezgisel tespit.
- **MCP**: Her araç girişinde zod şeması doğrulaması; değiştiren araçlar `reason` (≥8 karakter) gerektirir ve `destructiveHint: true` yüzeyler; yukarı akış hataları istemci dönüşünden önce temizlenir.
- **Günlükleme**: `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key` alanlarını otomatik gizleyen yapılandırılmış JSON.

Güvenlik açığı bildirimleri: [SECURITY.md](SECURITY.md).

## Proje Yapısı

```text
apps/
  api/                # REST API + Postgres + yönetişim + eval (TypeScript)
  dashboard/          # Basic Auth ara katmanlı Next.js 16 gösterge tablosu
  mcp-server/         # MCP stdio sunucusu (eski + resmi SDK taşımaları)
  web/                # Sunucu taraflı HTML oluşturucu (JS-siz yedek UI)
  website/            # Pazarlama sitesi (ayrı yönetilir)
packages/
  shared/             # Paylaşılan tipler, hatalar, ID/token yardımcıları
  agentmemory-adapter # Yukarı akış agentmemory + sürüm araştırması köprüsü
  search/             # Takılabilir arama sağlayıcıları (BM25 / hibrit)
  mif/                # Bellek Değişim Biçimi (v0.2)
  eval/               # EvalRunner + metrik temel öğeleri
  governance/         # Durum makinesi + risk taraması + zehirleme + denetim
docs/
  i18n/<lang>/        # 17 dilde yerelleştirilmiş README
  integrations/       # 11 ajan-IDE entegrasyon kılavuzu
  deployment/         # Yerel + Postgres + Docker Compose
  legal/              # Gizlilik / Şartlar / Çerezler (Singapur hukuku)
scripts/
  check-env.mjs       # Üretim modu ortam doğrulama
  smoke-*.mjs         # Uçtan uca duman testleri
  apply-postgres-schema.mjs
```

## Gereksinimler

- Node.js `>=22`
- pnpm `10.30.1`
- (İsteğe Bağlı) Anlamsal arama kalitesinde bellek için pgvector'lı Postgres 16

## Katkıda Bulunma

Katkılar memnuniyetle karşılanır. Geliştirme iş akışı, commit mesajı protokolü ve inceleme beklentileri için lütfen [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun.

Belge çevirileri için [i18n katkı kılavuzuna](../README.md) bakın.

## İşleten

Lore Context, **REDLAND PTE. LTD.** (Singapur, UEN 202304648K) tarafından işletilmektedir. Şirket profili, yasal şartlar ve veri işleme [`docs/legal/`](../../legal/) altında belgelenmiştir.

## Lisans

Lore Context deposu [Apache License 2.0](../../../LICENSE) altında lisanslanmıştır. `packages/*` altındaki bireysel paketler, aşağı akış tüketimini kolaylaştırmak için MIT beyan eder. Yukarı akış atıfı için [NOTICE](../../../NOTICE) dosyasına bakın.

## Teşekkürler

Lore Context, yerel bellek çalışma zamanı olarak [agentmemory](https://github.com/agentmemory/agentmemory) üzerine inşa edilmiştir. Yukarı akış sözleşmesi ayrıntıları ve sürüm uyumluluk politikası [UPSTREAM.md](../../../UPSTREAM.md) dosyasında belgelenmiştir.
