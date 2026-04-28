# Entegrasyon Kılavuzları

> 🤖 Bu belge İngilizce orijinalinden makine çevirisi ile oluşturulmuştur. PR ile iyileştirmeler memnuniyetle karşılanır — [çeviri katkı kılavuzuna](../README.md) bakın.

Bu kılavuzlar, mevcut yerel MVP'ye karşı Lore Context entegrasyon sözleşmesini belgeler.

## Mevcut Depo Durumu

- Depo artık yerel REST API, bağlam yönlendirici/oluşturucu, isteğe bağlı JSON dosya
  kalıcılığı, isteğe bağlı Postgres çalışma zamanı deposu, izler, bellek içe/dışa
  aktarma, eval sağlayıcı karşılaştırması, API sunucu gösterge tablosu HTML, bağımsız
  Next.js gösterge tablosu ve `agentmemory` adaptör sınırı içerir.
- `apps/mcp-server/src/index.ts`, `LORE_API_URL` aracılığıyla araçları Lore REST
  API'sine proxy yapan ve yapılandırıldığında `LORE_API_KEY`'i Bearer token olarak
  ileten çalıştırılabilir stdio JSON-RPC MCP başlatıcısı sağlar. Eski yerleşik stdio
  döngüsünü ve `LORE_MCP_TRANSPORT=sdk` aracılığıyla resmi `@modelcontextprotocol/sdk`
  stdio taşımasını destekler.
- Aşağıdaki belgeler entegrasyon sözleşmeleridir. API öncelikli entegrasyonlar bugün
  yerel REST sunucusunu kullanabilir; MCP özellikli istemciler `pnpm build`'den sonra
  yerel stdio başlatıcısını kullanabilir.

## Paylaşılan Tasarım

- MCP özellikli istemciler ham `agentmemory`'ye değil, küçük bir Lore MCP sunucusuna
  bağlanmalıdır.
- API öncelikli istemciler Lore REST uç noktalarını çağırmalı; ana okuma yolu olarak
  `POST /v1/context/query` kullanılmalıdır.
- `POST /v1/context/query`, istemcilerin gerektiğinde bellek/web/depo/araç-iz
  yönlendirmesini zorlamasına veya devre dışı bırakmasına olanak tanıyan `mode`,
  `sources`, `freshness`, `token_budget`, `writeback_policy` ve `include_sources`
  kabul eder.
- Lore, yerel `agentmemory` çalışma zamanını `packages/agentmemory-adapter` aracılığıyla
  sarar.
- Yerel `agentmemory` `http://127.0.0.1:3111`'de beklenmektedir.

## Mevcut MCP Yüzeyi

- `context_query`
- `memory_write`
- `memory_search`
- `memory_forget`
- `memory_list`
- `memory_get`
- `memory_update`
- `memory_supersede`
- `memory_export`
- `eval_run`
- `trace_get`

## Mevcut REST Yüzeyi

- `GET /health`
- `GET /v1/integrations/agentmemory/health`
- `POST /v1/integrations/agentmemory/sync`
- `POST /v1/context/query`
- `POST /v1/memory/write`
- `POST /v1/memory/search`
- `POST /v1/memory/forget`
- `GET /v1/memory/list` isteğe bağlı `project_id`, `scope`, `status`, `memory_type`, `q` ve `limit` ile
- `GET /v1/memory/:id`
- `PATCH /v1/memory/:id`
- `POST /v1/memory/:id/supersede`
- `GET /v1/memory/export`
- `POST /v1/memory/import`
- `GET /v1/governance/review-queue`
- `POST /v1/governance/memory/:id/approve`
- `POST /v1/governance/memory/:id/reject`
- `POST /v1/events/ingest`
- `POST /v1/eval/run`
- `GET /v1/eval/providers`
- `GET /v1/eval/runs`
- `GET /v1/eval/runs/:id`
- `GET /v1/traces`
- `GET /v1/traces/:id`
- `POST /v1/traces/:id/feedback`
- `GET /v1/audit-logs`

## Yerel API Dumanı

```bash
pnpm build
LORE_STORE_PATH=./data/lore-store.json PORT=3000 pnpm start:api
curl http://localhost:3000/health
```

Otomatik duman yolu:

```bash
pnpm smoke:api
pnpm smoke:postgres
```

## Yerel MCP Dumanı

MCP başlatıcısı stdin üzerinden satır sınırlı JSON-RPC okur ve stdout'a yalnızca
JSON-RPC mesajları yazar:

```bash
pnpm build
pnpm smoke:mcp
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 node apps/mcp-server/dist/index.js
```

Paket yöneticisi başlıkları stdout'u kirletebileceğinden bu başlatıcıyı bir MCP
istemcisinden `pnpm start` aracılığıyla başlatmayın.

## Özel Dağıtım Hizalaması

[docs/deployment/README.md](deployment.md) içindeki özel demo paketlemesi şunları varsayar:

- Lore API ve gösterge tablosu uzun süreli konteyner olarak çalışır.
- Postgres, paylaşılan demolar için varsayılan dayanıklı depodur.
- MCP başlatıcısı istemciye yakın bir stdio süreci kalır veya isteğe bağlı `mcp`
  compose hizmeti olarak çalışır.
- Demo tohumlama [examples/demo-dataset/import/lore-demo-memories.json](../../../examples/demo-dataset/import/lore-demo-memories.json)'dan,
  eval dumanı [examples/demo-dataset/eval/lore-demo-eval-request.json](../../../examples/demo-dataset/eval/lore-demo-eval-request.json)'dan gelir.

Özel dağıtımlar için, istemci başlatıcılarını özel API URL'sine yönlendirin ve
uygun en küçük rolü sağlayın:

- `reader`: gösterge tablosu ve salt okunur kopyacılar.
- `writer`: bellek, geri bildirim veya eval çalıştırmaları yazması gereken ajanlar.
- `admin`: içe aktarma, dışa aktarma, yönetişim, denetim ve unutma akışları.

## Dağıtım Farkındalıklı İstemci Şablonları

### Claude Code

Özel API'yi hedefleyen iş istasyonu yerel stdio sürecini tercih edin:

```bash
claude mcp add --scope project \
  -e LORE_API_URL=http://127.0.0.1:3000 \
  -e LORE_API_KEY="${WRITE_KEY:?set WRITE_KEY}" \
  -e LORE_MCP_TRANSPORT=sdk \
  lore \
  -- node /absolute/path/to/Lore/apps/mcp-server/dist/index.js
```

Bunun yerine `node .../dist/index.js` yerine paketlenmiş MCP konteynerini
kullanıyorsanız, aynı `LORE_API_URL` / `LORE_API_KEY` çiftini koruyun ve stdio
başlatıcısını `docker compose run --rm mcp` aracılığıyla çalıştırın.

### Cursor

Cursor stili MCP JSON'u başlatıcıyı yerel tutmalı ve yalnızca API hedefini ve
anahtarı değiştirmelidir:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_READER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Yalnızca Cursor iş akışları kasıtlı olarak dayanıklı proje belleği geri yazıyorsa
`writer` anahtarı kullanın.

### Qwen Code

Qwen stili `mcpServers` JSON aynı sınırı izler:

```json
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["/absolute/path/to/Lore/apps/mcp-server/dist/index.js"],
      "env": {
        "LORE_API_URL": "http://127.0.0.1:3000",
        "LORE_API_KEY": "<YOUR_WRITER_KEY>",
        "LORE_MCP_TRANSPORT": "sdk"
      }
    }
  }
}
```

Yalnızca arama getirme asistanları için `reader`, `memory_write`, `memory_update`
veya `trace` geri bildirim araçlarına ihtiyaç duyan ajanlık akışlar için `writer`
kullanın.

## Güvenli Varsayılanlar

- Uzak taşıma gerektiğinde kimliği doğrulanmış akışlanabilir HTTP kullanın; MCP için
  yerel olarak `stdio`'yu tercih edin.
- SSE'yi varsayılan yol değil, eski uyumluluk olarak ele alın.
- `includeTools` veya istemci eşdeğeriyle araçları beyaz listeye alın.
- Varsayılan olarak geniş güven modlarını etkinleştirmeyin.
- Değiştirme işlemlerinde `reason` gerektirin.
- Bir admin kasıtlı olarak kontrollü kaldırma için `hard_delete: true` ayarlamadığı
  sürece `memory_forget`'i yumuşak silmede tutun.
- Paylaşılan yerel veya uzak API maruziyeti için `LORE_API_KEYS` rol ayrımını kullanın:
  salt okunur istemciler için `reader`, ajan geri yazması için `writer` ve yalnızca
  senkronizasyon/içe aktarma/dışa aktarma/unutma/yönetişim/denetim işlemleri için
  `admin`. İstemci anahtarlarını görebilecekleri veya değiştirebilecekleri projelere
  kapsama almak için `projectIds` ekleyin.
- `agentmemory`'yi `127.0.0.1`'e bağlı tutun.
- Ham `agentmemory` görüntüleyiciyi veya konsolunu herkese açık tutmayın.
- Mevcut canlı `agentmemory` 0.9.3 sözleşmesi: `remember`, `export`, `audit` ve
  `forget(memoryId)` Lore senkronizasyon/sözleşme testleri için kullanılabilir;
  `smart-search` gözlemleri arar ve yeni hatırlanan bellek kayıtlarının doğrudan
  aranabilir olduğunun kanıtı olarak ele alınmamalıdır.
