# Güvenlik Politikası

> 🤖 Bu belge İngilizce orijinalinden makine çevirisi ile oluşturulmuştur. PR ile iyileştirmeler memnuniyetle karşılanır — [çeviri katkı kılavuzuna](../README.md) bakın.

Lore Context, bellek, izler, denetim günlükleri ve entegrasyon kimlik bilgilerini işler.
Güvenlik raporlarına yüksek öncelik olarak yaklaşın.

## Güvenlik Açığı Bildirme

Şüpheli güvenlik açıkları, sızdırılmış gizli bilgiler, kimlik doğrulama atlatmaları,
veri maruziyeti veya kiracı yalıtım sorunları için herkese açık bir konu açmayın.

Tercih edilen bildirim yolu:

1. Mevcut olduğunda bu depo için **GitHub özel güvenlik açığı bildirimi** kullanın.
2. Özel bildirim mevcut değilse, bakımcılarla özel olarak iletişime geçin ve şunları ekleyin:
   - etkilenen sürüm veya commit,
   - yeniden üretim adımları,
   - beklenen etki,
   - gerçek gizli bilgiler veya kişisel verilerin dahil olup olmadığı.

Güvenilir raporları 72 saat içinde onaylamayı hedefliyoruz.

## Desteklenen Sürümler

Lore Context şu anda 1.0 öncesi alpha yazılımdır. Güvenlik düzeltmeleri önce `main`
dalını hedefler. Etiketli sürümler, genel bir sürüm aşağı akış operatörleri tarafından
aktif olarak kullanıldığında hedeflenmiş yamalar alabilir.

| Sürüm | Destekleniyor |
|---|---|
| v0.4.x-alpha | ✅ Aktif |
| v0.3.x ve öncesi | ❌ Yalnızca ön sürüm dahili |

## Yerleşik Sertleştirme (v0.4.0-alpha)

Alpha, aşağıdaki derinlemesine savunma kontrollerini içerir. Operatörler bunların
kendi dağıtımlarında etkin olduğunu doğrulamalıdır.

### Kimlik Doğrulama

- **API anahtarı taşıyıcı token'ları** (`Authorization: Bearer <key>` veya
  `x-lore-api-key` başlığı).
- **Rol ayrımı**: `reader` / `writer` / `admin`.
- **Proje başına kapsam belirleme**: `LORE_API_KEYS` JSON girişleri
  `projectIds: ["..."]` izin listesi içerebilir; mutasyonlar eşleşen `project_id`
  gerektirir.
- **Boş anahtar modu üretimde kapanır**: `NODE_ENV=production` ve yapılandırılmış
  anahtar yoksa, API tüm istekleri reddeder.
- **Loopback atlatma kaldırıldı**: Önceki sürümler `Host: 127.0.0.1`'e güveniyordu;
  v0.4 yalnızca soket düzeyinde uzak adresi kullanır.

### Hız Sınırı

- Kimlik doğrulama hatası geri çekilmesiyle **IP başına ve anahtar başına çift kova sınırlayıcı**.
- **Varsayılanlar**: Kimlik doğrulanmamış yollar için IP başına dakikada 60 istek,
  kimlik doğrulanmış anahtar başına dakikada 600 istek.
- **60 saniye içinde 5 kimlik doğrulama başarısızlığı → 30 saniyelik kilitleme** (429 döndürür).
- Yapılandırılabilir: `LORE_RATE_LIMIT_PER_IP`, `LORE_RATE_LIMIT_PER_KEY`,
  `LORE_RATE_LIMIT_DISABLED=1` (yalnızca geliştirme).

### Gösterge Tablosu Koruması

- **HTTP Basic Auth ara katmanı** (`apps/dashboard/middleware.ts`).
- `DASHBOARD_BASIC_AUTH_USER` ve `DASHBOARD_BASIC_AUTH_PASS` olmadan
  **üretim başlatmayı reddeder**.
- `LORE_DASHBOARD_DISABLE_AUTH=1` yalnızca üretim dışında geçerlidir.
- Sunucu taraflı admin anahtar yedeği **kaldırıldı**: Bir kullanıcı, gösterge tablosu
  proxy'si yukarı akış API kimlik bilgileri enjekte etmeden önce Basic Auth aracılığıyla
  kimlik doğrulaması yapmış olmalıdır.

### Konteyner Sertleştirme

- Tüm Dockerfile'lar root olmayan `node` kullanıcısı olarak çalışır.
- `apps/api/Dockerfile` ve `apps/dashboard/Dockerfile`, `/health` karşısında
  `HEALTHCHECK` bildirir.
- `apps/mcp-server` yalnızca stdio'dur — ağ dinleyicisi yok — ve `HEALTHCHECK`
  bildirmiyor.

### Gizli Bilgi Yönetimi

- **Sıfır sabit kodlu kimlik bilgisi.** Tüm `docker-compose.yml`,
  `docs/deployment/compose.private-demo.yml` ve `.env.example` varsayılanları
  `${VAR:?must be set}` biçimini kullanır — açık değerler olmadan başlatma hızla
  başarısız olur.
- `scripts/check-env.mjs`, yer tutucu değerleri
  (`read-local`, `write-local`, `admin-local`, `change-me`, `demo`, `test`,
  `dev`, `password`) `NODE_ENV=production` olduğunda reddeder.
- Tüm dağıtım belgeleri ve örnek README'ler gerçek demo kimlik bilgilerinden
  temizlendi.

### Yönetişim

- **Her bellek yazmasında risk etiketi taraması**: API anahtarları, AWS anahtarları,
  JWT token'ları, özel anahtarlar, şifreler, e-posta adresleri, telefon numaraları tespit edilir.
- **Altı durumlu durum makinesi** açık yasal geçiş tablosuyla; geçersiz geçişler hata fırlatır.
- **Bellek zehirleme sezgiselleri**: aynı kaynak baskınlığı + emir kipi fiil örüntü
  eşleşmesi → `suspicious` bayrağı.
- **Değiştirilemez denetim günlüğü** her durum geçişinde eklenir.
- Yüksek riskli içerik otomatik olarak `candidate` / `flagged` durumuna yönlendirilir
  ve incelenene kadar bağlam oluşturumundan geri tutulur.

### MCP Sertleştirme

- Her MCP araç girişi çağrılmadan önce **bir zod şemasına karşı doğrulanır**.
  Doğrulama başarısızlıkları temizlenmiş sorun listesiyle JSON-RPC `-32602` döndürür.
- **Tüm değiştiren araçlar** en az 8 karakter `reason` dizesi gerektirir ve
  şemalarında `destructiveHint: true` yüzeyler.
- Yukarı akış API hataları MCP istemcilerine döndürülmeden önce **temizlenir** —
  ham SQL, dosya yolları ve yığın izleri silinir.

### Günlükleme

- `requestId` korelasyonuyla işleyici zinciri genelinde **yapılandırılmış JSON çıkışı**.
- `content`, `query`, `memory`, `value`, `password`, `secret`, `token`, `key` alanlarıyla
  eşleşen alanların **otomatik gizlemesi**. Bellek kayıtlarının ve sorguların gerçek içeriği
  asla günlüklere yazılmaz.

### Veri Sınırları

- `agentmemory` adaptörü, başlatmada yukarı akış sürümünü araştırır ve uyumsuzlukta
  uyarır. `LORE_AGENTMEMORY_REQUIRED=0`, yukarı akış ulaşılamaz durumdaysa adaptörü
  sessiz düşük moduna geçirir.
- `apps/api` istek gövde ayrıştırıcısı bir `LORE_MAX_JSON_BYTES` sınırı (varsayılan
  1 MiB) uygular; aşırı büyük istekler 413 döndürür.
- Postgres bağlantı havuzu, sorgu süresini sınırlamak için `statement_timeout: 15000`
  ayarlar.
- `LORE_REQUEST_TIMEOUT_MS` (varsayılan 30 saniye) her istek işleyicisini sınırlar;
  zaman aşımları 504 döndürür.

## Dağıtım Kılavuzu

- Yapılandırılmış `LORE_API_KEYS` olmadan Lore'u uzaktan açık tutmayın.
- **Rol ayrımlı** `reader` / `writer` / `admin` anahtarlarını tercih edin.
- Üretimde `DASHBOARD_BASIC_AUTH_USER` ve `DASHBOARD_BASIC_AUTH_PASS`'ı
  **her zaman ayarlayın**.
- **`openssl rand -hex 32` ile anahtarlar oluşturun**. Örneklerde gösterilen
  yer tutucu değerleri asla kullanmayın.
- Ham `agentmemory` uç noktalarını gizli tutun; bunlara yalnızca Lore aracılığıyla
  erişin.
- Loopback dışı herhangi bir maruz kalma için gösterge tablosunu, yönetişimi,
  içe/dışa aktarmayı, senkronizasyonu ve denetim rotalarını bir ağ erişim denetimi
  katmanının arkasında tutun (Cloudflare Access, AWS ALB, Tailscale ACL veya benzeri).
- **Üretimde API'yi başlatmadan önce `node scripts/check-env.mjs` çalıştırın.**
- Üretim `.env` dosyalarını, sağlayıcı API anahtarlarını, bulut kimlik bilgilerini,
  müşteri içeriği barındıran eval verilerini veya özel bellek dışa aktarmalarını
  **asla commit etmeyin**.

## Açıklama Zaman Çizelgesi

Onaylanmış yüksek etkili güvenlik açıkları için:

- 0 gün: rapor onaylandı.
- 7 gün: triyaj ve önem sınıflandırması raporlayıcıyla paylaşıldı.
- 30 gün: koordineli kamuoyu açıklaması (veya karşılıklı anlaşmayla uzatıldı).
- 30+ gün: uygulanabilirse orta+ önem için CVE düzenleme.

Daha düşük önemli sorunlar için sonraki küçük sürümde çözüm bekleyin.

## Sertleştirme Yol Haritası

Sonraki sürümler için planlanan öğeler:

- **v0.5**: OpenAPI / Swagger spec; `pnpm audit --high`, CodeQL statik analizi ve
  dependabot'un CI entegrasyonu.
- **v0.6**: Sigstore imzalı konteyner görüntüleri, SLSA provenance, uzun ömürlü
  token'lar yerine GitHub OIDC aracılığıyla npm yayınlama.
- **Future hosted hardening**: KMS zarf şifreleme aracılığıyla `risk_tags` ile işaretlenmiş bellek
  içeriği için bekleme sırasında şifreleme.
