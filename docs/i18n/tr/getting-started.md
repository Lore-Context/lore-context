# Başlarken

> 🤖 Bu belge İngilizce orijinalinden makine çevirisi ile oluşturulmuştur. PR ile iyileştirmeler memnuniyetle karşılanır — [çeviri katkı kılavuzuna](../README.md) bakın.

Bu kılavuz, sizi sıfırdan çalışan bir Lore Context örneğine, yazılmış bellek, sorgulanmış
bağlam ve erişilebilir gösterge tablosuna götürür. Toplam ~15 dakika, temel yol için
~5 dakika planlayın.

## Ön Koşullar

- **Node.js** `>=22` (`nvm`, `mise` veya dağıtımınızın paket yöneticisini kullanın)
- **pnpm** `10.30.1` (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- (İsteğe Bağlı) Postgres+pgvector yolu için **Docker + Docker Compose**
- (İsteğe Bağlı) Şemayı kendiniz uygulamayı tercih ediyorsanız **psql**

## 1. Klonla ve Kur

```bash
git clone https://github.com/Lore-Context/lore-context.git
cd lore-context
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

`pnpm test` yeşil değilse devam etmeyin — hata günlüğüyle bir konu açın.

## 2. Gerçek Gizli Bilgiler Oluştur

Lore Context, üretimde yer tutucu değerlerle başlamayı reddeder. Alışkanlıklarınızı
tutarlı tutmak için yerel geliştirme için bile gerçek anahtarlar oluşturun.

```bash
export LORE_API_KEY=$(openssl rand -hex 32)
export DASHBOARD_BASIC_AUTH_USER=admin
export DASHBOARD_BASIC_AUTH_PASS=$(openssl rand -hex 24)
```

Çoklu rol yerel kurulumları için:

```bash
export READER_KEY=$(openssl rand -hex 32)
export WRITER_KEY=$(openssl rand -hex 32)
export ADMIN_KEY=$(openssl rand -hex 32)
export LORE_API_KEYS='[
  {"key":"'"$READER_KEY"'","role":"reader","projectIds":["demo"]},
  {"key":"'"$WRITER_KEY"'","role":"writer","projectIds":["demo"]},
  {"key":"'"$ADMIN_KEY"'","role":"admin"}
]'
```

## 3. API'yi Başlat (dosya tabanlı, veritabanı yok)

En basit yol, depolama arka ucu olarak yerel bir JSON dosyası kullanır. Solo geliştirme
ve duman testi için uygundur.

```bash
PORT=3000 \
  LORE_STORE_PATH=./data/lore-store.json \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Başka bir kabukta sağlığı doğrulayın:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Beklenen: `{"status":"ok",...}`.

## 4. İlk Belleğinizi Yazın

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/memory/write \
  -d '{
    "content": "Use Postgres pgvector for Lore Context production storage.",
    "memory_type": "project_rule",
    "project_id": "demo",
    "scope": "project"
  }' | jq
```

Beklenen: yeni belleğin `id`'si ve `active` ya da `candidate` (içerik bir gizli bilgi
gibi risk desenini eşleştirmişse sonraki) değerinde `governance.state` ile `200` yanıtı.

## 5. Bağlam Oluştur

```bash
curl -s -H "Authorization: Bearer $LORE_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3000/v1/context/query \
  -d '{
    "query": "production storage",
    "project_id": "demo",
    "token_budget": 1200
  }' | jq
```

`evidence.memory` dizisinde alıntılanan belleğinizi ve daha sonra yönlendirme ve
geri bildirimi incelemek için kullanabileceğiniz bir `traceId` görmelisiniz.

## 6. Gösterge Tablosunu Başlat

Yeni bir terminalde:

```bash
LORE_API_URL=http://127.0.0.1:3000 \
  DASHBOARD_BASIC_AUTH_USER="$DASHBOARD_BASIC_AUTH_USER" \
  DASHBOARD_BASIC_AUTH_PASS="$DASHBOARD_BASIC_AUTH_PASS" \
  pnpm dev:dashboard
```

Tarayıcınızda http://127.0.0.1:3001 adresini açın. Tarayıcı Basic Auth kimlik bilgileri
isteyecektir. Kimlik doğrulandıktan sonra gösterge tablosu bellek envanterini, izleri,
eval sonuçlarını ve yönetişim inceleme kuyruğunu gösterir.

## 7. (İsteğe Bağlı) MCP Aracılığıyla Claude Code'a Bağlan

Claude Code'un `claude_desktop_config.json` MCP sunucuları bölümüne şunu ekleyin:

```json
{
  "mcpServers": {
    "lore-context": {
      "command": "node",
      "args": ["/absolute/path/to/lore-context/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<buraya $LORE_API_KEY değerini yapıştırın>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Claude Code'u yeniden başlatın. Lore Context MCP araçları (`context_query`,
`memory_write` vb.) kullanılabilir hale gelir.

Diğer ajan IDE'leri (Cursor, Qwen, Dify, FastGPT vb.) için
[docs/integrations/README.md](integrations.md) içindeki entegrasyon matrisine bakın.

## 8. (İsteğe Bağlı) Postgres + pgvector'a Geçiş

JSON dosya depolamasını aştığınızda:

```bash
docker compose up -d postgres
pnpm db:schema   # apps/api/src/db/schema.sql'i psql aracılığıyla uygular
```

Ardından API'yi `LORE_STORE_DRIVER=postgres` ile başlatın:

```bash
PORT=3000 \
  LORE_STORE_DRIVER=postgres \
  LORE_DATABASE_URL='postgres://lore:'"$POSTGRES_PASSWORD"'@127.0.0.1:5432/lore_context' \
  LORE_API_KEY="$LORE_API_KEY" \
  pnpm start:api
```

Yazma-yeniden başlatma-okuma gidiş-dönüşünün hayatta kaldığını doğrulamak için
`pnpm smoke:postgres` çalıştırın.

## 9. (İsteğe Bağlı) Demo Veri Kümesini Tohumlayın ve Değerlendirme Çalıştırın

```bash
LORE_API_KEY="$LORE_API_KEY" pnpm seed:demo
LORE_API_KEY="$LORE_API_KEY" pnpm eval:report -- --project-id demo-private
```

Değerlendirme raporu Markdown ve JSON olarak `output/eval-reports/` dizinine iner.

## Sonraki Adımlar

- **Üretim dağıtımı** — [docs/deployment/README.md](deployment.md)
- **API Referansı** — [docs/api-reference.md](api-reference.md)
- **Mimari derinlemesine inceleme** — [docs/architecture.md](architecture.md)
- **Yönetişim inceleme iş akışı** — [docs/architecture.md](architecture.md) içindeki
  `Yönetişim Akışı` bölümüne bakın
- **Bellek taşınabilirliği (MIF)** — `pnpm --filter @lore/mif test` gidiş-dönüş örnekleri gösterir
- **Katkıda Bulun** — [CONTRIBUTING.md](CONTRIBUTING.md)

## Yaygın Tuzaklar

| Belirti | Neden | Düzeltme |
|---|---|---|
| `EADDRINUSE: address already in use 0.0.0.0:3000` | Başka bir süreç 3000 portunda | Bulmak için `lsof -i :3000`; veya `PORT=3010` ayarla |
| `503 Dashboard Basic Auth not configured` | `DASHBOARD_BASIC_AUTH_USER/PASS` olmadan üretim modu | Ortam değişkenlerini dışa aktarın veya `LORE_DASHBOARD_DISABLE_AUTH=1` geçirin (yalnızca geliştirme) |
| `[check-env] ERROR: ... contain placeholder/demo values` | Herhangi bir ortam değişkeni `admin-local` / `change-me` / `demo` vb. ile eşleşti | `openssl rand -hex 32` aracılığıyla gerçek değerler oluşturun |
| `429 Too Many Requests` | Hız sınırı tetiklendi | Soğuma penceresini bekleyin (5 kimlik doğrulama başarısızlığından sonra varsayılan 30 saniye); veya geliştirmede `LORE_RATE_LIMIT_DISABLED=1` ayarlayın |
| `agentmemory adapter unhealthy` | Yerel agentmemory çalışma zamanı çalışmıyor | agentmemory başlatın veya sessiz atlama için `LORE_AGENTMEMORY_REQUIRED=0` ayarlayın |
| MCP istemcisi `-32602 Invalid params` görüyor | Araç girişi zod şema doğrulamasından geçemedi | Hata gövdesindeki `invalid_params` dizisini kontrol edin |
| Her sayfada Dashboard 401 | Yanlış Basic Auth kimlik bilgileri | Ortam değişkenlerini yeniden dışa aktarın ve gösterge tablosu sürecini yeniden başlatın |

## Yardım Alma

- Hata bildir: https://github.com/Lore-Context/lore-context/issues
- Güvenlik bildirimi: bkz. [SECURITY.md](SECURITY.md)
- Belge katkısı: bkz. [CONTRIBUTING.md](CONTRIBUTING.md)
