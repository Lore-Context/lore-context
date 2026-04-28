> 🤖 이 문서는 영어 원본에서 기계 번역되었습니다. PR을 통한 개선을 환영합니다 — [번역 기여 가이드](../README.md) 참조.

# Lore Context 기여 가이드

Lore Context를 개선해 주셔서 감사합니다. 이 프로젝트는 알파 단계의 AI 에이전트 컨텍스트 컨트롤 플레인이므로, 변경 사항은 로컬 우선 운영, 감사 가능성 및 배포 안전성을 유지해야 합니다.

## 행동 강령

이 프로젝트는 [Contributor Covenant](../../CODE_OF_CONDUCT.md)를 따릅니다. 참여함으로써 이를 준수하는 데 동의합니다.

## 개발 환경 설정

요구 사항:

- Node.js 22 이상
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (선택 사항) Postgres 경로를 위한 Docker
- (선택 사항) 스키마를 직접 적용하려는 경우 `psql`

일반 명령:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # docker compose up -d postgres 필요
pnpm run doctor
```

패키지별 작업:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore/mcp-server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Pull Request 기대 사항

- **변경 사항을 집중적이고 되돌릴 수 있게 유지하십시오.** PR당 하나의 관심사. 관심사당 하나의 PR.
- 동작 변경에 대해 **테스트를 추가하십시오**. 스냅샷보다 실제 어설션을 선호하십시오.
- 검토를 요청하기 전에 **`pnpm build` 및 `pnpm test`를 실행하십시오**. CI도 실행하지만 로컬이 더 빠릅니다.
- API, 대시보드, MCP, Postgres, 가져오기/내보내기, eval 또는 배포 동작을 변경할 때 **관련 스모크 테스트를 실행하십시오**.
- 생성된 빌드 출력, 로컬 저장소, `.env` 파일, 자격증명 또는 개인 고객 데이터를 **커밋하지 마십시오**. `.gitignore`가 대부분의 경로를 커버합니다. 새 아티팩트를 생성하면 제외되었는지 확인하십시오.
- **PR 범위를 유지하십시오.** 관련 없는 코드를 드라이브바이 리팩터링하지 마십시오.

## 아키텍처 가드레일

이것들은 v0.4.x에 대해 협상 불가능합니다. PR이 이 중 하나를 위반하면 분할 또는 재작업 요청을 예상하십시오:

- **로컬 우선이 기본입니다.** 새 기능은 호스팅 서비스 또는 타사 SaaS 의존성 없이 작동해야 합니다.
- **새로운 인증 표면 우회 없음.** 모든 경로는 API 키 + 역할로 게이팅됩니다. 루프백은 프로덕션에서 특별한 경우가 아닙니다.
- **원시 `agentmemory` 노출 없음.** 외부 호출자는 Lore 엔드포인트를 통해서만 메모리에 접근합니다.
- **감사 로그 무결성.** 메모리 상태에 영향을 미치는 모든 변경은 감사 항목을 작성합니다.
- **누락된 구성에서 실패 폐쇄.** 프로덕션 모드 시작은 필수 환경 변수가 플레이스홀더이거나 누락된 경우 시작을 거부합니다.

## 커밋 메시지

Lore Context는 Linux 커널 가이드라인에서 영감을 받은 간결하고 독단적인 커밋 형식을 사용합니다.

### 형식

```text
<type>: <imperative mood의 짧은 요약>

<이 변경이 필요한 이유와 적용되는 트레이드오프를 설명하는 선택적 본문>

<선택적 트레일러>
```

### 타입

- `feat` — 새로운 사용자 가시적 기능 또는 API 엔드포인트
- `fix` — 버그 수정
- `refactor` — 동작 변경 없는 코드 재구성
- `chore` — 레포지토리 위생(의존성, 도구, 파일 이동)
- `docs` — 문서 전용
- `test` — 테스트 전용 변경
- `perf` — 측정 가능한 영향이 있는 성능 개선
- `revert` — 이전 커밋 되돌리기

### 스타일

- 타입과 요약의 첫 번째 단어를 **소문자**로 작성하십시오.
- 요약 줄에 **마침표 없음**.
- 요약 줄은 **72자 이하**. 본문은 80에서 줄바꿈.
- **명령형 분위기**: "fix loopback bypass", "fixed" 또는 "fixes" 아님.
- **무엇보다 왜**: diff는 무엇이 변경되었는지 보여줍니다. 본문은 왜 변경되었는지 설명해야 합니다.
- 사용자가 명시적으로 요구하지 않는 한 `Co-Authored-By` 트레일러, AI 귀속 또는 signed-off-by 줄을 **포함하지 마십시오**.

### 유용한 트레일러

관련 있는 경우 제약 조건 및 검토자 컨텍스트를 캡처하기 위해 트레일러를 추가하십시오:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### 예시

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

## 커밋 세분성

- 커밋당 하나의 논리적 변경. 검토자는 부수적 피해 없이 원자적으로 되돌릴 수 있습니다.
- PR을 열거나 업데이트하기 전에 사소한 수정사항(`typo`, `lint`, `prettier`)을 부모 커밋에 스쿼시하십시오.
- 멀티 파일 리팩터는 단일 이유를 공유하는 경우 단일 커밋으로 괜찮습니다.

## 검토 프로세스

- 유지 관리자는 일반적인 활동 중 7일 내에 PR을 검토합니다.
- 재검토를 요청하기 전에 모든 차단 주석을 처리하십시오.
- 비차단 주석에 대해서는 인라인으로 이유 또는 후속 이슈로 답변하는 것이 허용됩니다.
- 유지 관리자는 PR이 승인되면 `merge-queue` 레이블을 추가할 수 있습니다. 해당 레이블이 적용된 후 리베이스 또는 강제 푸시하지 마십시오.

## 문서 번역

번역된 README 또는 문서 파일을 개선하려면 [i18n 기여자 가이드](../README.md)를 참조하십시오.

## 버그 보고

- 버그가 보안 취약점이 아닌 경우 https://github.com/Lore-Context/lore-context/issues 에 공개 이슈를 제출하십시오.
- 보안 문제는 [SECURITY.md](SECURITY.md)를 따르십시오.
- 포함 사항: 버전 또는 커밋, 환경, 재현 방법, 예상 vs 실제, 로그(민감한 콘텐츠는 수정).

## 감사의 말

Lore Context는 AI 에이전트 인프라에 유용한 무언가를 하려는 소규모 프로젝트입니다. 잘 범위 지정된 모든 PR이 이를 발전시킵니다.
