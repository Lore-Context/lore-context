# \DefaultAPI

All URIs are relative to *http://127.0.0.1:3000*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AgentmemoryHealth**](DefaultAPI.md#AgentmemoryHealth) | **Get** /v1/integrations/agentmemory/health | Read agentmemory adapter health
[**AgentmemorySync**](DefaultAPI.md#AgentmemorySync) | **Post** /v1/integrations/agentmemory/sync | Sync memory from agentmemory
[**AuditLogList**](DefaultAPI.md#AuditLogList) | **Get** /v1/audit-logs | List audit log entries
[**CaptureJobGet**](DefaultAPI.md#CaptureJobGet) | **Get** /v1/capture/jobs/{job_id} | Read a capture job (vault-scoped)
[**CaptureSessionGet**](DefaultAPI.md#CaptureSessionGet) | **Get** /v1/capture/sessions/{session_id} | Read a captured session (vault-scoped)
[**CaptureSessionIngest**](DefaultAPI.md#CaptureSessionIngest) | **Post** /v1/capture/sessions | Upload a captured agent session for ingestion
[**CaptureSourceHeartbeat**](DefaultAPI.md#CaptureSourceHeartbeat) | **Post** /v1/capture/sources/{source_id}/heartbeat | Record a capture source heartbeat (vault-scoped)
[**CloudIssueInstallToken**](DefaultAPI.md#CloudIssueInstallToken) | **Post** /v1/cloud/install-token | Issue a single-use install token for local bridge pairing. Admin keys, loopback calls, and signed-in web sessions with CSRF may issue tokens.
[**CloudListVaults**](DefaultAPI.md#CloudListVaults) | **Get** /v1/cloud/vaults | List vaults visible to the caller
[**CloudPairDevice**](DefaultAPI.md#CloudPairDevice) | **Post** /v1/cloud/devices/pair | Redeem an install token for device and service tokens
[**CloudRevokeToken**](DefaultAPI.md#CloudRevokeToken) | **Post** /v1/cloud/tokens/revoke | Revoke a cloud token
[**CloudRotateToken**](DefaultAPI.md#CloudRotateToken) | **Post** /v1/cloud/tokens/rotate | Rotate the presented device or service token
[**CloudWhoAmI**](DefaultAPI.md#CloudWhoAmI) | **Get** /v1/cloud/whoami | Identify the cloud caller
[**ConnectorAuthorize**](DefaultAPI.md#ConnectorAuthorize) | **Post** /v1/connectors/{provider}/authorize | Create a connector OAuth authorization URL
[**ConnectorCallback**](DefaultAPI.md#ConnectorCallback) | **Post** /v1/connectors/{provider}/callback | Complete a connector OAuth callback
[**ConnectorDelete**](DefaultAPI.md#ConnectorDelete) | **Delete** /v1/connectors/{connection_id} | Revoke a connector or delete its source data
[**ConnectorDisconnect**](DefaultAPI.md#ConnectorDisconnect) | **Post** /v1/connectors/{connection_id}/disconnect | Disconnect a connector and revoke stored connector tokens
[**ConnectorList**](DefaultAPI.md#ConnectorList) | **Get** /v1/connectors | List connector providers and vault-scoped connections
[**ConnectorPause**](DefaultAPI.md#ConnectorPause) | **Post** /v1/connectors/{connection_id}/pause | Pause a connector connection
[**ConnectorRenewChannel**](DefaultAPI.md#ConnectorRenewChannel) | **Post** /v1/connectors/{connection_id}/channels/renew | Renew Google Drive push notification channel metadata
[**ConnectorResume**](DefaultAPI.md#ConnectorResume) | **Post** /v1/connectors/{connection_id}/resume | Resume a paused connector connection
[**ConnectorResync**](DefaultAPI.md#ConnectorResync) | **Post** /v1/connectors/{connection_id}/resync | Run a manual Google Drive resync/backfill
[**ConnectorStatusGet**](DefaultAPI.md#ConnectorStatusGet) | **Get** /v1/connectors/{connection_id} | Read connector connection status, checkpoint, and document candidates
[**ConnectorStatusPatch**](DefaultAPI.md#ConnectorStatusPatch) | **Patch** /v1/connectors/{connection_id} | Pause or resume a connector connection
[**ConnectorSync**](DefaultAPI.md#ConnectorSync) | **Post** /v1/connectors/{connection_id}/sync | Run a connector backfill or incremental sync
[**ConnectorWebhook**](DefaultAPI.md#ConnectorWebhook) | **Post** /v1/connectors/{provider}/webhook | Verify and record a connector webhook
[**ContextQuery**](DefaultAPI.md#ContextQuery) | **Post** /v1/context/query | Compose agent context and write a trace
[**EvalProviders**](DefaultAPI.md#EvalProviders) | **Get** /v1/eval/providers | List eval providers
[**EvalReport**](DefaultAPI.md#EvalReport) | **Get** /v1/eval/report | Render latest eval report
[**EvalRun**](DefaultAPI.md#EvalRun) | **Post** /v1/eval/run | Run retrieval evaluation
[**EvalRunGet**](DefaultAPI.md#EvalRunGet) | **Get** /v1/eval/runs/{run_id} | Read one eval run
[**EvalRunList**](DefaultAPI.md#EvalRunList) | **Get** /v1/eval/runs | List eval runs
[**EventsIngest**](DefaultAPI.md#EventsIngest) | **Post** /v1/events/ingest | Ingest agent telemetry event
[**EvidenceLedgerGet**](DefaultAPI.md#EvidenceLedgerGet) | **Get** /v1/evidence/ledger/{trace_id} | Read Evidence Ledger for one trace
[**EvidenceLedgerList**](DefaultAPI.md#EvidenceLedgerList) | **Get** /v1/evidence/ledgers | List recent Evidence Ledgers
[**GetHealth**](DefaultAPI.md#GetHealth) | **Get** /health | Read service health
[**GetHostedMcpAuthorizationServerMetadata**](DefaultAPI.md#GetHostedMcpAuthorizationServerMetadata) | **Get** /.well-known/oauth-authorization-server | Read hosted MCP authorization-server metadata
[**GetHostedMcpProtectedResourceMetadata**](DefaultAPI.md#GetHostedMcpProtectedResourceMetadata) | **Get** /.well-known/oauth-protected-resource | Read hosted MCP OAuth protected-resource metadata
[**GetOpenApiDocument**](DefaultAPI.md#GetOpenApiDocument) | **Get** /openapi.json | Read the machine-readable OpenAPI contract
[**GovernanceMemoryApprove**](DefaultAPI.md#GovernanceMemoryApprove) | **Post** /v1/governance/memory/{id}/approve | Approve a candidate or flagged memory
[**GovernanceMemoryReject**](DefaultAPI.md#GovernanceMemoryReject) | **Post** /v1/governance/memory/{id}/reject | Reject a candidate or flagged memory
[**GovernanceReviewQueue**](DefaultAPI.md#GovernanceReviewQueue) | **Get** /v1/governance/review-queue | List candidate or flagged memory requiring review
[**HostedMcpJsonRpc**](DefaultAPI.md#HostedMcpJsonRpc) | **Post** /mcp | Run hosted MCP JSON-RPC over HTTP
[**MemoryExport**](DefaultAPI.md#MemoryExport) | **Get** /v1/memory/export | Export memory as MIF JSON or Markdown
[**MemoryForget**](DefaultAPI.md#MemoryForget) | **Post** /v1/memory/forget | Soft or hard delete memories
[**MemoryGet**](DefaultAPI.md#MemoryGet) | **Get** /v1/memory/{id} | Read memory by id
[**MemoryImport**](DefaultAPI.md#MemoryImport) | **Post** /v1/memory/import | Import MIF memory
[**MemoryList**](DefaultAPI.md#MemoryList) | **Get** /v1/memory/list | List memories visible to the caller
[**MemorySearch**](DefaultAPI.md#MemorySearch) | **Post** /v1/memory/search | Search memory without composing context
[**MemorySupersede**](DefaultAPI.md#MemorySupersede) | **Post** /v1/memory/{id}/supersede | Create a successor memory and archive the old one
[**MemoryUpdate**](DefaultAPI.md#MemoryUpdate) | **Patch** /v1/memory/{id} | Patch a memory in place
[**MemoryWrite**](DefaultAPI.md#MemoryWrite) | **Post** /v1/memory/write | Write governed memory
[**TraceFeedback**](DefaultAPI.md#TraceFeedback) | **Post** /v1/traces/{trace_id}/feedback | Record feedback on a trace
[**TraceGet**](DefaultAPI.md#TraceGet) | **Get** /v1/traces/{trace_id} | Read one context trace
[**TraceList**](DefaultAPI.md#TraceList) | **Get** /v1/traces | List context traces
[**V09CaptureEventsIngest**](DefaultAPI.md#V09CaptureEventsIngest) | **Post** /v1/capture/events | Ingest a batch of canonical capture events for one source
[**V09CaptureSessionDeltas**](DefaultAPI.md#V09CaptureSessionDeltas) | **Post** /v1/capture/session-deltas | Ingest incremental session deltas for an existing session
[**V09OperatorUsage**](DefaultAPI.md#V09OperatorUsage) | **Get** /v1/operator/usage | Cross-vault usage rollup. Operator/admin api-key only.
[**V09SourceCheckpointList**](DefaultAPI.md#V09SourceCheckpointList) | **Get** /v1/sources/{source_id}/checkpoints | List source watcher checkpoints
[**V09SourceCheckpointSave**](DefaultAPI.md#V09SourceCheckpointSave) | **Post** /v1/sources/{source_id}/checkpoints | Upsert a watcher checkpoint
[**V09SourceGet**](DefaultAPI.md#V09SourceGet) | **Get** /v1/sources/{source_id} | Read a source
[**V09SourcePause**](DefaultAPI.md#V09SourcePause) | **Post** /v1/sources/{source_id}/pause | Pause a source. Subsequent ingestion is rejected with 409.
[**V09SourceResume**](DefaultAPI.md#V09SourceResume) | **Post** /v1/sources/{source_id}/resume | Resume a paused source
[**V09SourceUpdate**](DefaultAPI.md#V09SourceUpdate) | **Patch** /v1/sources/{source_id} | Update display name / raw archive policy / metadata
[**V09SourcesList**](DefaultAPI.md#V09SourcesList) | **Get** /v1/sources | List capture sources visible to the caller&#39;s vault
[**V09SourcesRegister**](DefaultAPI.md#V09SourcesRegister) | **Post** /v1/sources | Register a capture source for the caller&#39;s vault
[**V09Usage**](DefaultAPI.md#V09Usage) | **Get** /v1/usage | Read vault usage and current plan-limit snapshot
[**V10AuthGoogleCallback**](DefaultAPI.md#V10AuthGoogleCallback) | **Post** /auth/google/callback | Verify Google ID token, create or reuse account/identity/vault, and set a session cookie.
[**V10AuthGoogleRedirectCallback**](DefaultAPI.md#V10AuthGoogleRedirectCallback) | **Get** /auth/google/callback | Complete browser Google OAuth sign-in with an authorization code.
[**V10AuthGoogleStart**](DefaultAPI.md#V10AuthGoogleStart) | **Get** /auth/google/start | Begin Google OIDC sign-in. Returns the authorization URL and sets a state cookie.
[**V10AuthLogout**](DefaultAPI.md#V10AuthLogout) | **Post** /auth/logout | Revoke the current web session. Requires CSRF header on session cookies.
[**V10Me**](DefaultAPI.md#V10Me) | **Get** /v1/me | Return the authenticated account, vault, and identity for the current session.
[**V10MemoryInboxApprove**](DefaultAPI.md#V10MemoryInboxApprove) | **Post** /v1/memory-inbox/{candidate_id}/approve | Approve a Memory Inbox candidate for future recall.
[**V10MemoryInboxList**](DefaultAPI.md#V10MemoryInboxList) | **Get** /v1/memory-inbox | List Memory Inbox candidates for the authenticated vault.
[**V10MemoryInboxReject**](DefaultAPI.md#V10MemoryInboxReject) | **Post** /v1/memory-inbox/{candidate_id}/reject | Reject a Memory Inbox candidate so it is not reused.
[**V10MyVault**](DefaultAPI.md#V10MyVault) | **Get** /v1/vault | Return the personal vault for the current session.
[**V10RecallTraceFeedback**](DefaultAPI.md#V10RecallTraceFeedback) | **Post** /v1/recall/traces/{trace_id}/feedback | Attach user feedback to a recall trace.
[**V10RecallTraceGet**](DefaultAPI.md#V10RecallTraceGet) | **Get** /v1/recall/traces/{trace_id} | Inspect a single recall trace and its retrieved memory items.
[**V10RecallTraceList**](DefaultAPI.md#V10RecallTraceList) | **Get** /v1/recall/traces | List recall Evidence Ledger traces for the authenticated vault.



## AgentmemoryHealth

> map[string]interface{} AgentmemoryHealth(ctx).Execute()

Read agentmemory adapter health

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.AgentmemoryHealth(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.AgentmemoryHealth``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `AgentmemoryHealth`: map[string]interface{}
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.AgentmemoryHealth`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiAgentmemoryHealthRequest struct via the builder pattern


### Return type

**map[string]interface{}**

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## AgentmemorySync

> AgentmemorySync200Response AgentmemorySync(ctx).Execute()

Sync memory from agentmemory

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.AgentmemorySync(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.AgentmemorySync``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `AgentmemorySync`: AgentmemorySync200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.AgentmemorySync`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiAgentmemorySyncRequest struct via the builder pattern


### Return type

[**AgentmemorySync200Response**](AgentmemorySync200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## AuditLogList

> AuditLogList200Response AuditLogList(ctx).Limit(limit).Execute()

List audit log entries

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	limit := int32(56) // int32 | Maximum rows (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.AuditLogList(context.Background()).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.AuditLogList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `AuditLogList`: AuditLogList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.AuditLogList`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiAuditLogListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** | Maximum rows |

### Return type

[**AuditLogList200Response**](AuditLogList200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CaptureJobGet

> CaptureJobGet200Response CaptureJobGet(ctx, jobId).Execute()

Read a capture job (vault-scoped)

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	jobId := "jobId_example" // string | Capture job id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.CaptureJobGet(context.Background(), jobId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.CaptureJobGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `CaptureJobGet`: CaptureJobGet200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.CaptureJobGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**jobId** | **string** | Capture job id |

### Other Parameters

Other parameters are passed through a pointer to a apiCaptureJobGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**CaptureJobGet200Response**](CaptureJobGet200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CaptureSessionGet

> CaptureSessionGet200Response CaptureSessionGet(ctx, sessionId).Execute()

Read a captured session (vault-scoped)

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	sessionId := "sessionId_example" // string | Captured session id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.CaptureSessionGet(context.Background(), sessionId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.CaptureSessionGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `CaptureSessionGet`: CaptureSessionGet200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.CaptureSessionGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**sessionId** | **string** | Captured session id |

### Other Parameters

Other parameters are passed through a pointer to a apiCaptureSessionGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**CaptureSessionGet200Response**](CaptureSessionGet200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CaptureSessionIngest

> CaptureIngestResponse CaptureSessionIngest(ctx).CaptureSessionIngestRequest(captureSessionIngestRequest).Execute()

Upload a captured agent session for ingestion



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	captureSessionIngestRequest := *openapiclient.NewCaptureSessionIngestRequest("Provider_example", "SourceOriginalId_example", "SourceId_example", "ContentHash_example", "IdempotencyKey_example", *openapiclient.NewCaptureSessionIngestRequestRedaction("Version_example", int32(123), int32(123))) // CaptureSessionIngestRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.CaptureSessionIngest(context.Background()).CaptureSessionIngestRequest(captureSessionIngestRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.CaptureSessionIngest``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `CaptureSessionIngest`: CaptureIngestResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.CaptureSessionIngest`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCaptureSessionIngestRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **captureSessionIngestRequest** | [**CaptureSessionIngestRequest**](CaptureSessionIngestRequest.md) |  |

### Return type

[**CaptureIngestResponse**](CaptureIngestResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CaptureSourceHeartbeat

> CaptureSourceHeartbeat200Response CaptureSourceHeartbeat(ctx, sourceId).CaptureSourceHeartbeatRequest(captureSourceHeartbeatRequest).Execute()

Record a capture source heartbeat (vault-scoped)

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	sourceId := "sourceId_example" // string | Capture source id
	captureSourceHeartbeatRequest := *openapiclient.NewCaptureSourceHeartbeatRequest() // CaptureSourceHeartbeatRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.CaptureSourceHeartbeat(context.Background(), sourceId).CaptureSourceHeartbeatRequest(captureSourceHeartbeatRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.CaptureSourceHeartbeat``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `CaptureSourceHeartbeat`: CaptureSourceHeartbeat200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.CaptureSourceHeartbeat`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**sourceId** | **string** | Capture source id |

### Other Parameters

Other parameters are passed through a pointer to a apiCaptureSourceHeartbeatRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **captureSourceHeartbeatRequest** | [**CaptureSourceHeartbeatRequest**](CaptureSourceHeartbeatRequest.md) |  |

### Return type

[**CaptureSourceHeartbeat200Response**](CaptureSourceHeartbeat200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CloudIssueInstallToken

> CloudInstallTokenResponse CloudIssueInstallToken(ctx).CloudIssueInstallTokenRequest(cloudIssueInstallTokenRequest).Execute()

Issue a single-use install token for local bridge pairing. Admin keys, loopback calls, and signed-in web sessions with CSRF may issue tokens.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	cloudIssueInstallTokenRequest := *openapiclient.NewCloudIssueInstallTokenRequest() // CloudIssueInstallTokenRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.CloudIssueInstallToken(context.Background()).CloudIssueInstallTokenRequest(cloudIssueInstallTokenRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.CloudIssueInstallToken``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `CloudIssueInstallToken`: CloudInstallTokenResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.CloudIssueInstallToken`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCloudIssueInstallTokenRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cloudIssueInstallTokenRequest** | [**CloudIssueInstallTokenRequest**](CloudIssueInstallTokenRequest.md) |  |

### Return type

[**CloudInstallTokenResponse**](CloudInstallTokenResponse.md)

### Authorization

[loreCsrf](../README.md#loreCsrf), [loreApiKey](../README.md#loreApiKey), [loreSession](../README.md#loreSession), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CloudListVaults

> CloudListVaults200Response CloudListVaults(ctx).Execute()

List vaults visible to the caller

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.CloudListVaults(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.CloudListVaults``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `CloudListVaults`: CloudListVaults200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.CloudListVaults`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiCloudListVaultsRequest struct via the builder pattern


### Return type

[**CloudListVaults200Response**](CloudListVaults200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CloudPairDevice

> CloudPairResponse CloudPairDevice(ctx).CloudPairDeviceRequest(cloudPairDeviceRequest).Execute()

Redeem an install token for device and service tokens

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	cloudPairDeviceRequest := *openapiclient.NewCloudPairDeviceRequest("InstallToken_example") // CloudPairDeviceRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.CloudPairDevice(context.Background()).CloudPairDeviceRequest(cloudPairDeviceRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.CloudPairDevice``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `CloudPairDevice`: CloudPairResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.CloudPairDevice`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCloudPairDeviceRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cloudPairDeviceRequest** | [**CloudPairDeviceRequest**](CloudPairDeviceRequest.md) |  |

### Return type

[**CloudPairResponse**](CloudPairResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CloudRevokeToken

> CloudRevokeToken200Response CloudRevokeToken(ctx).CloudRevokeTokenRequest(cloudRevokeTokenRequest).Execute()

Revoke a cloud token

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	cloudRevokeTokenRequest := *openapiclient.NewCloudRevokeTokenRequest() // CloudRevokeTokenRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.CloudRevokeToken(context.Background()).CloudRevokeTokenRequest(cloudRevokeTokenRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.CloudRevokeToken``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `CloudRevokeToken`: CloudRevokeToken200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.CloudRevokeToken`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCloudRevokeTokenRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cloudRevokeTokenRequest** | [**CloudRevokeTokenRequest**](CloudRevokeTokenRequest.md) |  |

### Return type

[**CloudRevokeToken200Response**](CloudRevokeToken200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CloudRotateToken

> CloudRotatedToken CloudRotateToken(ctx).Execute()

Rotate the presented device or service token

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.CloudRotateToken(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.CloudRotateToken``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `CloudRotateToken`: CloudRotatedToken
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.CloudRotateToken`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiCloudRotateTokenRequest struct via the builder pattern


### Return type

[**CloudRotatedToken**](CloudRotatedToken.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CloudWhoAmI

> CloudWhoAmIResponse CloudWhoAmI(ctx).Execute()

Identify the cloud caller

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.CloudWhoAmI(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.CloudWhoAmI``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `CloudWhoAmI`: CloudWhoAmIResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.CloudWhoAmI`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiCloudWhoAmIRequest struct via the builder pattern


### Return type

[**CloudWhoAmIResponse**](CloudWhoAmIResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorAuthorize

> ConnectorAuthorizationUrl ConnectorAuthorize(ctx, provider).ConnectorAuthorizeRequest(connectorAuthorizeRequest).Execute()

Create a connector OAuth authorization URL



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	provider := "provider_example" // string | Connector provider id
	connectorAuthorizeRequest := *openapiclient.NewConnectorAuthorizeRequest() // ConnectorAuthorizeRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorAuthorize(context.Background(), provider).ConnectorAuthorizeRequest(connectorAuthorizeRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorAuthorize``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorAuthorize`: ConnectorAuthorizationUrl
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorAuthorize`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**provider** | **string** | Connector provider id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorAuthorizeRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **connectorAuthorizeRequest** | [**ConnectorAuthorizeRequest**](ConnectorAuthorizeRequest.md) |  |

### Return type

[**ConnectorAuthorizationUrl**](ConnectorAuthorizationUrl.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorCallback

> ConnectorCallback201Response ConnectorCallback(ctx, provider).ConnectorCallbackRequest(connectorCallbackRequest).Execute()

Complete a connector OAuth callback



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	provider := "provider_example" // string | Connector provider id
	connectorCallbackRequest := *openapiclient.NewConnectorCallbackRequest("Code_example") // ConnectorCallbackRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorCallback(context.Background(), provider).ConnectorCallbackRequest(connectorCallbackRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorCallback``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorCallback`: ConnectorCallback201Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorCallback`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**provider** | **string** | Connector provider id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorCallbackRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **connectorCallbackRequest** | [**ConnectorCallbackRequest**](ConnectorCallbackRequest.md) |  |

### Return type

[**ConnectorCallback201Response**](ConnectorCallback201Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorDelete

> ConnectorDelete200Response ConnectorDelete(ctx, connectionId).ConnectorDeleteRequest(connectorDeleteRequest).DeleteSourceData(deleteSourceData).Execute()

Revoke a connector or delete its source data

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	connectionId := "connectionId_example" // string | Connector connection id
	connectorDeleteRequest := *openapiclient.NewConnectorDeleteRequest() // ConnectorDeleteRequest |
	deleteSourceData := true // bool | Delete stored connector document summaries (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorDelete(context.Background(), connectionId).ConnectorDeleteRequest(connectorDeleteRequest).DeleteSourceData(deleteSourceData).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorDelete`: ConnectorDelete200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorDelete`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**connectionId** | **string** | Connector connection id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorDeleteRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **connectorDeleteRequest** | [**ConnectorDeleteRequest**](ConnectorDeleteRequest.md) |  |
 **deleteSourceData** | **bool** | Delete stored connector document summaries |

### Return type

[**ConnectorDelete200Response**](ConnectorDelete200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorDisconnect

> ConnectorDelete200Response ConnectorDisconnect(ctx, connectionId).ConnectorDeleteRequest(connectorDeleteRequest).Execute()

Disconnect a connector and revoke stored connector tokens

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	connectionId := "connectionId_example" // string | Connector connection id
	connectorDeleteRequest := *openapiclient.NewConnectorDeleteRequest() // ConnectorDeleteRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorDisconnect(context.Background(), connectionId).ConnectorDeleteRequest(connectorDeleteRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorDisconnect``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorDisconnect`: ConnectorDelete200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorDisconnect`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**connectionId** | **string** | Connector connection id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorDisconnectRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **connectorDeleteRequest** | [**ConnectorDeleteRequest**](ConnectorDeleteRequest.md) |  |

### Return type

[**ConnectorDelete200Response**](ConnectorDelete200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorList

> ConnectorList200Response ConnectorList(ctx).Execute()

List connector providers and vault-scoped connections

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorList(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorList`: ConnectorList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorList`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorListRequest struct via the builder pattern


### Return type

[**ConnectorList200Response**](ConnectorList200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorPause

> ConnectorStatusPatch200Response ConnectorPause(ctx, connectionId).Execute()

Pause a connector connection

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	connectionId := "connectionId_example" // string | Connector connection id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorPause(context.Background(), connectionId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorPause``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorPause`: ConnectorStatusPatch200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorPause`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**connectionId** | **string** | Connector connection id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorPauseRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**ConnectorStatusPatch200Response**](ConnectorStatusPatch200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorRenewChannel

> ConnectorCallback201Response ConnectorRenewChannel(ctx, connectionId).Execute()

Renew Google Drive push notification channel metadata

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	connectionId := "connectionId_example" // string | Connector connection id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorRenewChannel(context.Background(), connectionId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorRenewChannel``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorRenewChannel`: ConnectorCallback201Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorRenewChannel`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**connectionId** | **string** | Connector connection id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorRenewChannelRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**ConnectorCallback201Response**](ConnectorCallback201Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorResume

> ConnectorStatusPatch200Response ConnectorResume(ctx, connectionId).Execute()

Resume a paused connector connection

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	connectionId := "connectionId_example" // string | Connector connection id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorResume(context.Background(), connectionId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorResume``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorResume`: ConnectorStatusPatch200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorResume`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**connectionId** | **string** | Connector connection id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorResumeRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**ConnectorStatusPatch200Response**](ConnectorStatusPatch200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorResync

> ConnectorSyncResponse ConnectorResync(ctx, connectionId).Execute()

Run a manual Google Drive resync/backfill

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	connectionId := "connectionId_example" // string | Connector connection id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorResync(context.Background(), connectionId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorResync``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorResync`: ConnectorSyncResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorResync`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**connectionId** | **string** | Connector connection id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorResyncRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**ConnectorSyncResponse**](ConnectorSyncResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorStatusGet

> ConnectorStatusGet200Response ConnectorStatusGet(ctx, connectionId).Execute()

Read connector connection status, checkpoint, and document candidates

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	connectionId := "connectionId_example" // string | Connector connection id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorStatusGet(context.Background(), connectionId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorStatusGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorStatusGet`: ConnectorStatusGet200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorStatusGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**connectionId** | **string** | Connector connection id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorStatusGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**ConnectorStatusGet200Response**](ConnectorStatusGet200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorStatusPatch

> ConnectorStatusPatch200Response ConnectorStatusPatch(ctx, connectionId).ConnectorStatusPatchRequest(connectorStatusPatchRequest).Execute()

Pause or resume a connector connection

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	connectionId := "connectionId_example" // string | Connector connection id
	connectorStatusPatchRequest := *openapiclient.NewConnectorStatusPatchRequest("Status_example") // ConnectorStatusPatchRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorStatusPatch(context.Background(), connectionId).ConnectorStatusPatchRequest(connectorStatusPatchRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorStatusPatch``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorStatusPatch`: ConnectorStatusPatch200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorStatusPatch`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**connectionId** | **string** | Connector connection id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorStatusPatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **connectorStatusPatchRequest** | [**ConnectorStatusPatchRequest**](ConnectorStatusPatchRequest.md) |  |

### Return type

[**ConnectorStatusPatch200Response**](ConnectorStatusPatch200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorSync

> ConnectorSyncResponse ConnectorSync(ctx, connectionId).ConnectorSyncRequest(connectorSyncRequest).Execute()

Run a connector backfill or incremental sync

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	connectionId := "connectionId_example" // string | Connector connection id
	connectorSyncRequest := *openapiclient.NewConnectorSyncRequest() // ConnectorSyncRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorSync(context.Background(), connectionId).ConnectorSyncRequest(connectorSyncRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorSync``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorSync`: ConnectorSyncResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorSync`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**connectionId** | **string** | Connector connection id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorSyncRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **connectorSyncRequest** | [**ConnectorSyncRequest**](ConnectorSyncRequest.md) |  |

### Return type

[**ConnectorSyncResponse**](ConnectorSyncResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConnectorWebhook

> ConnectorWebhookResult ConnectorWebhook(ctx, provider).ConnectorWebhookRequest(connectorWebhookRequest).Execute()

Verify and record a connector webhook

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	provider := "provider_example" // string | Connector provider id
	connectorWebhookRequest := *openapiclient.NewConnectorWebhookRequest("ConnectionId_example") // ConnectorWebhookRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ConnectorWebhook(context.Background(), provider).ConnectorWebhookRequest(connectorWebhookRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ConnectorWebhook``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ConnectorWebhook`: ConnectorWebhookResult
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ConnectorWebhook`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**provider** | **string** | Connector provider id |

### Other Parameters

Other parameters are passed through a pointer to a apiConnectorWebhookRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **connectorWebhookRequest** | [**ConnectorWebhookRequest**](ConnectorWebhookRequest.md) |  |

### Return type

[**ConnectorWebhookResult**](ConnectorWebhookResult.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ContextQuery

> ContextQueryResponse ContextQuery(ctx).ContextQueryRequest(contextQueryRequest).Execute()

Compose agent context and write a trace

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	contextQueryRequest := *openapiclient.NewContextQueryRequest("Query_example") // ContextQueryRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.ContextQuery(context.Background()).ContextQueryRequest(contextQueryRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.ContextQuery``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ContextQuery`: ContextQueryResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.ContextQuery`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiContextQueryRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **contextQueryRequest** | [**ContextQueryRequest**](ContextQueryRequest.md) |  |

### Return type

[**ContextQueryResponse**](ContextQueryResponse.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## EvalProviders

> EvalProviders200Response EvalProviders(ctx).Execute()

List eval providers

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.EvalProviders(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.EvalProviders``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `EvalProviders`: EvalProviders200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.EvalProviders`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiEvalProvidersRequest struct via the builder pattern


### Return type

[**EvalProviders200Response**](EvalProviders200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## EvalReport

> string EvalReport(ctx).ProjectId(projectId).Format(format).Execute()

Render latest eval report

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	projectId := "projectId_example" // string | Project id (optional)
	format := "format_example" // string | md or json (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.EvalReport(context.Background()).ProjectId(projectId).Format(format).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.EvalReport``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `EvalReport`: string
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.EvalReport`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiEvalReportRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **projectId** | **string** | Project id |
 **format** | **string** | md or json |

### Return type

**string**

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/markdown, application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## EvalRun

> EvalRun200Response EvalRun(ctx).EvalRunRequest(evalRunRequest).Execute()

Run retrieval evaluation

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	evalRunRequest := *openapiclient.NewEvalRunRequest(map[string]interface{}{"key": interface{}(123)}) // EvalRunRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.EvalRun(context.Background()).EvalRunRequest(evalRunRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.EvalRun``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `EvalRun`: EvalRun200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.EvalRun`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiEvalRunRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **evalRunRequest** | [**EvalRunRequest**](EvalRunRequest.md) |  |

### Return type

[**EvalRun200Response**](EvalRun200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## EvalRunGet

> EvalRunGet200Response EvalRunGet(ctx, runId).Execute()

Read one eval run

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	runId := "runId_example" // string | Eval run id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.EvalRunGet(context.Background(), runId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.EvalRunGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `EvalRunGet`: EvalRunGet200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.EvalRunGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**runId** | **string** | Eval run id |

### Other Parameters

Other parameters are passed through a pointer to a apiEvalRunGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**EvalRunGet200Response**](EvalRunGet200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## EvalRunList

> EvalRunList200Response EvalRunList(ctx).ProjectId(projectId).Limit(limit).Execute()

List eval runs

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	projectId := "projectId_example" // string | Project id (optional)
	limit := int32(56) // int32 | Maximum rows (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.EvalRunList(context.Background()).ProjectId(projectId).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.EvalRunList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `EvalRunList`: EvalRunList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.EvalRunList`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiEvalRunListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **projectId** | **string** | Project id |
 **limit** | **int32** | Maximum rows |

### Return type

[**EvalRunList200Response**](EvalRunList200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## EventsIngest

> EventsIngest200Response EventsIngest(ctx).EventsIngestRequest(eventsIngestRequest).Execute()

Ingest agent telemetry event

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	eventsIngestRequest := *openapiclient.NewEventsIngestRequest("EventType_example") // EventsIngestRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.EventsIngest(context.Background()).EventsIngestRequest(eventsIngestRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.EventsIngest``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `EventsIngest`: EventsIngest200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.EventsIngest`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiEventsIngestRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **eventsIngestRequest** | [**EventsIngestRequest**](EventsIngestRequest.md) |  |

### Return type

[**EventsIngest200Response**](EventsIngest200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## EvidenceLedgerGet

> EvidenceLedgerGet200Response EvidenceLedgerGet(ctx, traceId).Execute()

Read Evidence Ledger for one trace

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	traceId := "traceId_example" // string | Trace id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.EvidenceLedgerGet(context.Background(), traceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.EvidenceLedgerGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `EvidenceLedgerGet`: EvidenceLedgerGet200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.EvidenceLedgerGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**traceId** | **string** | Trace id |

### Other Parameters

Other parameters are passed through a pointer to a apiEvidenceLedgerGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**EvidenceLedgerGet200Response**](EvidenceLedgerGet200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## EvidenceLedgerList

> EvidenceLedgerList200Response EvidenceLedgerList(ctx).ProjectId(projectId).Limit(limit).Execute()

List recent Evidence Ledgers

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	projectId := "projectId_example" // string | Filter by project id (optional)
	limit := int32(56) // int32 | Maximum rows (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.EvidenceLedgerList(context.Background()).ProjectId(projectId).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.EvidenceLedgerList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `EvidenceLedgerList`: EvidenceLedgerList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.EvidenceLedgerList`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiEvidenceLedgerListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **projectId** | **string** | Filter by project id |
 **limit** | **int32** | Maximum rows |

### Return type

[**EvidenceLedgerList200Response**](EvidenceLedgerList200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetHealth

> HealthResponse GetHealth(ctx).Execute()

Read service health

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.GetHealth(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.GetHealth``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetHealth`: HealthResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.GetHealth`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetHealthRequest struct via the builder pattern


### Return type

[**HealthResponse**](HealthResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetHostedMcpAuthorizationServerMetadata

> map[string]interface{} GetHostedMcpAuthorizationServerMetadata(ctx).Execute()

Read hosted MCP authorization-server metadata

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.GetHostedMcpAuthorizationServerMetadata(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.GetHostedMcpAuthorizationServerMetadata``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetHostedMcpAuthorizationServerMetadata`: map[string]interface{}
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.GetHostedMcpAuthorizationServerMetadata`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetHostedMcpAuthorizationServerMetadataRequest struct via the builder pattern


### Return type

**map[string]interface{}**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetHostedMcpProtectedResourceMetadata

> map[string]interface{} GetHostedMcpProtectedResourceMetadata(ctx).Execute()

Read hosted MCP OAuth protected-resource metadata

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.GetHostedMcpProtectedResourceMetadata(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.GetHostedMcpProtectedResourceMetadata``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetHostedMcpProtectedResourceMetadata`: map[string]interface{}
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.GetHostedMcpProtectedResourceMetadata`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetHostedMcpProtectedResourceMetadataRequest struct via the builder pattern


### Return type

**map[string]interface{}**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetOpenApiDocument

> map[string]interface{} GetOpenApiDocument(ctx).Execute()

Read the machine-readable OpenAPI contract

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.GetOpenApiDocument(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.GetOpenApiDocument``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetOpenApiDocument`: map[string]interface{}
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.GetOpenApiDocument`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetOpenApiDocumentRequest struct via the builder pattern


### Return type

**map[string]interface{}**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GovernanceMemoryApprove

> MemoryGet200Response GovernanceMemoryApprove(ctx, id).GovernanceMemoryApproveRequest(governanceMemoryApproveRequest).Execute()

Approve a candidate or flagged memory

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	id := "id_example" // string | Memory id
	governanceMemoryApproveRequest := *openapiclient.NewGovernanceMemoryApproveRequest() // GovernanceMemoryApproveRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.GovernanceMemoryApprove(context.Background(), id).GovernanceMemoryApproveRequest(governanceMemoryApproveRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.GovernanceMemoryApprove``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GovernanceMemoryApprove`: MemoryGet200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.GovernanceMemoryApprove`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** | Memory id |

### Other Parameters

Other parameters are passed through a pointer to a apiGovernanceMemoryApproveRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **governanceMemoryApproveRequest** | [**GovernanceMemoryApproveRequest**](GovernanceMemoryApproveRequest.md) |  |

### Return type

[**MemoryGet200Response**](MemoryGet200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GovernanceMemoryReject

> MemoryGet200Response GovernanceMemoryReject(ctx, id).GovernanceMemoryRejectRequest(governanceMemoryRejectRequest).Execute()

Reject a candidate or flagged memory

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	id := "id_example" // string | Memory id
	governanceMemoryRejectRequest := *openapiclient.NewGovernanceMemoryRejectRequest("Reason_example") // GovernanceMemoryRejectRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.GovernanceMemoryReject(context.Background(), id).GovernanceMemoryRejectRequest(governanceMemoryRejectRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.GovernanceMemoryReject``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GovernanceMemoryReject`: MemoryGet200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.GovernanceMemoryReject`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** | Memory id |

### Other Parameters

Other parameters are passed through a pointer to a apiGovernanceMemoryRejectRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **governanceMemoryRejectRequest** | [**GovernanceMemoryRejectRequest**](GovernanceMemoryRejectRequest.md) |  |

### Return type

[**MemoryGet200Response**](MemoryGet200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GovernanceReviewQueue

> MemoryList200Response GovernanceReviewQueue(ctx).ProjectId(projectId).Execute()

List candidate or flagged memory requiring review

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	projectId := "projectId_example" // string | Project id (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.GovernanceReviewQueue(context.Background()).ProjectId(projectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.GovernanceReviewQueue``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GovernanceReviewQueue`: MemoryList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.GovernanceReviewQueue`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGovernanceReviewQueueRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **projectId** | **string** | Project id |

### Return type

[**MemoryList200Response**](MemoryList200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## HostedMcpJsonRpc

> map[string]interface{} HostedMcpJsonRpc(ctx).RequestBody(requestBody).Execute()

Run hosted MCP JSON-RPC over HTTP

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	requestBody := map[string]interface{}{"key": interface{}(123)} // map[string]interface{} |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.HostedMcpJsonRpc(context.Background()).RequestBody(requestBody).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.HostedMcpJsonRpc``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `HostedMcpJsonRpc`: map[string]interface{}
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.HostedMcpJsonRpc`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiHostedMcpJsonRpcRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **requestBody** | **map[string]interface{}** |  |

### Return type

**map[string]interface{}**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## MemoryExport

> map[string]interface{} MemoryExport(ctx).ProjectId(projectId).Format(format).Execute()

Export memory as MIF JSON or Markdown

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	projectId := "projectId_example" // string | Project id (optional)
	format := "format_example" // string | json or markdown (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.MemoryExport(context.Background()).ProjectId(projectId).Format(format).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.MemoryExport``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `MemoryExport`: map[string]interface{}
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.MemoryExport`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiMemoryExportRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **projectId** | **string** | Project id |
 **format** | **string** | json or markdown |

### Return type

**map[string]interface{}**

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json, text/markdown

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## MemoryForget

> MemoryForget200Response MemoryForget(ctx).MemoryForgetRequest(memoryForgetRequest).Execute()

Soft or hard delete memories

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	memoryForgetRequest := *openapiclient.NewMemoryForgetRequest("Reason_example") // MemoryForgetRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.MemoryForget(context.Background()).MemoryForgetRequest(memoryForgetRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.MemoryForget``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `MemoryForget`: MemoryForget200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.MemoryForget`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiMemoryForgetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **memoryForgetRequest** | [**MemoryForgetRequest**](MemoryForgetRequest.md) |  |

### Return type

[**MemoryForget200Response**](MemoryForget200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## MemoryGet

> MemoryGet200Response MemoryGet(ctx, id).Execute()

Read memory by id

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	id := "id_example" // string | Memory id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.MemoryGet(context.Background(), id).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.MemoryGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `MemoryGet`: MemoryGet200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.MemoryGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** | Memory id |

### Other Parameters

Other parameters are passed through a pointer to a apiMemoryGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**MemoryGet200Response**](MemoryGet200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## MemoryImport

> MemoryImport200Response MemoryImport(ctx).RequestBody(requestBody).ProjectId(projectId).Execute()

Import MIF memory

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	requestBody := map[string]interface{}{"key": interface{}(123)} // map[string]interface{} |
	projectId := "projectId_example" // string | Project id (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.MemoryImport(context.Background()).RequestBody(requestBody).ProjectId(projectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.MemoryImport``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `MemoryImport`: MemoryImport200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.MemoryImport`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiMemoryImportRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **requestBody** | **map[string]interface{}** |  |
 **projectId** | **string** | Project id |

### Return type

[**MemoryImport200Response**](MemoryImport200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## MemoryList

> MemoryList200Response MemoryList(ctx).ProjectId(projectId).Scope(scope).Status(status).MemoryType(memoryType).Q(q).Limit(limit).Execute()

List memories visible to the caller

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	projectId := "projectId_example" // string | Filter by project id (optional)
	scope := "scope_example" // string | Filter by memory scope (optional)
	status := "status_example" // string | Filter by memory lifecycle status (optional)
	memoryType := "memoryType_example" // string | Filter by memory type (optional)
	q := "q_example" // string | Filter by memory content substring (optional)
	limit := int32(56) // int32 | Maximum rows (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.MemoryList(context.Background()).ProjectId(projectId).Scope(scope).Status(status).MemoryType(memoryType).Q(q).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.MemoryList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `MemoryList`: MemoryList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.MemoryList`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiMemoryListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **projectId** | **string** | Filter by project id |
 **scope** | **string** | Filter by memory scope |
 **status** | **string** | Filter by memory lifecycle status |
 **memoryType** | **string** | Filter by memory type |
 **q** | **string** | Filter by memory content substring |
 **limit** | **int32** | Maximum rows |

### Return type

[**MemoryList200Response**](MemoryList200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## MemorySearch

> MemorySearch200Response MemorySearch(ctx).MemorySearchRequest(memorySearchRequest).Diagnostics(diagnostics).Execute()

Search memory without composing context

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	memorySearchRequest := *openapiclient.NewMemorySearchRequest("Query_example") // MemorySearchRequest |
	diagnostics := "diagnostics_example" // string | Set to 1/true/yes to include per-stream diagnostics in the response (opt-in; also accepts X-Lore-Diagnostics request header) (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.MemorySearch(context.Background()).MemorySearchRequest(memorySearchRequest).Diagnostics(diagnostics).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.MemorySearch``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `MemorySearch`: MemorySearch200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.MemorySearch`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiMemorySearchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **memorySearchRequest** | [**MemorySearchRequest**](MemorySearchRequest.md) |  |
 **diagnostics** | **string** | Set to 1/true/yes to include per-stream diagnostics in the response (opt-in; also accepts X-Lore-Diagnostics request header) |

### Return type

[**MemorySearch200Response**](MemorySearch200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## MemorySupersede

> MemorySupersede200Response MemorySupersede(ctx, id).MemorySupersedeRequest(memorySupersedeRequest).Execute()

Create a successor memory and archive the old one

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	id := "id_example" // string | Memory id
	memorySupersedeRequest := *openapiclient.NewMemorySupersedeRequest("Content_example", "Reason_example") // MemorySupersedeRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.MemorySupersede(context.Background(), id).MemorySupersedeRequest(memorySupersedeRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.MemorySupersede``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `MemorySupersede`: MemorySupersede200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.MemorySupersede`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** | Memory id |

### Other Parameters

Other parameters are passed through a pointer to a apiMemorySupersedeRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **memorySupersedeRequest** | [**MemorySupersedeRequest**](MemorySupersedeRequest.md) |  |

### Return type

[**MemorySupersede200Response**](MemorySupersede200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## MemoryUpdate

> MemoryWriteResponse MemoryUpdate(ctx, id).MemoryUpdateRequest(memoryUpdateRequest).Execute()

Patch a memory in place

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	id := "id_example" // string | Memory id
	memoryUpdateRequest := *openapiclient.NewMemoryUpdateRequest() // MemoryUpdateRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.MemoryUpdate(context.Background(), id).MemoryUpdateRequest(memoryUpdateRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.MemoryUpdate``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `MemoryUpdate`: MemoryWriteResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.MemoryUpdate`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** | Memory id |

### Other Parameters

Other parameters are passed through a pointer to a apiMemoryUpdateRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **memoryUpdateRequest** | [**MemoryUpdateRequest**](MemoryUpdateRequest.md) |  |

### Return type

[**MemoryWriteResponse**](MemoryWriteResponse.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## MemoryWrite

> MemoryWriteResponse MemoryWrite(ctx).MemoryWriteRequest(memoryWriteRequest).Execute()

Write governed memory

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	memoryWriteRequest := *openapiclient.NewMemoryWriteRequest("Content_example") // MemoryWriteRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.MemoryWrite(context.Background()).MemoryWriteRequest(memoryWriteRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.MemoryWrite``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `MemoryWrite`: MemoryWriteResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.MemoryWrite`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiMemoryWriteRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **memoryWriteRequest** | [**MemoryWriteRequest**](MemoryWriteRequest.md) |  |

### Return type

[**MemoryWriteResponse**](MemoryWriteResponse.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## TraceFeedback

> TraceFeedback200Response TraceFeedback(ctx, traceId).TraceFeedbackRequest(traceFeedbackRequest).Execute()

Record feedback on a trace

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	traceId := "traceId_example" // string | Trace id
	traceFeedbackRequest := *openapiclient.NewTraceFeedbackRequest("Feedback_example") // TraceFeedbackRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.TraceFeedback(context.Background(), traceId).TraceFeedbackRequest(traceFeedbackRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.TraceFeedback``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `TraceFeedback`: TraceFeedback200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.TraceFeedback`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**traceId** | **string** | Trace id |

### Other Parameters

Other parameters are passed through a pointer to a apiTraceFeedbackRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **traceFeedbackRequest** | [**TraceFeedbackRequest**](TraceFeedbackRequest.md) |  |

### Return type

[**TraceFeedback200Response**](TraceFeedback200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## TraceGet

> TraceFeedback200Response TraceGet(ctx, traceId).Execute()

Read one context trace

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	traceId := "traceId_example" // string | Trace id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.TraceGet(context.Background(), traceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.TraceGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `TraceGet`: TraceFeedback200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.TraceGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**traceId** | **string** | Trace id |

### Other Parameters

Other parameters are passed through a pointer to a apiTraceGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**TraceFeedback200Response**](TraceFeedback200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## TraceList

> TraceList200Response TraceList(ctx).ProjectId(projectId).Limit(limit).Execute()

List context traces

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	projectId := "projectId_example" // string | Filter by project id (optional)
	limit := int32(56) // int32 | Maximum rows (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.TraceList(context.Background()).ProjectId(projectId).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.TraceList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `TraceList`: TraceList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.TraceList`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiTraceListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **projectId** | **string** | Filter by project id |
 **limit** | **int32** | Maximum rows |

### Return type

[**TraceList200Response**](TraceList200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09CaptureEventsIngest

> V09CaptureEventBatchResponse V09CaptureEventsIngest(ctx).V09CaptureEventBatchRequest(v09CaptureEventBatchRequest).Execute()

Ingest a batch of canonical capture events for one source

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	v09CaptureEventBatchRequest := *openapiclient.NewV09CaptureEventBatchRequest("SourceId_example", []openapiclient.V09CaptureEvent{*openapiclient.NewV09CaptureEvent()}) // V09CaptureEventBatchRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09CaptureEventsIngest(context.Background()).V09CaptureEventBatchRequest(v09CaptureEventBatchRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09CaptureEventsIngest``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09CaptureEventsIngest`: V09CaptureEventBatchResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09CaptureEventsIngest`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV09CaptureEventsIngestRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v09CaptureEventBatchRequest** | [**V09CaptureEventBatchRequest**](V09CaptureEventBatchRequest.md) |  |

### Return type

[**V09CaptureEventBatchResponse**](V09CaptureEventBatchResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09CaptureSessionDeltas

> V09CaptureSessionDeltas202Response V09CaptureSessionDeltas(ctx).V09SessionDeltaRequest(v09SessionDeltaRequest).Execute()

Ingest incremental session deltas for an existing session

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	v09SessionDeltaRequest := *openapiclient.NewV09SessionDeltaRequest("SourceId_example", "SessionId_example", []openapiclient.V09SessionDeltaRequestDeltasInner{*openapiclient.NewV09SessionDeltaRequestDeltasInner("IdempotencyKey_example", map[string]interface{}{"key": interface{}(123)})}) // V09SessionDeltaRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09CaptureSessionDeltas(context.Background()).V09SessionDeltaRequest(v09SessionDeltaRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09CaptureSessionDeltas``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09CaptureSessionDeltas`: V09CaptureSessionDeltas202Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09CaptureSessionDeltas`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV09CaptureSessionDeltasRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v09SessionDeltaRequest** | [**V09SessionDeltaRequest**](V09SessionDeltaRequest.md) |  |

### Return type

[**V09CaptureSessionDeltas202Response**](V09CaptureSessionDeltas202Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09OperatorUsage

> V09OperatorUsage200Response V09OperatorUsage(ctx).Limit(limit).Execute()

Cross-vault usage rollup. Operator/admin api-key only.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	limit := int32(56) // int32 | Maximum vault rows (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09OperatorUsage(context.Background()).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09OperatorUsage``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09OperatorUsage`: V09OperatorUsage200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09OperatorUsage`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV09OperatorUsageRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** | Maximum vault rows |

### Return type

[**V09OperatorUsage200Response**](V09OperatorUsage200Response.md)

### Authorization

[loreApiKey](../README.md#loreApiKey), [bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09SourceCheckpointList

> V09SourceCheckpointList200Response V09SourceCheckpointList(ctx, sourceId).Execute()

List source watcher checkpoints

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	sourceId := "sourceId_example" // string | Source id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09SourceCheckpointList(context.Background(), sourceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09SourceCheckpointList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09SourceCheckpointList`: V09SourceCheckpointList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09SourceCheckpointList`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**sourceId** | **string** | Source id |

### Other Parameters

Other parameters are passed through a pointer to a apiV09SourceCheckpointListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**V09SourceCheckpointList200Response**](V09SourceCheckpointList200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09SourceCheckpointSave

> V09SourceCheckpointSave200Response V09SourceCheckpointSave(ctx, sourceId).V09SourceCheckpointSaveRequest(v09SourceCheckpointSaveRequest).Execute()

Upsert a watcher checkpoint

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	sourceId := "sourceId_example" // string | Source id
	v09SourceCheckpointSaveRequest := *openapiclient.NewV09SourceCheckpointSaveRequest("CheckpointKey_example") // V09SourceCheckpointSaveRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09SourceCheckpointSave(context.Background(), sourceId).V09SourceCheckpointSaveRequest(v09SourceCheckpointSaveRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09SourceCheckpointSave``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09SourceCheckpointSave`: V09SourceCheckpointSave200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09SourceCheckpointSave`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**sourceId** | **string** | Source id |

### Other Parameters

Other parameters are passed through a pointer to a apiV09SourceCheckpointSaveRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **v09SourceCheckpointSaveRequest** | [**V09SourceCheckpointSaveRequest**](V09SourceCheckpointSaveRequest.md) |  |

### Return type

[**V09SourceCheckpointSave200Response**](V09SourceCheckpointSave200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09SourceGet

> V09SourcesRegister201Response V09SourceGet(ctx, sourceId).Execute()

Read a source

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	sourceId := "sourceId_example" // string | Source id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09SourceGet(context.Background(), sourceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09SourceGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09SourceGet`: V09SourcesRegister201Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09SourceGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**sourceId** | **string** | Source id |

### Other Parameters

Other parameters are passed through a pointer to a apiV09SourceGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**V09SourcesRegister201Response**](V09SourcesRegister201Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09SourcePause

> V09SourcesRegister201Response V09SourcePause(ctx, sourceId).Execute()

Pause a source. Subsequent ingestion is rejected with 409.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	sourceId := "sourceId_example" // string | Source id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09SourcePause(context.Background(), sourceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09SourcePause``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09SourcePause`: V09SourcesRegister201Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09SourcePause`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**sourceId** | **string** | Source id |

### Other Parameters

Other parameters are passed through a pointer to a apiV09SourcePauseRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**V09SourcesRegister201Response**](V09SourcesRegister201Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09SourceResume

> V09SourcesRegister201Response V09SourceResume(ctx, sourceId).Execute()

Resume a paused source

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	sourceId := "sourceId_example" // string | Source id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09SourceResume(context.Background(), sourceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09SourceResume``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09SourceResume`: V09SourcesRegister201Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09SourceResume`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**sourceId** | **string** | Source id |

### Other Parameters

Other parameters are passed through a pointer to a apiV09SourceResumeRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**V09SourcesRegister201Response**](V09SourcesRegister201Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09SourceUpdate

> V09SourcesRegister201Response V09SourceUpdate(ctx, sourceId).V09SourceUpdateRequest(v09SourceUpdateRequest).Execute()

Update display name / raw archive policy / metadata

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	sourceId := "sourceId_example" // string | Source id
	v09SourceUpdateRequest := *openapiclient.NewV09SourceUpdateRequest() // V09SourceUpdateRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09SourceUpdate(context.Background(), sourceId).V09SourceUpdateRequest(v09SourceUpdateRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09SourceUpdate``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09SourceUpdate`: V09SourcesRegister201Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09SourceUpdate`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**sourceId** | **string** | Source id |

### Other Parameters

Other parameters are passed through a pointer to a apiV09SourceUpdateRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **v09SourceUpdateRequest** | [**V09SourceUpdateRequest**](V09SourceUpdateRequest.md) |  |

### Return type

[**V09SourcesRegister201Response**](V09SourcesRegister201Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09SourcesList

> V09SourcesList200Response V09SourcesList(ctx).Limit(limit).Status(status).Execute()

List capture sources visible to the caller's vault

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	limit := int32(56) // int32 | Maximum sources to return (optional)
	status := "status_example" // string | Filter by source status (active, paused, private_mode, revoked, error) (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09SourcesList(context.Background()).Limit(limit).Status(status).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09SourcesList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09SourcesList`: V09SourcesList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09SourcesList`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV09SourcesListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** | Maximum sources to return |
 **status** | **string** | Filter by source status (active, paused, private_mode, revoked, error) |

### Return type

[**V09SourcesList200Response**](V09SourcesList200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09SourcesRegister

> V09SourcesRegister201Response V09SourcesRegister(ctx).V09SourceRegisterRequest(v09SourceRegisterRequest).Execute()

Register a capture source for the caller's vault

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	v09SourceRegisterRequest := *openapiclient.NewV09SourceRegisterRequest("SourceProvider_example") // V09SourceRegisterRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09SourcesRegister(context.Background()).V09SourceRegisterRequest(v09SourceRegisterRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09SourcesRegister``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09SourcesRegister`: V09SourcesRegister201Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09SourcesRegister`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV09SourcesRegisterRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v09SourceRegisterRequest** | [**V09SourceRegisterRequest**](V09SourceRegisterRequest.md) |  |

### Return type

[**V09SourcesRegister201Response**](V09SourcesRegister201Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V09Usage

> V09UsageSummary V09Usage(ctx).Limit(limit).Execute()

Read vault usage and current plan-limit snapshot

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	limit := int32(56) // int32 | Recent usage events to include (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V09Usage(context.Background()).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V09Usage``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V09Usage`: V09UsageSummary
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V09Usage`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV09UsageRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** | Recent usage events to include |

### Return type

[**V09UsageSummary**](V09UsageSummary.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10AuthGoogleCallback

> V10GoogleAuthCallbackResponse V10AuthGoogleCallback(ctx).V10GoogleAuthCallbackRequest(v10GoogleAuthCallbackRequest).Execute()

Verify Google ID token, create or reuse account/identity/vault, and set a session cookie.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	v10GoogleAuthCallbackRequest := *openapiclient.NewV10GoogleAuthCallbackRequest("IdToken_example", "State_example") // V10GoogleAuthCallbackRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10AuthGoogleCallback(context.Background()).V10GoogleAuthCallbackRequest(v10GoogleAuthCallbackRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10AuthGoogleCallback``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10AuthGoogleCallback`: V10GoogleAuthCallbackResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10AuthGoogleCallback`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV10AuthGoogleCallbackRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v10GoogleAuthCallbackRequest** | [**V10GoogleAuthCallbackRequest**](V10GoogleAuthCallbackRequest.md) |  |

### Return type

[**V10GoogleAuthCallbackResponse**](V10GoogleAuthCallbackResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10AuthGoogleRedirectCallback

> V10GoogleAuthCallbackResponse V10AuthGoogleRedirectCallback(ctx).Code(code).State(state).Error_(error_).Execute()

Complete browser Google OAuth sign-in with an authorization code.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	code := "code_example" // string | Google OAuth authorization code returned to the redirect URI. (optional)
	state := "state_example" // string | Opaque OAuth state that must match the state cookie. (optional)
	error_ := "error__example" // string | Google OAuth error value when the user denies or Google rejects the request. (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10AuthGoogleRedirectCallback(context.Background()).Code(code).State(state).Error_(error_).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10AuthGoogleRedirectCallback``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10AuthGoogleRedirectCallback`: V10GoogleAuthCallbackResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10AuthGoogleRedirectCallback`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV10AuthGoogleRedirectCallbackRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **code** | **string** | Google OAuth authorization code returned to the redirect URI. |
 **state** | **string** | Opaque OAuth state that must match the state cookie. |
 **error_** | **string** | Google OAuth error value when the user denies or Google rejects the request. |

### Return type

[**V10GoogleAuthCallbackResponse**](V10GoogleAuthCallbackResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10AuthGoogleStart

> V10GoogleAuthStartResponse V10AuthGoogleStart(ctx).Execute()

Begin Google OIDC sign-in. Returns the authorization URL and sets a state cookie.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10AuthGoogleStart(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10AuthGoogleStart``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10AuthGoogleStart`: V10GoogleAuthStartResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10AuthGoogleStart`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV10AuthGoogleStartRequest struct via the builder pattern


### Return type

[**V10GoogleAuthStartResponse**](V10GoogleAuthStartResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10AuthLogout

> V10AuthLogout200Response V10AuthLogout(ctx).Execute()

Revoke the current web session. Requires CSRF header on session cookies.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10AuthLogout(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10AuthLogout``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10AuthLogout`: V10AuthLogout200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10AuthLogout`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV10AuthLogoutRequest struct via the builder pattern


### Return type

[**V10AuthLogout200Response**](V10AuthLogout200Response.md)

### Authorization

[loreCsrf](../README.md#loreCsrf), [loreSession](../README.md#loreSession)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10Me

> V10MeResponse V10Me(ctx).Execute()

Return the authenticated account, vault, and identity for the current session.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10Me(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10Me``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10Me`: V10MeResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10Me`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV10MeRequest struct via the builder pattern


### Return type

[**V10MeResponse**](V10MeResponse.md)

### Authorization

[loreSession](../README.md#loreSession)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10MemoryInboxApprove

> V10MemoryInboxApprove200Response V10MemoryInboxApprove(ctx, candidateId).Execute()

Approve a Memory Inbox candidate for future recall.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	candidateId := "candidateId_example" // string | Memory candidate id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10MemoryInboxApprove(context.Background(), candidateId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10MemoryInboxApprove``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10MemoryInboxApprove`: V10MemoryInboxApprove200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10MemoryInboxApprove`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**candidateId** | **string** | Memory candidate id |

### Other Parameters

Other parameters are passed through a pointer to a apiV10MemoryInboxApproveRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**V10MemoryInboxApprove200Response**](V10MemoryInboxApprove200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10MemoryInboxList

> V10MemoryInboxList200Response V10MemoryInboxList(ctx).Status(status).Limit(limit).Execute()

List Memory Inbox candidates for the authenticated vault.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	status := "status_example" // string | Optional candidate status filter (optional)
	limit := int32(56) // int32 | Maximum candidates to return (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10MemoryInboxList(context.Background()).Status(status).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10MemoryInboxList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10MemoryInboxList`: V10MemoryInboxList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10MemoryInboxList`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV10MemoryInboxListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **status** | **string** | Optional candidate status filter |
 **limit** | **int32** | Maximum candidates to return |

### Return type

[**V10MemoryInboxList200Response**](V10MemoryInboxList200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10MemoryInboxReject

> V10MemoryInboxApprove200Response V10MemoryInboxReject(ctx, candidateId).Execute()

Reject a Memory Inbox candidate so it is not reused.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	candidateId := "candidateId_example" // string | Memory candidate id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10MemoryInboxReject(context.Background(), candidateId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10MemoryInboxReject``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10MemoryInboxReject`: V10MemoryInboxApprove200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10MemoryInboxReject`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**candidateId** | **string** | Memory candidate id |

### Other Parameters

Other parameters are passed through a pointer to a apiV10MemoryInboxRejectRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**V10MemoryInboxApprove200Response**](V10MemoryInboxApprove200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10MyVault

> V10VaultResponse V10MyVault(ctx).Execute()

Return the personal vault for the current session.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10MyVault(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10MyVault``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10MyVault`: V10VaultResponse
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10MyVault`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV10MyVaultRequest struct via the builder pattern


### Return type

[**V10VaultResponse**](V10VaultResponse.md)

### Authorization

[loreSession](../README.md#loreSession)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10RecallTraceFeedback

> V10RecallTraceFeedback200Response V10RecallTraceFeedback(ctx, traceId).V10RecallTraceFeedbackRequest(v10RecallTraceFeedbackRequest).Execute()

Attach user feedback to a recall trace.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	traceId := "traceId_example" // string | Recall trace id
	v10RecallTraceFeedbackRequest := *openapiclient.NewV10RecallTraceFeedbackRequest("Feedback_example") // V10RecallTraceFeedbackRequest |

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10RecallTraceFeedback(context.Background(), traceId).V10RecallTraceFeedbackRequest(v10RecallTraceFeedbackRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10RecallTraceFeedback``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10RecallTraceFeedback`: V10RecallTraceFeedback200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10RecallTraceFeedback`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**traceId** | **string** | Recall trace id |

### Other Parameters

Other parameters are passed through a pointer to a apiV10RecallTraceFeedbackRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **v10RecallTraceFeedbackRequest** | [**V10RecallTraceFeedbackRequest**](V10RecallTraceFeedbackRequest.md) |  |

### Return type

[**V10RecallTraceFeedback200Response**](V10RecallTraceFeedback200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10RecallTraceGet

> V10RecallTraceGet200Response V10RecallTraceGet(ctx, traceId).Execute()

Inspect a single recall trace and its retrieved memory items.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	traceId := "traceId_example" // string | Recall trace id

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10RecallTraceGet(context.Background(), traceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10RecallTraceGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10RecallTraceGet`: V10RecallTraceGet200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10RecallTraceGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**traceId** | **string** | Recall trace id |

### Other Parameters

Other parameters are passed through a pointer to a apiV10RecallTraceGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**V10RecallTraceGet200Response**](V10RecallTraceGet200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V10RecallTraceList

> V10RecallTraceList200Response V10RecallTraceList(ctx).Limit(limit).Execute()

List recall Evidence Ledger traces for the authenticated vault.

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/lore-context/lore-context-go-sdk"
)

func main() {
	limit := int32(56) // int32 | Maximum traces to return (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DefaultAPI.V10RecallTraceList(context.Background()).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DefaultAPI.V10RecallTraceList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V10RecallTraceList`: V10RecallTraceList200Response
	fmt.Fprintf(os.Stdout, "Response from `DefaultAPI.V10RecallTraceList`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV10RecallTraceListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** | Maximum traces to return |

### Return type

[**V10RecallTraceList200Response**](V10RecallTraceList200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)
