# Değişiklik Günlüğü

> 🤖 Bu belge İngilizce orijinalinden makine çevirisi ile oluşturulmuştur. PR ile iyileştirmeler memnuniyetle karşılanır — [çeviri katkı kılavuzuna](../README.md) bakın.

Lore Context'teki tüm önemli değişiklikler burada belgelenmiştir. Biçim,
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) temel alınmıştır ve bu proje
[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)'a uymaktadır.

## [v0.4.0-alpha] — 2026-04-28

İlk halka açık alpha. Denetim başarısız MVP'yi sürüm adayı alphaya dönüştüren üretim sertleştirme sprintini kapatır. Tüm P0 denetim öğeleri temizlendi, 13 P1 öğesinden 12'si temizlendi (biri kısmi — Notlar'a bakın), 117+ test geçiyor, tam monorepo derleme temiz.

### Eklenenler

- **`packages/eval/src/runner.ts`** — gerçek `EvalRunner` (`runEval` / `persistRun` /
  `loadRuns` / `diffRuns`). Değerlendirme artık kullanıcıya ait bir veri kümesine karşı
  uçtan uca getirme değerlendirmesi çalıştırabilir ve çalıştırmaları zamanlar arası regresyon
  tespiti için JSON olarak kalıcı hale getirebilir.
- **`packages/governance/src/state.ts`** — altı durumlu yönetişim durum makinesi
  (`candidate / active / flagged / redacted / superseded / deleted`) açık yasal
  geçiş tablosuyla. Geçersiz geçişler hata fırlatır.
- **`packages/governance/src/audit.ts`** — `@lore/shared` `AuditLog` tipiyle entegre
  değiştirilemez denetim günlüğü ekleme yardımcısı.
- **`packages/governance/detectPoisoning`** — aynı kaynak baskınlığı (>%80) ve
  emir kipi fiil örüntü eşleşmesi kullanan bellek zehirleme tespiti için sezgisel.
- **`packages/agentmemory-adapter/validateUpstreamVersion`** — el yapımı karşılaştırmayla
  (yeni bağımlılık yok) semver tabanlı yukarı akış sürüm araştırması.
  Sessiz atlama düşük modu için `LORE_AGENTMEMORY_REQUIRED=0`'ı destekler.
- **`packages/mif`** — `LoreMemoryItem`'a `supersedes: string[]` ve
  `contradicts: string[]` alanları eklendi. JSON ve Markdown biçimlerinde gidiş-dönüş korunur.
- **`apps/api/src/logger.ts`** — hassas alanların (`content` / `query` / `memory` /
  `value` / `password` / `secret` / `token` / `key`) otomatik gizlemesiyle yapılandırılmış
  JSON günlükleyici. `requestId` her istekte akar.
- **`apps/dashboard/middleware.ts`** — HTTP Basic Auth ara katmanı. `DASHBOARD_BASIC_AUTH_USER`
  ve `DASHBOARD_BASIC_AUTH_PASS` olmadan üretim başlatmayı reddeder.
- **`scripts/check-env.mjs`** — üretim modu ortam doğrulayıcısı. Herhangi bir ortam değeri
  yer tutucu desenle (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`,
  `test`, `dev`, `password`) eşleşirse uygulamayı başlatmayı reddeder.
- **Hız Sınırı** — kimlik doğrulama hatası geri çekilmesiyle IP başına ve anahtar başına
  çift kova token sınırlayıcı (60 saniyede 5 başarısızlık → 30 saniyelik kilitleme → 429
  yanıtı). `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED` aracılığıyla yapılandırılabilir.
- **Düzgün Kapatma** — SIGTERM/SIGINT işleyicileri devam eden istekleri 10 saniyeye kadar
  boşaltır, bekleyen Postgres yazmalarını temizler, havuzu kapatır, 15 saniyede zorla çıkar.
- **Veritabanı indeksleri** — `memory_records`, `context_traces`, `audit_logs`, `event_log`,
  `eval_runs` için `(project_id)` / `(status)` / `(created_at)` üzerinde B-tree indeksleri.
  jsonb `content` ve `metadata` üzerinde GIN indeksleri.
- **MCP zod girdi doğrulama** — her MCP aracı artık araç başına zod şemasına karşı
  `safeParse` çalıştırır; başarısızlıklar temizlenmiş sorunlarla JSON-RPC `-32602` döndürür.
- **MCP `destructiveHint` + zorunlu `reason`** — her değiştiren araç
  (`memory_forget`, `memory_update`, `memory_supersede`, `memory_redact`) en az 8 karakter
  `reason` gerektirir ve şemalarında `destructiveHint: true` yüzeyler.
- `apps/api`, `apps/mcp-server`, `packages/eval`, `packages/governance`, `packages/mif`,
  `packages/agentmemory-adapter` genelinde 117+ yeni test senaryosu.
- Çok dilli belgeler: `docs/i18n/<lang>/` altında 17 dilde README.
- `CHANGELOG.md` (bu dosya).
- `docs/getting-started.md` — 5 dakikalık geliştirici hızlı başlangıcı.
- `docs/api-reference.md` — REST API uç nokta referansı.
- `docs/i18n/README.md` — çeviri katkı kılavuzu.

### Değişenler

- **`packages/mif`** zarf sürümü `"0.1"` → `"0.2"`. Geriye dönük uyumlu içe aktarma.
- **`LORE_POSTGRES_AUTO_SCHEMA`** varsayılanı `true` → `false`. Üretim dağıtımları
  şema otomatik uygulamasına açıkça katılmalı veya `pnpm db:schema` çalıştırmalıdır.
- **`apps/api`** istek gövde ayrıştırıcısı artık sabit yük boyutu sınırıyla akışlı
  (`LORE_MAX_JSON_BYTES`, varsayılan 1 MiB). Aşırı büyük istekler 413 döndürür.
- **Loopback kimlik doğrulama** değiştirildi: URL `Host` başlığına güvenden kaldırıldı;
  loopback tespiti artık yalnızca `req.socket.remoteAddress` kullanır. API anahtarı
  yapılandırılmamış üretimde API kapanır ve istekleri reddeder (önceden: sessizce admin
  veriliyordu).
- **Kapsamlı API anahtarları** artık `/v1/memory/list`, `/v1/eval/run` ve
  `/v1/memory/import` için `project_id` sağlamalıdır (önceden: tanımsız `project_id`
  kısa devre yapıyordu).
- **Tüm Dockerfile'lar** artık root olmayan `node` kullanıcısı olarak çalışır.
  `apps/api/Dockerfile` ve `apps/dashboard/Dockerfile` `HEALTHCHECK` bildirir.
- **`docker-compose.yml`** `POSTGRES_PASSWORD` artık `${POSTGRES_PASSWORD:?must
  be set}` kullanır — açık şifre olmadan başlatma hızla başarısız olur.
- **`docs/deployment/compose.private-demo.yml`** — aynı zorunlu-yoksa-başarısız deseni.
- **`.env.example`** — tüm demo varsayılanları kaldırılarak `# REQUIRED` yer tutucularıyla
  değiştirildi. Hız sınırı, istek zaman aşımı, yük sınırı, agentmemory zorunlu modu,
  gösterge tablosu temel kimlik doğrulama için yeni değişkenler belgelendi.

### Düzeltilenler

- **Loopback atlatma kimlik doğrulama güvenlik açığı** (P0). Saldırgan, loopback tespitini
  taklit etmek ve API anahtarı olmadan admin rolü almak için `Host: 127.0.0.1` gönderebiliyordu.
- **Gösterge tablosu proxy'sindeki confused-deputy** (P0). Gösterge tablosu proxy'si,
  kimliği doğrulanmamış istekler için `LORE_API_KEY` enjekte ediyordu; bu da 3001 portuna
  ulaşabilen herkese admin yetkisi veriyordu.
- **Kaba kuvvet savunması** (P0). README/`.env.example` içindeki demo anahtarları
  (`admin-local`, `read-local`, `write-local`) sınırsız sıralanabiliyordu; hız sınırı
  ve kaldırılan varsayılanlar buna karşı savunuyor.
- **Hatalı biçimlendirilmiş `LORE_API_KEYS` üzerinde JSON ayrıştırma çöküşü** — işlem
  artık yığın izi fırlatmak yerine net bir hatayla çıkıyor.
- **Büyük istek gövdesi üzerinden OOM** — yapılandırılan sınırın üzerindeki gövdeler
  artık Node sürecini çökertmek yerine 413 döndürüyor.
- **MCP hata sızıntısı** — ham SQL, dosya yolları veya yığın izleri içeren yukarı akış
  API hataları artık MCP istemcilerine ulaşmadan önce `{code, generic-message}` biçimine
  temizleniyor.
- **Gösterge tablosu JSON ayrıştırma çöküşü** — geçersiz JSON yanıtları artık UI'ı
  çökertiyor; hatalar kullanıcı görünür durum olarak yüzeyleniyor.
- **MCP `memory_update` / `memory_supersede`** daha önce `reason` gerektirmiyordu;
  bu artık zod şemasıyla zorlanıyor.
- **Postgres havuzu**: `statement_timeout` artık 15 saniyeye ayarlı; önceden
  hatalı biçimlendirilmiş jsonb sorguları altında sınırsız sorgu süresi riski vardı.

### Güvenlik

- Tüm P0 denetim bulguları (loopback atlatma / gösterge tablosu kimlik doğrulama /
  hız sınırı / demo gizli bilgileri) temizlendi. Tam denetim izi için
  `Lore_Context_项目计划书_2026-04-27.md` ve
  `.omc/plans/lore-prelaunch-fixes-2026-04-28.md` dosyalarına bakın.
- `pnpm audit --prod` yayın zamanında sıfır bilinen güvenlik açığı raporluyor.
- Demo kimlik bilgileri tüm dağıtım şablonlarından ve örnek README'lerden kaldırıldı.
- Konteyner görüntüleri artık varsayılan olarak root olmayan kullanıcı olarak çalışıyor.

### Notlar / Bilinen Sınırlamalar

- **Kısmi P1-1**: `/v1/context/query`, mevcut tüketici testlerini kırmamak için izin
  verici kapsamlı anahtar davranışını korur. Diğer etkilenen rotalar (`/v1/memory/list`,
  `/v1/eval/run`, `/v1/memory/import`) `project_id` zorunlu kılar. v0.5 için takip ediliyor.
- **Barındırılan çok kiracılı bulut senkronizasyonu** v0.4.0-alpha'da uygulanmadı. Yalnızca
  yerel ve Compose-özel dağıtımlar.
- **Çeviri kalitesi**: README yerelleştirmeleri LLM tarafından oluşturulmuş ve açıkça
  etiketlenmiştir; her yerel ayarı geliştirmek için topluluk PR'ları memnuniyetle karşılanır
  (bkz. [`docs/i18n/README.md`](../../i18n/README.md)).
- **OpenAPI / Swagger spec** henüz paketlenmedi. REST yüzeyi
  [`docs/api-reference.md`](../../api-reference.md) altında düz metin olarak belgelenmiştir.
  v0.5 için takip ediliyor.

### Teşekkürler

Bu sürüm, yapılandırılmış denetim planına karşı paralel alt ajan yürütmesini içeren tek
günlük üretim sertleştirme sprintinin sonucudur. Plan ve denetim eserleri `.omc/plans/`
altında korunmaktadır.

## [v0.0.0] — ön sürüm

Halka açık olarak yayımlanmamış dahili geliştirme kilometre taşları. Uygulananlar:

- Çalışma alanı paket iskeletleri (TypeScript monorepo, pnpm çalışma alanları).
- Paylaşılan TypeScript derleme/test hattı.
- `@lore/shared` içinde bellek / bağlam / eval / denetim tip sistemi.
- `agentmemory` adaptör sınırı.
- Bağlam yönlendirici ve oluşturuculu yerel REST API.
- JSON dosya kalıcılığı + artımlı upsert ile isteğe bağlı Postgres çalışma zamanı deposu.
- Açık zorla silmeyle bellek ayrıntısı / düzenleme / yenileme / unutma akışları.
- Gerçek bellek kullanım muhasebesi (`useCount`, `lastUsedAt`).
- İz geri bildirimi (`useful` / `wrong` / `outdated` / `sensitive`).
- Yönetişim alanlarıyla MIF benzeri JSON + Markdown içe/dışa aktarma.
- Gizli bilgi tarama regex seti.
- Doğrudan oturum tabanlı eval metrikleri; sağlayıcı karşılaştırma eval çalıştırmaları;
  eval çalıştırma listesi.
- Reader/writer/admin rol ayrımıyla API anahtarı koruması.
- Yönetişim inceleme kuyruğu; denetim günlüğü API'si.
- API sunucu gösterge tablosu HTML; bağımsız Next.js gösterge tablosu.
- Demo tohum verisi; entegrasyon yapılandırma üretimi.
- Özel Docker/Compose paketleme.
- Eski + resmi SDK stdio MCP taşımaları.

[v0.4.0-alpha]: https://github.com/Lore-Context/lore-context/releases/tag/v0.4.0-alpha
[v0.0.0]: https://github.com/Lore-Context/lore-context
