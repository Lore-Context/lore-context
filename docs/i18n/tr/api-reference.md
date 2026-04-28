# API Referansı

> 🤖 Bu belge İngilizce orijinalinden makine çevirisi ile oluşturulmuştur. PR ile iyileştirmeler memnuniyetle karşılanır — [çeviri katkı kılavuzuna](../README.md) bakın.

Lore Context, `/v1/*` altında bir REST API ve bir stdio MCP sunucusu sunar. Bu belge
REST yüzeyini kapsar. MCP araç adları en sonda listelenmiştir.

Tüm örnekler şunu varsayar:

```bash
export API=http://127.0.0.1:3000
export AUTH="Authorization: Bearer $LORE_API_KEY"
```

## Kurallar

- Tüm uç noktalar JSON kabul eder ve döndürür.
- Kimlik Doğrulama: `Authorization: Bearer <key>` başlığı (veya `x-lore-api-key`).
  `/health`, kimlik doğrulamasız tek rotadır.
- Roller: `reader < writer < admin`. Her uç nokta minimum rolünü listeler.
- Hatalar: `{ "error": { "code": string, "message": string, "status": number,
  "requestId": string } }`.
- Hız sınırları: Her yanıtta `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset` başlıkları. `429 Too Many Requests` bir `Retry-After`
  başlığı içerir.
- Tüm mutasyonlar denetim günlüğüne kaydedilir. Admin'e özel erişim
  `/v1/governance/audit-log` aracılığıyla.

## Sağlık ve Hazırlık

### `GET /health`
- **Kimlik Doğrulama**: yok
- **Yanıt 200**: `{ "status": "ok", "version": "0.4.0-alpha", "uptime": number,
  "checks": { "store": "ok", "agentmemory": "ok"|"degraded"|"unreachable" } }`

## Bağlam

### `POST /v1/context/query`
Bellek + web + depo + araç izlerinden bağlam oluştur.

- **Kimlik Doğrulama**: reader+
- **Gövde**: `{ "query": string, "project_id"?: string, "token_budget"?: number,
  "include_routes"?: ["memory","web","repo","tool_traces"], "scope"?: "project"|"global" }`
- **Yanıt 200**: `{ "context": string, "evidence": { "memory": [...], "web": [...],
  "repo": [...], "tool_traces": [...] }, "warnings": [...], "confidence": number,
  "tokens_used": number, "latency_ms": number, "traceId": string }`

## Bellek

### `POST /v1/memory/write`
- **Kimlik Doğrulama**: writer+ (proje kapsamlı yazarlar eşleşen `project_id` içermeli)
- **Gövde**: `{ "content": string, "memory_type": string, "project_id": string,
  "scope"?: "project"|"global", "valid_until"?: ISO-8601, "confidence"?: number,
  "source_refs"?: string[], "metadata"?: object }`
- **Yanıt 200**: `{ "id": string, "governance": { "state": GovState,
  "risk_tags": string[] } }`

### `GET /v1/memory/:id`
- **Kimlik Doğrulama**: reader+
- **Yanıt 200**: yönetişim durumu dahil tam bellek kaydı.

### `POST /v1/memory/:id/update`
Bir belleği yerinde yama uygula (yalnızca küçük düzeltmeler).
- **Kimlik Doğrulama**: writer+
- **Gövde**: `{ "content"?: string, "metadata"?: object, "valid_until"?: ISO-8601 }`

### `POST /v1/memory/:id/supersede`
Eskisinin yerine geçen yeni bir bellek oluştur.
- **Kimlik Doğrulama**: writer+
- **Gövde**: `{ "content": string, "reason": string }`
- **Yanıt 200**: `{ "new_id": string, "superseded_id": string }`

### `POST /v1/memory/forget`
Varsayılan olarak yumuşak silme; admin zorlama silebilir.
- **Kimlik Doğrulama**: writer+ (yumuşak) / admin (zorlama)
- **Gövde**: `{ "memory_id": string, "reason": string, "hard_delete"?: boolean }`

### `POST /v1/memory/search`
Oluşturma olmadan doğrudan arama.
- **Kimlik Doğrulama**: reader+
- **Gövde**: `{ "query": string, "project_id"?: string, "limit"?: number,
  "include_states"?: GovState[] }`

### `GET /v1/memory/list`
- **Kimlik Doğrulama**: reader+
- **Sorgu**: `project_id` (kapsamlı anahtarlar için ZORUNLU), `state`, `limit`, `offset`
- **Yanıt 200**: `{ "memories": [...], "total": number, "limit": number,
  "offset": number }`

### `GET /v1/memory/export`
Belleği MIF v0.2 JSON olarak dışa aktar.
- **Kimlik Doğrulama**: admin
- **Sorgu**: `project_id`, `format` (`json` veya `markdown`)
- **Yanıt 200**: `provenance`, `validity`, `confidence`, `source_refs`, `supersedes`,
  `contradicts` içeren MIF zarfı.

### `POST /v1/memory/import`
MIF v0.1 veya v0.2 zarfını içe aktar.
- **Kimlik Doğrulama**: admin (veya açık `project_id` ile kapsamlı writer)
- **Gövde**: JSON dizesi veya nesne olarak MIF zarfı
- **Yanıt 200**: `{ "imported": number, "skipped": number, "errors": [...] }`

## Yönetişim

### `GET /v1/governance/review-queue`
- **Kimlik Doğrulama**: admin
- **Yanıt 200**: `{ "items": [{ "memory_id": string, "risk_tags": string[],
  "state": "candidate"|"flagged", "submitted_at": ISO-8601 }] }`

### `POST /v1/governance/memory/:id/approve`
candidate/flagged'i → active'e yükselt.
- **Kimlik Doğrulama**: admin
- **Gövde**: `{ "reason"?: string }`

### `POST /v1/governance/memory/:id/reject`
candidate/flagged'i → deleted'e yükselt.
- **Kimlik Doğrulama**: admin
- **Gövde**: `{ "reason": string }`

### `GET /v1/governance/audit-log`
- **Kimlik Doğrulama**: admin
- **Sorgu**: `project_id`, `actor`, `from`, `to`, `limit`, `offset`
- **Yanıt 200**: `{ "entries": AuditLog[], "total": number }`

## Değerlendirme

### `GET /v1/eval/providers`
- **Kimlik Doğrulama**: reader+
- **Yanıt 200**: `{ "providers": [{ "id": "lore-local"|"agentmemory-export"
  |"external-mock", "name": string, "supports_streaming": boolean }] }`

### `POST /v1/eval/run`
- **Kimlik Doğrulama**: writer+ (proje kapsamlı yazarlar eşleşen `project_id` içermeli)
- **Gövde**: `{ "dataset_id": string, "provider_ids": string[], "k": number,
  "project_id": string }`
- **Yanıt 200**: `{ "run_id": string, "metrics": { "recallAtK": number,
  "precisionAtK": number, "mrr": number, "staleHitRate": number, "latencyP95Ms":
  number }, "perItem": [...] }`

### `GET /v1/eval/runs/:run_id`
Kaydedilmiş bir değerlendirme çalıştırmasını getir.
- **Kimlik Doğrulama**: reader+

### `GET /v1/eval/report`
En son değerlendirmeyi Markdown veya JSON olarak göster.
- **Kimlik Doğrulama**: reader+
- **Sorgu**: `project_id`, `format` (`md`|`json`)

## Olaylar ve İzler

### `POST /v1/events/ingest`
Ajan telemetrisini Lore'a ilet.
- **Kimlik Doğrulama**: writer+
- **Gövde**: `{ "event_type": string, "agent_id": string, "payload": object }`

### `GET /v1/traces`
- **Kimlik Doğrulama**: reader+
- **Sorgu**: `project_id`, `traceId`, `from`, `to`, `limit`

### `GET /v1/traces/:trace_id`
Tek bir bağlam sorgusu izini incele.
- **Kimlik Doğrulama**: reader+

### `POST /v1/traces/:trace_id/feedback`
Bağlam sorgusu üzerinde geri bildirim kaydet.
- **Kimlik Doğrulama**: writer+
- **Gövde**: `{ "feedback": "useful"|"wrong"|"outdated"|"sensitive", "comment"?: string }`

## Entegrasyonlar

### `GET /v1/integrations/agentmemory/health`
agentmemory yukarı akış + sürüm uyumluluğunu kontrol et.
- **Kimlik Doğrulama**: reader+
- **Yanıt 200**: `{ "reachable": boolean, "upstreamVersion": string,
  "compatible": boolean, "warnings": string[] }`

### `POST /v1/integrations/agentmemory/sync`
agentmemory'den Lore'a bellek çek.
- **Kimlik Doğrulama**: admin (kapsamsız — senkronizasyon projeleri aşar)
- **Gövde**: `{ "project_id"?: string, "dry_run"?: boolean }`

## MCP Sunucusu (stdio)

MCP sunucusu aşağıdaki araçları sunar. Her aracın `inputSchema`'sı zod doğrulamalı
bir JSON Schema'dır. Değiştiren araçlar en az 8 karakter `reason` dizesi gerektirir.

| Araç | Değiştirir | Açıklama |
|---|---|---|
| `context_query` | hayır | Bir sorgu için bağlam oluştur |
| `memory_write` | evet | Yeni bellek yaz |
| `memory_search` | hayır | Oluşturma olmadan doğrudan arama |
| `memory_get` | hayır | Kimliğe göre getir |
| `memory_list` | hayır | Filtrelerle bellekleri listele |
| `memory_update` | evet | Yerinde yama uygula |
| `memory_supersede` | evet | Yeni sürümle değiştir |
| `memory_forget` | evet | Yumuşak veya zorlama silme |
| `memory_export` | hayır | MIF zarfını dışa aktar |
| `eval_run` | hayır | Veri kümesine karşı değerlendirme çalıştır |
| `trace_get` | hayır | İzi kimliğe göre incele |

JSON-RPC hata kodları:
- `-32602` Geçersiz parametreler (zod doğrulama başarısızlığı)
- `-32603` Dahili hata (temizlenmiş; orijinal stderr'e yazıldı)

Resmi SDK taşımasıyla çalıştır:
```bash
LORE_MCP_TRANSPORT=sdk LORE_API_URL=http://127.0.0.1:3000 \
  node apps/mcp-server/dist/index.js
```

## OpenAPI

Resmi OpenAPI 3.0 spec v0.5 için planlanmaktadır. O zamana kadar bu düz metin referansı
yetkilidir.
