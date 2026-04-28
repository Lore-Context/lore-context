# Özel Dağıtım

> 🤖 Bu belge İngilizce orijinalinden makine çevirisi ile oluşturulmuştur. PR ile iyileştirmeler memnuniyetle karşılanır — [çeviri katkı kılavuzuna](../README.md) bakın.

> **`openssl rand -hex 32` ile anahtarlar oluşturun — üretimde aşağıdaki yer tutucuları asla kullanmayın.**

Bu parça, uygulama kod yollarını değiştirmeden Lore'u özel bir demo veya dahili ekip
dağıtımı için paketler. Dağıtım paketi şunlardan oluşur:

- `apps/api/Dockerfile`: REST API görüntüsü.
- `apps/dashboard/Dockerfile`: bağımsız Next.js gösterge tablosu görüntüsü.
- `Dockerfile`: stdio istemcileri için isteğe bağlı MCP başlatıcı görüntüsü.
- `docs/deployment/compose.private-demo.yml`: Postgres, API, gösterge tablosu ve
  isteğe bağlı MCP hizmeti için kopyala-yapıştır compose yığını.
- `examples/demo-dataset/**`: dosya deposu, içe aktarma ve eval akışları için tohum verisi.

## Önerilen Topoloji

- `postgres`: paylaşılan veya çok operatörlü demolar için dayanıklı depo.
- `api`: varsayılan olarak loopback'e yayımlanan dahili köprü ağında Lore REST API.
- `dashboard`: varsayılan olarak loopback'e yayımlanan ve `LORE_API_URL` aracılığıyla
  API'ye proxy yapan operatör UI.
- `mcp`: konteynerleştirilmiş bir başlatıcı isteyen Claude, Cursor ve Qwen operatörleri
  için isteğe bağlı stdio konteyneri.

Compose yığını kasıtlı olarak herkese açık maruziyeti dar tutar. Postgres, API ve
gösterge tablosunun hepsi değişkenleştirilmiş port eşlemeleri aracılığıyla varsayılan
olarak `127.0.0.1`'e bağlanır.

## Ön Uçuş Kontrolleri

1. `.env.example`'ı `.env.private` gibi özel bir çalışma zamanı dosyasına kopyalayın.
2. `POSTGRES_PASSWORD`'ü değiştirin.
3. Tek `LORE_API_KEY` yerine `LORE_API_KEYS`'i tercih edin.
4. Tam operatör iş akışı için `DASHBOARD_LORE_API_KEY`'i bir `admin` anahtarına,
   salt okunur demolar için kapsama alınmış `reader` anahtarına ayarlayın. İstemcinin
   belleği değiştirmesine izin verilip verilmediğine bağlı olarak `MCP_LORE_API_KEY`'i
   `writer` veya `reader` anahtarına ayarlayın.

Örnek rol ayrımı:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
DASHBOARD_BASIC_AUTH_USER=admin
DASHBOARD_BASIC_AUTH_PASS=<YOUR_DASHBOARD_PASSWORD>
```

## Yığını Başlat

Repo kökünden özel demo yığınını derleyin ve başlatın:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

Sağlık kontrolleri:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl -u "${DASHBOARD_BASIC_AUTH_USER}:${DASHBOARD_BASIC_AUTH_PASS}" \
  http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## Demo Verisi Tohumla

Postgres destekli compose yığını için, API sağlıklı olduktan sonra paketlenmiş demo
belleklerini içe aktarın:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

Paketlenmiş eval isteğini çalıştırın:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

Bunun yerine sıfır veritabanı tek konakta demo istiyorsanız, API'yi dosya deposu
anlık görüntüsüne yönlendirin:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## MCP Başlatıcı Desenleri

Tercih edilen desen:

- MCP başlatıcıyı istemciye yakın çalıştırın.
- `LORE_API_URL`'yi özel API URL'sine yönlendirin.
- Başlatıcıya mümkün olan en küçük uygun API anahtarını sağlayın.

Konak tabanlı başlatıcı:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

Konteynerleştirilmiş başlatıcı:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

Konteynerleştirilmiş başlatıcı tekrarlanabilir iş istasyonu kurulumu için kullanışlıdır,
ancak uzun süreli çalışan bir genel ağ hizmeti değil, hâlâ bir stdio sürecidir.

## Güvenlik Varsayılanları

- Yığının önünde kimliği doğrulanmış bir ters proxy yoksa `API_BIND_HOST`,
  `DASHBOARD_BIND_HOST` ve `POSTGRES_BIND_HOST`'u `127.0.0.1`'de tutun.
- Her yerde tek global admin anahtarı kullanmak yerine `reader` / `writer` / `admin`
  ayrımıyla `LORE_API_KEYS`'i tercih edin.
- Demo istemcileri için proje kapsamlı anahtarlar kullanın. Paketlenmiş demo proje
  kimliği `demo-private`'dır.
- `AGENTMEMORY_URL`'yi loopback'te tutun ve ham `agentmemory`'yi doğrudan açık
  tutmayın.
- Özel dağıtım gerçekten canlı agentmemory çalışma zamanına bağlı değilse
  `LORE_AGENTMEMORY_REQUIRED=0`'da bırakın.
- `LORE_POSTGRES_AUTO_SCHEMA=true`'yu yalnızca kontrollü dahili ortamlar için
  açık tutun. Şema önyükleme sürüm sürecinizin bir parçası olduğunda `false`'a
  sabitleyebilirsiniz.

## Yeniden Kullanılacak Dosyalar

- Compose örneği: [compose.private-demo.yml](../../deployment/compose.private-demo.yml)
- API görüntüsü: [apps/api/Dockerfile](../../../apps/api/Dockerfile)
- Gösterge tablosu görüntüsü: [apps/dashboard/Dockerfile](../../../apps/dashboard/Dockerfile)
- MCP görüntüsü: [Dockerfile](../../../Dockerfile)
- Demo verisi: [examples/demo-dataset/README.md](../../../examples/demo-dataset/README.md)
