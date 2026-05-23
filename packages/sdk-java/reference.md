# Reference
<details><summary><code>client.getHealth() -> HealthResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.getHealth();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.getOpenApiDocument() -> Map&amp;lt;String, Object&amp;gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.getOpenApiDocument();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.getHostedMcpProtectedResourceMetadata() -> Map&amp;lt;String, Object&amp;gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.getHostedMcpProtectedResourceMetadata();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.getHostedMcpAuthorizationServerMetadata() -> Map&amp;lt;String, Object&amp;gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.getHostedMcpAuthorizationServerMetadata();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.hostedMcpJsonRpc(request) -> Map&amp;lt;String, Object&amp;gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.hostedMcpJsonRpc(
    new HashMap<String, Object>() {{
        put("key", "value");
    }}
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Map<String, Object>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.contextQuery(request) -> ContextQueryResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.contextQuery(
    ContextQueryRequest
        .builder()
        .query("query")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**query:** `String`

</dd>
</dl>

<dl>
<dd>

**projectId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**tokenBudget:** `Optional<Integer>`

</dd>
</dl>

<dl>
<dd>

**includeSources:** `Optional<Boolean>`

</dd>
</dl>

<dl>
<dd>

**mode:** `Optional<ContextQueryRequestMode>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.memoryWrite(request) -> MemoryWriteResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.memoryWrite(
    MemoryWriteRequest
        .builder()
        .content("content")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**content:** `String`

</dd>
</dl>

<dl>
<dd>

**memoryType:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**projectId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**agentId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**scope:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**confidence:** `Optional<Double>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.memoryGet(id) -> MemoryGetResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.memoryGet(
    "id",
    MemoryGetRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — Memory id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.memoryUpdate(id, request) -> MemoryWriteResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.memoryUpdate(
    "id",
    MemoryUpdateRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — Memory id

</dd>
</dl>

<dl>
<dd>

**content:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**memoryType:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**projectId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**agentId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**scope:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**confidence:** `Optional<Double>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.memorySupersede(id, request) -> MemorySupersedeResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.memorySupersede(
    "id",
    MemorySupersedeRequest
        .builder()
        .content("content")
        .reason("reason")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — Memory id

</dd>
</dl>

<dl>
<dd>

**content:** `String`

</dd>
</dl>

<dl>
<dd>

**reason:** `String`

</dd>
</dl>

<dl>
<dd>

**projectId:** `Optional<String>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.memorySearch(request) -> MemorySearchResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.memorySearch(
    MemorySearchRequest
        .builder()
        .query("query")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**diagnostics:** `Optional<String>` — Set to 1/true/yes to include per-stream diagnostics in the response (opt-in; also accepts X-Lore-Diagnostics request header)

</dd>
</dl>

<dl>
<dd>

**query:** `String`

</dd>
</dl>

<dl>
<dd>

**projectId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**topK:** `Optional<Integer>`

</dd>
</dl>

<dl>
<dd>

**asOf:** `Optional<OffsetDateTime>` — v1.4 bi-temporal: ISO 8601 datetime that sets BOTH asOfSystemTime and asOfValidTime to the same value. Use this for unified point-in-time queries ("what would Lore have answered at this moment?"). Mutually exclusive with asOfSystemTime and asOfValidTime.

</dd>
</dl>

<dl>
<dd>

**asOfSystemTime:** `Optional<OffsetDateTime>` — v1.4 bi-temporal: ISO 8601 datetime for the system-knowledge axis. Filters to facts that Lore had recorded by this timestamp (t_created <= asOfSystemTime) and had not yet expired (t_expired IS NULL OR t_expired > asOfSystemTime). Must not be in the future beyond 5 minutes. Mutually exclusive with asOf.

</dd>
</dl>

<dl>
<dd>

**asOfValidTime:** `Optional<OffsetDateTime>` — v1.4 bi-temporal: ISO 8601 datetime for the business-validity axis. Filters to facts whose validity window covers this timestamp (valid_from <= asOfValidTime AND (valid_until IS NULL OR valid_until > asOfValidTime)). Future values are allowed for forward-looking domain queries. Mutually exclusive with asOf.

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.memoryList() -> MemoryListResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.memoryList(
    MemoryListRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**projectId:** `Optional<String>` — Filter by project id

</dd>
</dl>

<dl>
<dd>

**scope:** `Optional<String>` — Filter by memory scope

</dd>
</dl>

<dl>
<dd>

**status:** `Optional<String>` — Filter by memory lifecycle status

</dd>
</dl>

<dl>
<dd>

**memoryType:** `Optional<String>` — Filter by memory type

</dd>
</dl>

<dl>
<dd>

**q:** `Optional<String>` — Filter by memory content substring

</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — Maximum rows

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.memoryExport() -> Map&amp;lt;String, Object&amp;gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.memoryExport(
    MemoryExportRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**projectId:** `Optional<String>` — Project id

</dd>
</dl>

<dl>
<dd>

**format:** `Optional<String>` — json or markdown

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.memoryImport(request) -> MemoryImportResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.memoryImport(
    MemoryImportRequest
        .builder()
        .body(
            new HashMap<String, Object>() {{
                put("key", "value");
            }}
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**projectId:** `Optional<String>` — Project id

</dd>
</dl>

<dl>
<dd>

**request:** `Map<String, Object>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.memoryForget(request) -> MemoryForgetResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.memoryForget(
    MemoryForgetRequest
        .builder()
        .reason("reason")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**memoryIds:** `Optional<List<String>>`

</dd>
</dl>

<dl>
<dd>

**query:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**projectId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**reason:** `String`

</dd>
</dl>

<dl>
<dd>

**hardDelete:** `Optional<Boolean>`

</dd>
</dl>

<dl>
<dd>

**action:** `Optional<MemoryForgetRequestAction>` — v12 lifecycle action; defaults to delete

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.governanceReviewQueue() -> GovernanceReviewQueueResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.governanceReviewQueue(
    GovernanceReviewQueueRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**projectId:** `Optional<String>` — Project id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.governanceMemoryApprove(id, request) -> GovernanceMemoryApproveResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.governanceMemoryApprove(
    "id",
    GovernanceMemoryApproveRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — Memory id

</dd>
</dl>

<dl>
<dd>

**reason:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**reviewer:** `Optional<String>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.governanceMemoryReject(id, request) -> GovernanceMemoryRejectResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.governanceMemoryReject(
    "id",
    GovernanceMemoryRejectRequest
        .builder()
        .reason("reason")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `String` — Memory id

</dd>
</dl>

<dl>
<dd>

**reason:** `String`

</dd>
</dl>

<dl>
<dd>

**reviewer:** `Optional<String>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.auditLogList() -> AuditLogListResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.auditLogList(
    AuditLogListRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — Maximum rows

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.eventsIngest(request) -> EventsIngestResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.eventsIngest(
    EventsIngestRequest
        .builder()
        .eventType("event_type")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**eventType:** `String`

</dd>
</dl>

<dl>
<dd>

**projectId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**payload:** `Optional<Map<String, Object>>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.agentmemoryHealth() -> Map&amp;lt;String, Object&amp;gt;</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.agentmemoryHealth();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.agentmemorySync() -> AgentmemorySyncResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.agentmemorySync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.traceList() -> TraceListResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.traceList(
    TraceListRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**projectId:** `Optional<String>` — Filter by project id

</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — Maximum rows

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.traceFeedback(traceId, request) -> TraceFeedbackResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.traceFeedback(
    "trace_id",
    TraceFeedbackRequest
        .builder()
        .feedback(TraceFeedbackRequestFeedback.USEFUL)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**traceId:** `String` — Trace id

</dd>
</dl>

<dl>
<dd>

**feedback:** `TraceFeedbackRequestFeedback`

</dd>
</dl>

<dl>
<dd>

**note:** `Optional<String>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.traceGet(traceId) -> TraceGetResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.traceGet(
    "trace_id",
    TraceGetRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**traceId:** `String` — Trace id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.evidenceLedgerGet(traceId) -> EvidenceLedgerGetResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.evidenceLedgerGet(
    "trace_id",
    EvidenceLedgerGetRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**traceId:** `String` — Trace id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.evidenceLedgerList() -> EvidenceLedgerListResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.evidenceLedgerList(
    EvidenceLedgerListRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**projectId:** `Optional<String>` — Filter by project id

</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — Maximum rows

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.evalProviders() -> EvalProvidersResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.evalProviders();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.evalRun(request) -> EvalRunResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.evalRun(
    EvalRunRequest
        .builder()
        .dataset(
            new HashMap<String, Object>() {{
                put("key", "value");
            }}
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**provider:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**projectId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**dataset:** `Map<String, Object>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.evalRunList() -> EvalRunListResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.evalRunList(
    EvalRunListRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**projectId:** `Optional<String>` — Project id

</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — Maximum rows

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.evalRunGet(runId) -> EvalRunGetResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.evalRunGet(
    "run_id",
    EvalRunGetRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**runId:** `String` — Eval run id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.evalReport() -> EvalReportResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.evalReport(
    EvalReportRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**projectId:** `Optional<String>` — Project id

</dd>
</dl>

<dl>
<dd>

**format:** `Optional<String>` — md or json

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.cloudIssueInstallToken(request) -> CloudInstallTokenResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.cloudIssueInstallToken(
    CloudIssueInstallTokenRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**vaultId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**accountId:** `Optional<String>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.cloudPairDevice(request) -> CloudPairResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.cloudPairDevice(
    CloudPairDeviceRequest
        .builder()
        .installToken("install_token")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**installToken:** `String`

</dd>
</dl>

<dl>
<dd>

**deviceLabel:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**platform:** `Optional<String>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.cloudRevokeToken(request) -> CloudRevokeTokenResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.cloudRevokeToken(
    CloudRevokeTokenRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**token:** `Optional<String>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.cloudRotateToken() -> CloudRotatedToken</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.cloudRotateToken();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.cloudWhoAmI() -> CloudWhoAmIResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.cloudWhoAmI();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.cloudListVaults() -> CloudListVaultsResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.cloudListVaults();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorList() -> ConnectorListResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorList();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorAuthorize(provider, request) -> ConnectorAuthorizationUrl</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

v1.0 Google Drive connector OAuth is separate from Google sign-in. When live credentials are absent the route returns private-beta credential status instead of pretending Drive is live.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorAuthorize(
    "provider",
    ConnectorAuthorizeRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**provider:** `String` — Connector provider id

</dd>
</dl>

<dl>
<dd>

**redirectUri:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**state:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**folderId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**scope:** `Optional<ConnectorScope>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorCallback(provider, request) -> ConnectorCallbackResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Fixture-backed private-beta callback. Non-fixture live callbacks fail closed until Google Drive OAuth credentials and token encryption are configured.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorCallback(
    "provider",
    ConnectorCallbackRequest
        .builder()
        .code("code")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**provider:** `String` — Connector provider id

</dd>
</dl>

<dl>
<dd>

**code:** `String`

</dd>
</dl>

<dl>
<dd>

**state:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**redirectUri:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**displayName:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**folderId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**scope:** `Optional<ConnectorScope>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorWebhook(provider, request) -> ConnectorWebhookResult</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorWebhook(
    "provider",
    ConnectorWebhookRequest
        .builder()
        .connectionId("connection_id")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**provider:** `String` — Connector provider id

</dd>
</dl>

<dl>
<dd>

**connectionId:** `String`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorStatusGet(connectionId) -> ConnectorStatusGetResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorStatusGet(
    "connection_id",
    ConnectorStatusGetRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**connectionId:** `String` — Connector connection id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorDelete(connectionId, request) -> ConnectorDeleteResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorDelete(
    "connection_id",
    ConnectorDeleteRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**connectionId:** `String` — Connector connection id

</dd>
</dl>

<dl>
<dd>

**deleteSourceData:** `Optional<Boolean>` — Delete stored connector document summaries

</dd>
</dl>

<dl>
<dd>

**connectorDeleteRequestDeleteSourceData:** `Optional<Boolean>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorStatusPatch(connectionId, request) -> ConnectorStatusPatchResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorStatusPatch(
    "connection_id",
    ConnectorStatusPatchRequest
        .builder()
        .status(ConnectorStatusPatchRequestStatus.ACTIVE)
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**connectionId:** `String` — Connector connection id

</dd>
</dl>

<dl>
<dd>

**status:** `ConnectorStatusPatchRequestStatus`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorSync(connectionId, request) -> ConnectorSyncResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorSync(
    "connection_id",
    ConnectorSyncRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**connectionId:** `String` — Connector connection id

</dd>
</dl>

<dl>
<dd>

**mode:** `Optional<ConnectorSyncRequestMode>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorResync(connectionId) -> ConnectorSyncResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorResync(
    "connection_id",
    ConnectorResyncRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**connectionId:** `String` — Connector connection id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorPause(connectionId) -> ConnectorPauseResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorPause(
    "connection_id",
    ConnectorPauseRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**connectionId:** `String` — Connector connection id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorResume(connectionId) -> ConnectorResumeResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorResume(
    "connection_id",
    ConnectorResumeRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**connectionId:** `String` — Connector connection id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorDisconnect(connectionId, request) -> ConnectorDisconnectResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorDisconnect(
    "connection_id",
    ConnectorDisconnectRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**connectionId:** `String` — Connector connection id

</dd>
</dl>

<dl>
<dd>

**deleteSourceData:** `Optional<Boolean>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connectorRenewChannel(connectionId) -> ConnectorRenewChannelResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.connectorRenewChannel(
    "connection_id",
    ConnectorRenewChannelRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**connectionId:** `String` — Connector connection id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.captureSourceHeartbeat(sourceId, request) -> CaptureSourceHeartbeatResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.captureSourceHeartbeat(
    "source_id",
    CaptureSourceHeartbeatRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sourceId:** `String` — Capture source id

</dd>
</dl>

<dl>
<dd>

**sourceType:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**sourceProvider:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**sourceRef:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**status:** `Optional<CaptureSourceHeartbeatRequestStatus>`

</dd>
</dl>

<dl>
<dd>

**error:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**metadata:** `Optional<Map<String, Object>>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.captureJobGet(jobId) -> CaptureJobGetResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.captureJobGet(
    "job_id",
    CaptureJobGetRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**jobId:** `String` — Capture job id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.captureSessionIngest(request) -> CaptureIngestResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

V0.9 capture pipeline. Idempotent on `idempotency_key`. Rejects raw_archive uploads when the vault disallows it. Rejects when the source is paused, in private mode, or unavailable.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.captureSessionIngest(
    CaptureSessionIngestRequest
        .builder()
        .provider(CaptureSessionIngestRequestProvider.CLAUDE_CODE)
        .sourceOriginalId("source_original_id")
        .sourceId("source_id")
        .contentHash("content_hash")
        .idempotencyKey("idempotency_key")
        .redaction(
            CaptureSessionIngestRequestRedaction
                .builder()
                .version("version")
                .secretCount(1)
                .privateBlockCount(1)
                .build()
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**provider:** `CaptureSessionIngestRequestProvider`

</dd>
</dl>

<dl>
<dd>

**sourceOriginalId:** `String`

</dd>
</dl>

<dl>
<dd>

**sourceId:** `String`

</dd>
</dl>

<dl>
<dd>

**contentHash:** `String`

</dd>
</dl>

<dl>
<dd>

**idempotencyKey:** `String`

</dd>
</dl>

<dl>
<dd>

**captureMode:** `Optional<CaptureSessionIngestRequestCaptureMode>`

</dd>
</dl>

<dl>
<dd>

**startedAt:** `Optional<OffsetDateTime>`

</dd>
</dl>

<dl>
<dd>

**endedAt:** `Optional<OffsetDateTime>`

</dd>
</dl>

<dl>
<dd>

**redaction:** `CaptureSessionIngestRequestRedaction`

</dd>
</dl>

<dl>
<dd>

**turnSummary:** `Optional<List<CaptureSessionIngestRequestTurnSummaryItem>>`

</dd>
</dl>

<dl>
<dd>

**rawTurns:** `Optional<List<Map<String, Object>>>`

</dd>
</dl>

<dl>
<dd>

**metadata:** `Optional<Map<String, Object>>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.captureSessionGet(sessionId) -> CaptureSessionGetResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.captureSessionGet(
    "session_id",
    CaptureSessionGetRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sessionId:** `String` — Captured session id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09SourcesList() -> V09SourcesListResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09SourcesList(
    V09SourcesListRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — Maximum sources to return

</dd>
</dl>

<dl>
<dd>

**status:** `Optional<String>` — Filter by source status (active, paused, private_mode, revoked, error)

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09SourcesRegister(request) -> V09SourcesRegisterResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09SourcesRegister(
    V09SourceRegisterRequest
        .builder()
        .sourceProvider("source_provider")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sourceId:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**sourceType:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**sourceProvider:** `String`

</dd>
</dl>

<dl>
<dd>

**sourceRef:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**displayName:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**rawArchivePolicy:** `Optional<V09SourceRegisterRequestRawArchivePolicy>`

</dd>
</dl>

<dl>
<dd>

**permissions:** `Optional<List<V09SourcePermissionEnvelope>>`

</dd>
</dl>

<dl>
<dd>

**metadata:** `Optional<Map<String, Object>>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09SourceGet(sourceId) -> V09SourceGetResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09SourceGet(
    "source_id",
    V09SourceGetRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sourceId:** `String` — Source id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09SourceUpdate(sourceId, request) -> V09SourceUpdateResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09SourceUpdate(
    "source_id",
    V09SourceUpdateRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sourceId:** `String` — Source id

</dd>
</dl>

<dl>
<dd>

**displayName:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**rawArchivePolicy:** `Optional<V09SourceUpdateRequestRawArchivePolicy>`

</dd>
</dl>

<dl>
<dd>

**metadata:** `Optional<Map<String, Object>>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09SourcePause(sourceId) -> V09SourcePauseResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09SourcePause(
    "source_id",
    V09SourcePauseRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sourceId:** `String` — Source id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09SourceResume(sourceId) -> V09SourceResumeResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09SourceResume(
    "source_id",
    V09SourceResumeRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sourceId:** `String` — Source id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09SourceCheckpointList(sourceId) -> V09SourceCheckpointListResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09SourceCheckpointList(
    "source_id",
    V09SourceCheckpointListRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sourceId:** `String` — Source id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09SourceCheckpointSave(sourceId, request) -> V09SourceCheckpointSaveResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09SourceCheckpointSave(
    "source_id",
    V09SourceCheckpointSaveRequest
        .builder()
        .checkpointKey("checkpoint_key")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sourceId:** `String` — Source id

</dd>
</dl>

<dl>
<dd>

**checkpointKey:** `String`

</dd>
</dl>

<dl>
<dd>

**offsetValue:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**contentHash:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**metadata:** `Optional<Map<String, Object>>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09CaptureEventsIngest(request) -> V09CaptureEventBatchResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09CaptureEventsIngest(
    V09CaptureEventBatchRequest
        .builder()
        .sourceId("source_id")
        .events(
            Arrays.asList(
                V09CaptureEvent
                    .builder()
                    .build()
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sourceId:** `String`

</dd>
</dl>

<dl>
<dd>

**batchIdempotencyKey:** `Optional<String>`

</dd>
</dl>

<dl>
<dd>

**events:** `List<V09CaptureEvent>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09CaptureSessionDeltas(request) -> V09CaptureSessionDeltasResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09CaptureSessionDeltas(
    V09SessionDeltaRequest
        .builder()
        .sourceId("source_id")
        .sessionId("session_id")
        .deltas(
            Arrays.asList(
                V09SessionDeltaRequestDeltasItem
                    .builder()
                    .idempotencyKey("idempotency_key")
                    .payload(
                        new HashMap<String, Object>() {{
                            put("key", "value");
                        }}
                    )
                    .build()
            )
        )
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**sourceId:** `String`

</dd>
</dl>

<dl>
<dd>

**sessionId:** `String`

</dd>
</dl>

<dl>
<dd>

**deltas:** `List<V09SessionDeltaRequestDeltasItem>`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09Usage() -> V09UsageSummary</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09Usage(
    V09UsageRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — Recent usage events to include

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v09OperatorUsage() -> V09OperatorUsageResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v09OperatorUsage(
    V09OperatorUsageRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — Maximum vault rows

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10MemoryInboxList() -> V10MemoryInboxListResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10MemoryInboxList(
    V10MemoryInboxListRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**status:** `Optional<String>` — Optional candidate status filter

</dd>
</dl>

<dl>
<dd>

**limit:** `Optional<Integer>` — Maximum candidates to return

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10MemoryInboxApprove(candidateId) -> V10MemoryInboxApproveResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10MemoryInboxApprove(
    "candidate_id",
    V10MemoryInboxApproveRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**candidateId:** `String` — Memory candidate id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10MemoryInboxReject(candidateId) -> V10MemoryInboxRejectResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10MemoryInboxReject(
    "candidate_id",
    V10MemoryInboxRejectRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**candidateId:** `String` — Memory candidate id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10RecallTraceList() -> V10RecallTraceListResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10RecallTraceList(
    V10RecallTraceListRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**limit:** `Optional<Integer>` — Maximum traces to return

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10RecallTraceGet(traceId) -> V10RecallTraceGetResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10RecallTraceGet(
    "trace_id",
    V10RecallTraceGetRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**traceId:** `String` — Recall trace id

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10RecallTraceFeedback(traceId, request) -> V10RecallTraceFeedbackResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10RecallTraceFeedback(
    "trace_id",
    V10RecallTraceFeedbackRequest
        .builder()
        .feedback("feedback")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**traceId:** `String` — Recall trace id

</dd>
</dl>

<dl>
<dd>

**feedback:** `String`

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10AuthGoogleStart() -> V10GoogleAuthStartResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10AuthGoogleStart();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10AuthGoogleRedirectCallback() -> V10GoogleAuthCallbackResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10AuthGoogleRedirectCallback(
    V10AuthGoogleRedirectCallbackRequest
        .builder()
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**code:** `Optional<String>` — Google OAuth authorization code returned to the redirect URI.

</dd>
</dl>

<dl>
<dd>

**state:** `Optional<String>` — Opaque OAuth state that must match the state cookie.

</dd>
</dl>

<dl>
<dd>

**error:** `Optional<String>` — Google OAuth error value when the user denies or Google rejects the request.

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10AuthGoogleCallback(request) -> V10GoogleAuthCallbackResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10AuthGoogleCallback(
    V10GoogleAuthCallbackRequest
        .builder()
        .idToken("id_token")
        .state("state")
        .build()
);
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**idToken:** `String` — Google OIDC id_token (JWT). In production the JWT signature is verified against Google's JWKS. In mock mode, accepts a base64url JSON claims blob.

</dd>
</dl>

<dl>
<dd>

**state:** `String` — Opaque OAuth state that must match the state cookie.

</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10AuthLogout() -> V10AuthLogoutResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10AuthLogout();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10Me() -> V10MeResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10Me();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.v10MyVault() -> V10VaultResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```java
client.v10MyVault();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>
