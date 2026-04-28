# Lore Context'e Katkıda Bulunma

> 🤖 Bu belge İngilizce orijinalinden makine çevirisi ile oluşturulmuştur. PR ile iyileştirmeler memnuniyetle karşılanır — [çeviri katkı kılavuzuna](../README.md) bakın.

Lore Context'i geliştirdiğiniz için teşekkürler. Bu proje, alpha aşamasında bir AI ajan
bağlam kontrol düzlemidir; bu nedenle değişiklikler yerel öncelikli işlemi, denetlenebilirliği
ve dağıtım güvenliğini korumalıdır.

## Davranış Kuralları

Bu proje [Contributor Covenant](../../CODE_OF_CONDUCT.md)'ı izlemektedir. Katılarak
buna uymayı kabul edersiniz.

## Geliştirme Kurulumu

Gereksinimler:

- Node.js 22 veya daha yenisi
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (İsteğe Bağlı) Postgres yolu için Docker
- (İsteğe Bağlı) Şemayı kendiniz uygulamayı tercih ediyorsanız `psql`

Yaygın komutlar:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # docker compose up -d postgres gerektirir
pnpm run doctor
```

Paket bazlı çalışma için:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore/mcp-server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Pull Request Beklentileri

- **Değişiklikleri odaklı ve geri alınabilir tutun.** PR başına bir sorun; sorun başına bir PR.
- **Davranış değişiklikleri için testler ekleyin.** Anlık görüntüler yerine gerçek
  doğrulamaları tercih edin.
- **İnceleme istemeden önce `pnpm build` ve `pnpm test` çalıştırın.** CI de bunları
  çalıştırır, ancak yerel daha hızlıdır.
- **API, gösterge tablosu, MCP, Postgres, içe/dışa aktarma, eval veya dağıtım
  davranışını değiştirirken ilgili duman testini çalıştırın.**
- **Commit etmeyin**: oluşturulmuş derleme çıktısı, yerel depolar, `.env` dosyaları,
  kimlik bilgileri veya özel müşteri verisi. `.gitignore` çoğu yolu kapsar; yeni
  eserler oluşturursanız bunların hariç tutulduğundan emin olun.
- **PR'nizin kapsamında kalın.** İlgisiz kodu geçerken yeniden düzenlemeyin.

## Mimari Koruma Rayları

Bunlar v0.4.x için tartışmaya kapalıdır. Bir PR birini ihlal ederse, bölme veya
yeniden çalışma isteği bekleyin:

- **Yerel öncelik birincil kalır.** Yeni bir özellik barındırılan hizmet veya
  üçüncü taraf SaaS bağımlılığı olmadan çalışmalıdır.
- **Yeni kimlik doğrulama yüzeyi atlatması yok.** Her rota API anahtarı + rol
  tarafından geçitlenir. Loopback üretimde özel durum değildir.
- **Ham `agentmemory` maruziyeti yok.** Harici çağrıcılar belleğe yalnızca Lore
  uç noktaları aracılığıyla ulaşır.
- **Denetim günlüğü bütünlüğü.** Bellek durumunu etkileyen her mutasyon bir denetim
  girişi yazar.
- **Eksik yapılandırmada kapanır.** Üretim modu başlatması, zorunlu ortam değişkenleri
  yer tutucu veya eksikse başlamayı reddeder.

## Commit Mesajları

Lore Context, Linux çekirdek yönergelerinden ilham alan küçük, görüşlü bir commit
biçimi kullanır.

### Biçim

```text
<tür>: <emir kipinde kısa özet>

<bu değişikliğin neden gerekli olduğunu ve hangi ödünleşimlerin geçerli olduğunu
açıklayan isteğe bağlı gövde>

<isteğe bağlı fragmanlar>
```

### Türler

- `feat` — yeni kullanıcı görünür yetenek veya API uç noktası
- `fix` — hata düzeltme
- `refactor` — davranış değişikliği olmayan kod yeniden yapılandırma
- `chore` — depo hijyeni (bağımlılıklar, araçlar, dosya taşımaları)
- `docs` — yalnızca belgeler
- `test` — yalnızca test değişiklikleri
- `perf` — ölçülebilir etkiyle performans iyileştirme
- `revert` — önceki bir commit'i geri alma

### Stil

- Türü ve özetin ilk sözcüğünü **küçük harfle** yazın.
- Özet satırında **sondaki nokta yok**.
- Özet satırında **≤72 karakter**; gövdeyi 80'de kaydırın.
- **Emir kipi**: "fix loopback bypass", "fixed" veya "fixes" değil.
- **Neyi değil neden**: fark neyin değiştiğini gösterir; gövde neden açıklamalıdır.
- Kullanıcı tarafından açıkça istenmedikçe `Co-Authored-By` fragmanları, AI
  atıfı veya signed-off-by satırları **eklemeyin**.

### Kullanışlı Fragmanlar

İlgili olduğunda, kısıtlamaları ve inceleyici bağlamını yakalamak için fragmanlar ekleyin:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### Örnek

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

## Commit Ayrıntı Düzeyi

- Commit başına bir mantıksal değişiklik. İnceleyiciler yan hasar olmadan atomik
  olarak geri alabilir.
- PR açmadan veya güncellemeden önce önemsiz düzeltmeleri (`typo`, `lint`, `prettier`)
  ana commit'e squash edin.
- Çok dosyalı yeniden düzenlemeler tek bir nedeni paylaşıyorsa tek bir commit'te
  iyidir.

## İnceleme Süreci

- Bir bakımcı tipik aktivite sırasında PR'nizi 7 gün içinde inceleyecektir.
- Yeniden inceleme istemeden önce tüm engelleme yorumlarını ele alın.
- Engellemeyenler için, gerekçeyi satır içinde yanıtlamak veya bir takip sorunu
  oluşturmak kabul edilebilir.
- Bakımcılar PR onaylandıktan sonra `merge-queue` etiketi ekleyebilir; bu etiket
  uygulandıktan sonra rebase veya force-push yapmayın.

## Belge Çevirileri

Çevrilmiş bir README veya belge dosyasını geliştirmek istiyorsanız
[i18n katkı kılavuzuna](../../i18n/README.md) bakın.

## Hata Bildirme

- Hata bir güvenlik açığı değilse https://github.com/Lore-Context/lore-context/issues
  adresinde herkese açık konu açın.
- Güvenlik sorunları için [SECURITY.md](SECURITY.md) dosyasını izleyin.
- Şunları ekleyin: sürüm veya commit, ortam, yeniden üretim, beklenen vs gerçek,
  günlükler (hassas içerik gizlenerek).

## Teşekkürler

Lore Context, AI ajan altyapısı için yararlı bir şey yapmaya çalışan küçük bir
projedir. Her iyi kapsamlı PR onu ileriye taşır.
