# MemorySearch200ResponseDiagnosticsStreamsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Kind** | Pointer to **string** | Stream kind (e.g. qdrant_dense, postgres_fts) | [optional]
**Backend** | Pointer to **string** | Backend identifier | [optional]
**Status** | Pointer to **string** | Stream execution status | [optional]
**CandidateCount** | Pointer to **int32** | Number of candidates returned by this stream | [optional]
**LatencyMs** | Pointer to **float32** | Stream latency in milliseconds | [optional]
**Error** | Pointer to **string** | Error message if status is failed or timed_out | [optional]

## Methods

### NewMemorySearch200ResponseDiagnosticsStreamsInner

`func NewMemorySearch200ResponseDiagnosticsStreamsInner() *MemorySearch200ResponseDiagnosticsStreamsInner`

NewMemorySearch200ResponseDiagnosticsStreamsInner instantiates a new MemorySearch200ResponseDiagnosticsStreamsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemorySearch200ResponseDiagnosticsStreamsInnerWithDefaults

`func NewMemorySearch200ResponseDiagnosticsStreamsInnerWithDefaults() *MemorySearch200ResponseDiagnosticsStreamsInner`

NewMemorySearch200ResponseDiagnosticsStreamsInnerWithDefaults instantiates a new MemorySearch200ResponseDiagnosticsStreamsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetKind

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetKind() string`

GetKind returns the Kind field if non-nil, zero value otherwise.

### GetKindOk

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetKindOk() (*string, bool)`

GetKindOk returns a tuple with the Kind field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKind

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) SetKind(v string)`

SetKind sets Kind field to given value.

### HasKind

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) HasKind() bool`

HasKind returns a boolean if a field has been set.

### GetBackend

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetBackend() string`

GetBackend returns the Backend field if non-nil, zero value otherwise.

### GetBackendOk

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetBackendOk() (*string, bool)`

GetBackendOk returns a tuple with the Backend field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBackend

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) SetBackend(v string)`

SetBackend sets Backend field to given value.

### HasBackend

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) HasBackend() bool`

HasBackend returns a boolean if a field has been set.

### GetStatus

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetCandidateCount

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetCandidateCount() int32`

GetCandidateCount returns the CandidateCount field if non-nil, zero value otherwise.

### GetCandidateCountOk

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetCandidateCountOk() (*int32, bool)`

GetCandidateCountOk returns a tuple with the CandidateCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCandidateCount

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) SetCandidateCount(v int32)`

SetCandidateCount sets CandidateCount field to given value.

### HasCandidateCount

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) HasCandidateCount() bool`

HasCandidateCount returns a boolean if a field has been set.

### GetLatencyMs

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetLatencyMs() float32`

GetLatencyMs returns the LatencyMs field if non-nil, zero value otherwise.

### GetLatencyMsOk

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetLatencyMsOk() (*float32, bool)`

GetLatencyMsOk returns a tuple with the LatencyMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLatencyMs

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) SetLatencyMs(v float32)`

SetLatencyMs sets LatencyMs field to given value.

### HasLatencyMs

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) HasLatencyMs() bool`

HasLatencyMs returns a boolean if a field has been set.

### GetError

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetError() string`

GetError returns the Error field if non-nil, zero value otherwise.

### GetErrorOk

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) GetErrorOk() (*string, bool)`

GetErrorOk returns a tuple with the Error field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetError

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) SetError(v string)`

SetError sets Error field to given value.

### HasError

`func (o *MemorySearch200ResponseDiagnosticsStreamsInner) HasError() bool`

HasError returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
