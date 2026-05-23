# ContextQueryResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TraceId** | Pointer to **string** |  | [optional]
**ContextBlock** | Pointer to **string** |  | [optional]
**Route** | Pointer to [**ContextRoute**](ContextRoute.md) |  | [optional]
**MemoryHits** | Pointer to [**[]MemoryHit**](MemoryHit.md) |  | [optional]
**WebEvidence** | Pointer to [**[]WebEvidence**](WebEvidence.md) |  | [optional]
**RepoEvidence** | Pointer to [**[]WebEvidence**](WebEvidence.md) |  | [optional]
**ToolTraceEvidence** | Pointer to [**[]WebEvidence**](WebEvidence.md) |  | [optional]
**Warnings** | Pointer to **[]string** |  | [optional]
**Confidence** | Pointer to **float32** |  | [optional]
**Usage** | Pointer to [**ContextQueryResponseUsage**](ContextQueryResponseUsage.md) |  | [optional]
**Tier** | Pointer to **string** |  | [optional]
**EffectiveTokenBudget** | Pointer to **int32** |  | [optional]

## Methods

### NewContextQueryResponse

`func NewContextQueryResponse() *ContextQueryResponse`

NewContextQueryResponse instantiates a new ContextQueryResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewContextQueryResponseWithDefaults

`func NewContextQueryResponseWithDefaults() *ContextQueryResponse`

NewContextQueryResponseWithDefaults instantiates a new ContextQueryResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTraceId

`func (o *ContextQueryResponse) GetTraceId() string`

GetTraceId returns the TraceId field if non-nil, zero value otherwise.

### GetTraceIdOk

`func (o *ContextQueryResponse) GetTraceIdOk() (*string, bool)`

GetTraceIdOk returns a tuple with the TraceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceId

`func (o *ContextQueryResponse) SetTraceId(v string)`

SetTraceId sets TraceId field to given value.

### HasTraceId

`func (o *ContextQueryResponse) HasTraceId() bool`

HasTraceId returns a boolean if a field has been set.

### GetContextBlock

`func (o *ContextQueryResponse) GetContextBlock() string`

GetContextBlock returns the ContextBlock field if non-nil, zero value otherwise.

### GetContextBlockOk

`func (o *ContextQueryResponse) GetContextBlockOk() (*string, bool)`

GetContextBlockOk returns a tuple with the ContextBlock field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContextBlock

`func (o *ContextQueryResponse) SetContextBlock(v string)`

SetContextBlock sets ContextBlock field to given value.

### HasContextBlock

`func (o *ContextQueryResponse) HasContextBlock() bool`

HasContextBlock returns a boolean if a field has been set.

### GetRoute

`func (o *ContextQueryResponse) GetRoute() ContextRoute`

GetRoute returns the Route field if non-nil, zero value otherwise.

### GetRouteOk

`func (o *ContextQueryResponse) GetRouteOk() (*ContextRoute, bool)`

GetRouteOk returns a tuple with the Route field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRoute

`func (o *ContextQueryResponse) SetRoute(v ContextRoute)`

SetRoute sets Route field to given value.

### HasRoute

`func (o *ContextQueryResponse) HasRoute() bool`

HasRoute returns a boolean if a field has been set.

### GetMemoryHits

`func (o *ContextQueryResponse) GetMemoryHits() []MemoryHit`

GetMemoryHits returns the MemoryHits field if non-nil, zero value otherwise.

### GetMemoryHitsOk

`func (o *ContextQueryResponse) GetMemoryHitsOk() (*[]MemoryHit, bool)`

GetMemoryHitsOk returns a tuple with the MemoryHits field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemoryHits

`func (o *ContextQueryResponse) SetMemoryHits(v []MemoryHit)`

SetMemoryHits sets MemoryHits field to given value.

### HasMemoryHits

`func (o *ContextQueryResponse) HasMemoryHits() bool`

HasMemoryHits returns a boolean if a field has been set.

### GetWebEvidence

`func (o *ContextQueryResponse) GetWebEvidence() []WebEvidence`

GetWebEvidence returns the WebEvidence field if non-nil, zero value otherwise.

### GetWebEvidenceOk

`func (o *ContextQueryResponse) GetWebEvidenceOk() (*[]WebEvidence, bool)`

GetWebEvidenceOk returns a tuple with the WebEvidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWebEvidence

`func (o *ContextQueryResponse) SetWebEvidence(v []WebEvidence)`

SetWebEvidence sets WebEvidence field to given value.

### HasWebEvidence

`func (o *ContextQueryResponse) HasWebEvidence() bool`

HasWebEvidence returns a boolean if a field has been set.

### GetRepoEvidence

`func (o *ContextQueryResponse) GetRepoEvidence() []WebEvidence`

GetRepoEvidence returns the RepoEvidence field if non-nil, zero value otherwise.

### GetRepoEvidenceOk

`func (o *ContextQueryResponse) GetRepoEvidenceOk() (*[]WebEvidence, bool)`

GetRepoEvidenceOk returns a tuple with the RepoEvidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRepoEvidence

`func (o *ContextQueryResponse) SetRepoEvidence(v []WebEvidence)`

SetRepoEvidence sets RepoEvidence field to given value.

### HasRepoEvidence

`func (o *ContextQueryResponse) HasRepoEvidence() bool`

HasRepoEvidence returns a boolean if a field has been set.

### GetToolTraceEvidence

`func (o *ContextQueryResponse) GetToolTraceEvidence() []WebEvidence`

GetToolTraceEvidence returns the ToolTraceEvidence field if non-nil, zero value otherwise.

### GetToolTraceEvidenceOk

`func (o *ContextQueryResponse) GetToolTraceEvidenceOk() (*[]WebEvidence, bool)`

GetToolTraceEvidenceOk returns a tuple with the ToolTraceEvidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToolTraceEvidence

`func (o *ContextQueryResponse) SetToolTraceEvidence(v []WebEvidence)`

SetToolTraceEvidence sets ToolTraceEvidence field to given value.

### HasToolTraceEvidence

`func (o *ContextQueryResponse) HasToolTraceEvidence() bool`

HasToolTraceEvidence returns a boolean if a field has been set.

### GetWarnings

`func (o *ContextQueryResponse) GetWarnings() []string`

GetWarnings returns the Warnings field if non-nil, zero value otherwise.

### GetWarningsOk

`func (o *ContextQueryResponse) GetWarningsOk() (*[]string, bool)`

GetWarningsOk returns a tuple with the Warnings field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWarnings

`func (o *ContextQueryResponse) SetWarnings(v []string)`

SetWarnings sets Warnings field to given value.

### HasWarnings

`func (o *ContextQueryResponse) HasWarnings() bool`

HasWarnings returns a boolean if a field has been set.

### GetConfidence

`func (o *ContextQueryResponse) GetConfidence() float32`

GetConfidence returns the Confidence field if non-nil, zero value otherwise.

### GetConfidenceOk

`func (o *ContextQueryResponse) GetConfidenceOk() (*float32, bool)`

GetConfidenceOk returns a tuple with the Confidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfidence

`func (o *ContextQueryResponse) SetConfidence(v float32)`

SetConfidence sets Confidence field to given value.

### HasConfidence

`func (o *ContextQueryResponse) HasConfidence() bool`

HasConfidence returns a boolean if a field has been set.

### GetUsage

`func (o *ContextQueryResponse) GetUsage() ContextQueryResponseUsage`

GetUsage returns the Usage field if non-nil, zero value otherwise.

### GetUsageOk

`func (o *ContextQueryResponse) GetUsageOk() (*ContextQueryResponseUsage, bool)`

GetUsageOk returns a tuple with the Usage field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUsage

`func (o *ContextQueryResponse) SetUsage(v ContextQueryResponseUsage)`

SetUsage sets Usage field to given value.

### HasUsage

`func (o *ContextQueryResponse) HasUsage() bool`

HasUsage returns a boolean if a field has been set.

### GetTier

`func (o *ContextQueryResponse) GetTier() string`

GetTier returns the Tier field if non-nil, zero value otherwise.

### GetTierOk

`func (o *ContextQueryResponse) GetTierOk() (*string, bool)`

GetTierOk returns a tuple with the Tier field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTier

`func (o *ContextQueryResponse) SetTier(v string)`

SetTier sets Tier field to given value.

### HasTier

`func (o *ContextQueryResponse) HasTier() bool`

HasTier returns a boolean if a field has been set.

### GetEffectiveTokenBudget

`func (o *ContextQueryResponse) GetEffectiveTokenBudget() int32`

GetEffectiveTokenBudget returns the EffectiveTokenBudget field if non-nil, zero value otherwise.

### GetEffectiveTokenBudgetOk

`func (o *ContextQueryResponse) GetEffectiveTokenBudgetOk() (*int32, bool)`

GetEffectiveTokenBudgetOk returns a tuple with the EffectiveTokenBudget field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEffectiveTokenBudget

`func (o *ContextQueryResponse) SetEffectiveTokenBudget(v int32)`

SetEffectiveTokenBudget sets EffectiveTokenBudget field to given value.

### HasEffectiveTokenBudget

`func (o *ContextQueryResponse) HasEffectiveTokenBudget() bool`

HasEffectiveTokenBudget returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
