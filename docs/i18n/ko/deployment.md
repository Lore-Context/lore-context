> 🤖 이 문서는 영어 원본에서 기계 번역되었습니다. PR을 통한 개선을 환영합니다 — [번역 기여 가이드](../README.md) 참조.

# 프라이빗 배포

> **`openssl rand -hex 32`로 키를 생성하십시오 — 프로덕션에서 아래 플레이스홀더를 절대 사용하지 마십시오.**

이 섹션은 애플리케이션 코드 경로를 변경하지 않고 프라이빗 데모 또는 내부 팀 롤아웃을 위해 Lore를 패키징합니다. 배포 번들은 다음으로 구성됩니다:

- `apps/api/Dockerfile`: REST API 이미지.
- `apps/dashboard/Dockerfile`: 독립 실행형 Next.js 대시보드 이미지.
- `Dockerfile`: stdio 클라이언트를 위한 선택적 MCP 런처 이미지.
- `docs/deployment/compose.private-demo.yml`: Postgres, API, 대시보드 및 온디맨드 MCP 서비스를 위한 복사-붙여넣기 Compose 스택.
- `examples/demo-dataset/**`: 파일 저장소, 가져오기 및 eval 흐름을 위한 시드 데이터.

## 권장 토폴로지

- `postgres`: 공유 또는 멀티 운영자 데모를 위한 내구성 있는 저장소.
- `api`: 내부 브릿지 네트워크의 Lore REST API. 기본적으로 루프백에 게시됩니다.
- `dashboard`: 기본적으로 루프백에 게시되고 `LORE_API_URL`을 통해 API에 프록시되는 운영자 UI.
- `mcp`: 컨테이너화된 런처를 원하는 Claude, Cursor 및 Qwen 운영자를 위한 선택적 stdio 컨테이너. 호스트에서 `node apps/mcp-server/dist/index.js` 대신 사용합니다.

Compose 스택은 의도적으로 공개 노출을 좁게 유지합니다. Postgres, API 및 대시보드는 모두 가변화된 포트 매핑을 통해 기본적으로 `127.0.0.1`에 바인딩됩니다.

## 사전 점검

1. `.env.example`을 `.env.private`와 같은 프라이빗 런타임 파일로 복사하십시오.
2. `POSTGRES_PASSWORD`를 교체하십시오.
3. 단일 `LORE_API_KEY`보다 `LORE_API_KEYS`를 선호하십시오.
4. 전체 운영자 워크플로를 위해 `DASHBOARD_LORE_API_KEY`를 `admin` 키로 설정하거나, 읽기 전용 데모를 위해 범위 지정 `reader` 키로 설정하십시오. 클라이언트가 메모리를 변경해야 하는지 여부에 따라 `MCP_LORE_API_KEY`를 `writer` 또는 `reader` 키로 설정하십시오.

예시 역할 분리:

```bash
LORE_API_KEYS='[{"key":"<YOUR_READER_KEY>","role":"reader","projectIds":["demo-private"]},{"key":"<YOUR_WRITER_KEY>","role":"writer","projectIds":["demo-private"]},{"key":"<YOUR_ADMIN_KEY>","role":"admin"}]'
DASHBOARD_LORE_API_KEY=<YOUR_ADMIN_KEY>
MCP_LORE_API_KEY=<YOUR_WRITER_KEY>
```

## 스택 시작

레포지토리 루트에서 프라이빗 데모 스택을 빌드하고 시작하십시오:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private up --build -d
```

헬스 체크:

```bash
curl http://127.0.0.1:${API_PORT:-3000}/health
curl http://127.0.0.1:${DASHBOARD_PORT:-3001}
```

## 데모 데이터 시드

Postgres 기반 Compose 스택의 경우 API가 정상 상태가 된 후 패키지된 데모 메모리를 가져오십시오:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/memory/import \
  -H "Authorization: Bearer ${ADMIN_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/import/lore-demo-memories.json
```

패키지된 eval 요청을 실행하십시오:

```bash
curl -X POST http://127.0.0.1:${API_PORT:-3000}/v1/eval/run \
  -H "Authorization: Bearer ${WRITE_LORE_API_KEY:-<YOUR_API_KEY>}" \
  -H "Content-Type: application/json" \
  --data @examples/demo-dataset/eval/lore-demo-eval-request.json
```

데이터베이스 없는 단일 호스트 데모를 원하는 경우 파일 저장소 스냅샷을 API에 연결하십시오:

```bash
PORT=3000 \
LORE_STORE_PATH=./examples/demo-dataset/store/lore-demo-store.json \
pnpm start:api
```

## MCP 런처 패턴

선호하는 패턴:

- MCP 런처를 클라이언트 가까이에서 실행하십시오.
- `LORE_API_URL`을 프라이빗 API URL로 지정하십시오.
- 가장 작은 적합한 API 키를 런처에 제공하십시오.

호스트 기반 런처:

```bash
LORE_MCP_TRANSPORT=sdk \
LORE_API_URL=http://127.0.0.1:${API_PORT:-3000} \
LORE_API_KEY=${MCP_LORE_API_KEY:-<YOUR_API_KEY>} \
node apps/mcp-server/dist/index.js
```

컨테이너화된 런처:

```bash
docker compose -f docs/deployment/compose.private-demo.yml --env-file .env.private --profile mcp run --rm mcp
```

컨테이너화된 런처는 재현 가능한 워크스테이션 설정에 유용하지만, 장기 실행 공개 네트워크 서비스가 아닌 stdio 프로세스입니다.

## 보안 기본값

- 스택 앞에 인증된 역방향 프록시가 이미 없는 한 `API_BIND_HOST`, `DASHBOARD_BIND_HOST` 및 `POSTGRES_BIND_HOST`를 `127.0.0.1`로 유지하십시오.
- 모든 곳에서 단일 전역 관리자 키를 재사용하는 대신 `reader` / `writer` / `admin` 분리가 있는 `LORE_API_KEYS`를 선호하십시오.
- 데모 클라이언트에 프로젝트 범위 키를 사용하십시오. 패키지된 데모 프로젝트 id는 `demo-private`입니다.
- `AGENTMEMORY_URL`을 루프백으로 유지하고 원시 `agentmemory`를 직접 노출하지 마십시오.
- 프라이빗 배포가 실제로 라이브 agentmemory 런타임에 의존하지 않는 한 `LORE_AGENTMEMORY_REQUIRED=0`을 유지하십시오.
- 스키마 부트스트래핑이 릴리스 프로세스의 일부가 되면 `false`로 고정할 수 있는 제어된 내부 환경에서만 `LORE_POSTGRES_AUTO_SCHEMA=true`를 유지하십시오.

## 재사용할 파일

- Compose 샘플: [compose.private-demo.yml](../../../deployment/compose.private-demo.yml)
- API 이미지: [apps/api/Dockerfile](../../../../apps/api/Dockerfile)
- 대시보드 이미지: [apps/dashboard/Dockerfile](../../../../apps/dashboard/Dockerfile)
- MCP 이미지: [Dockerfile](../../../../Dockerfile)
- 데모 데이터: [examples/demo-dataset/README.md](../../../../examples/demo-dataset/README.md)
