# CaptureSessionIngestRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Provider** | **string** |  |
**SourceOriginalId** | **string** |  |
**SourceId** | **string** |  |
**ContentHash** | **string** |  |
**IdempotencyKey** | **string** |  |
**CaptureMode** | Pointer to **string** |  | [optional]
**StartedAt** | Pointer to **time.Time** |  | [optional]
**EndedAt** | Pointer to **time.Time** |  | [optional]
**Redaction** | [**CaptureSessionIngestRequestRedaction**](CaptureSessionIngestRequestRedaction.md) |  |
**TurnSummary** | Pointer to [**[]CaptureSessionIngestRequestTurnSummaryInner**](CaptureSessionIngestRequestTurnSummaryInner.md) |  | [optional]
**RawTurns** | Pointer to **[]map[string]interface{}** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewCaptureSessionIngestRequest

`func NewCaptureSessionIngestRequest(provider string, sourceOriginalId string, sourceId string, contentHash string, idempotencyKey string, redaction CaptureSessionIngestRequestRedaction, ) *CaptureSessionIngestRequest`

NewCaptureSessionIngestRequest instantiates a new CaptureSessionIngestRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCaptureSessionIngestRequestWithDefaults

`func NewCaptureSessionIngestRequestWithDefaults() *CaptureSessionIngestRequest`

NewCaptureSessionIngestRequestWithDefaults instantiates a new CaptureSessionIngestRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetProvider

`func (o *CaptureSessionIngestRequest) GetProvider() string`

GetProvider returns the Provider field if non-nil, zero value otherwise.

### GetProviderOk

`func (o *CaptureSessionIngestRequest) GetProviderOk() (*string, bool)`

GetProviderOk returns a tuple with the Provider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProvider

`func (o *CaptureSessionIngestRequest) SetProvider(v string)`

SetProvider sets Provider field to given value.


### GetSourceOriginalId

`func (o *CaptureSessionIngestRequest) GetSourceOriginalId() string`

GetSourceOriginalId returns the SourceOriginalId field if non-nil, zero value otherwise.

### GetSourceOriginalIdOk

`func (o *CaptureSessionIngestRequest) GetSourceOriginalIdOk() (*string, bool)`

GetSourceOriginalIdOk returns a tuple with the SourceOriginalId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceOriginalId

`func (o *CaptureSessionIngestRequest) SetSourceOriginalId(v string)`

SetSourceOriginalId sets SourceOriginalId field to given value.


### GetSourceId

`func (o *CaptureSessionIngestRequest) GetSourceId() string`

GetSourceId returns the SourceId field if non-nil, zero value otherwise.

### GetSourceIdOk

`func (o *CaptureSessionIngestRequest) GetSourceIdOk() (*string, bool)`

GetSourceIdOk returns a tuple with the SourceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceId

`func (o *CaptureSessionIngestRequest) SetSourceId(v string)`

SetSourceId sets SourceId field to given value.


### GetContentHash

`func (o *CaptureSessionIngestRequest) GetContentHash() string`

GetContentHash returns the ContentHash field if non-nil, zero value otherwise.

### GetContentHashOk

`func (o *CaptureSessionIngestRequest) GetContentHashOk() (*string, bool)`

GetContentHashOk returns a tuple with the ContentHash field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContentHash

`func (o *CaptureSessionIngestRequest) SetContentHash(v string)`

SetContentHash sets ContentHash field to given value.


### GetIdempotencyKey

`func (o *CaptureSessionIngestRequest) GetIdempotencyKey() string`

GetIdempotencyKey returns the IdempotencyKey field if non-nil, zero value otherwise.

### GetIdempotencyKeyOk

`func (o *CaptureSessionIngestRequest) GetIdempotencyKeyOk() (*string, bool)`

GetIdempotencyKeyOk returns a tuple with the IdempotencyKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIdempotencyKey

`func (o *CaptureSessionIngestRequest) SetIdempotencyKey(v string)`

SetIdempotencyKey sets IdempotencyKey field to given value.


### GetCaptureMode

`func (o *CaptureSessionIngestRequest) GetCaptureMode() string`

GetCaptureMode returns the CaptureMode field if non-nil, zero value otherwise.

### GetCaptureModeOk

`func (o *CaptureSessionIngestRequest) GetCaptureModeOk() (*string, bool)`

GetCaptureModeOk returns a tuple with the CaptureMode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCaptureMode

`func (o *CaptureSessionIngestRequest) SetCaptureMode(v string)`

SetCaptureMode sets CaptureMode field to given value.

### HasCaptureMode

`func (o *CaptureSessionIngestRequest) HasCaptureMode() bool`

HasCaptureMode returns a boolean if a field has been set.

### GetStartedAt

`func (o *CaptureSessionIngestRequest) GetStartedAt() time.Time`

GetStartedAt returns the StartedAt field if non-nil, zero value otherwise.

### GetStartedAtOk

`func (o *CaptureSessionIngestRequest) GetStartedAtOk() (*time.Time, bool)`

GetStartedAtOk returns a tuple with the StartedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartedAt

`func (o *CaptureSessionIngestRequest) SetStartedAt(v time.Time)`

SetStartedAt sets StartedAt field to given value.

### HasStartedAt

`func (o *CaptureSessionIngestRequest) HasStartedAt() bool`

HasStartedAt returns a boolean if a field has been set.

### GetEndedAt

`func (o *CaptureSessionIngestRequest) GetEndedAt() time.Time`

GetEndedAt returns the EndedAt field if non-nil, zero value otherwise.

### GetEndedAtOk

`func (o *CaptureSessionIngestRequest) GetEndedAtOk() (*time.Time, bool)`

GetEndedAtOk returns a tuple with the EndedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndedAt

`func (o *CaptureSessionIngestRequest) SetEndedAt(v time.Time)`

SetEndedAt sets EndedAt field to given value.

### HasEndedAt

`func (o *CaptureSessionIngestRequest) HasEndedAt() bool`

HasEndedAt returns a boolean if a field has been set.

### GetRedaction

`func (o *CaptureSessionIngestRequest) GetRedaction() CaptureSessionIngestRequestRedaction`

GetRedaction returns the Redaction field if non-nil, zero value otherwise.

### GetRedactionOk

`func (o *CaptureSessionIngestRequest) GetRedactionOk() (*CaptureSessionIngestRequestRedaction, bool)`

GetRedactionOk returns a tuple with the Redaction field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRedaction

`func (o *CaptureSessionIngestRequest) SetRedaction(v CaptureSessionIngestRequestRedaction)`

SetRedaction sets Redaction field to given value.


### GetTurnSummary

`func (o *CaptureSessionIngestRequest) GetTurnSummary() []CaptureSessionIngestRequestTurnSummaryInner`

GetTurnSummary returns the TurnSummary field if non-nil, zero value otherwise.

### GetTurnSummaryOk

`func (o *CaptureSessionIngestRequest) GetTurnSummaryOk() (*[]CaptureSessionIngestRequestTurnSummaryInner, bool)`

GetTurnSummaryOk returns a tuple with the TurnSummary field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTurnSummary

`func (o *CaptureSessionIngestRequest) SetTurnSummary(v []CaptureSessionIngestRequestTurnSummaryInner)`

SetTurnSummary sets TurnSummary field to given value.

### HasTurnSummary

`func (o *CaptureSessionIngestRequest) HasTurnSummary() bool`

HasTurnSummary returns a boolean if a field has been set.

### GetRawTurns

`func (o *CaptureSessionIngestRequest) GetRawTurns() []map[string]interface{}`

GetRawTurns returns the RawTurns field if non-nil, zero value otherwise.

### GetRawTurnsOk

`func (o *CaptureSessionIngestRequest) GetRawTurnsOk() (*[]map[string]interface{}, bool)`

GetRawTurnsOk returns a tuple with the RawTurns field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRawTurns

`func (o *CaptureSessionIngestRequest) SetRawTurns(v []map[string]interface{})`

SetRawTurns sets RawTurns field to given value.

### HasRawTurns

`func (o *CaptureSessionIngestRequest) HasRawTurns() bool`

HasRawTurns returns a boolean if a field has been set.

### GetMetadata

`func (o *CaptureSessionIngestRequest) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *CaptureSessionIngestRequest) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *CaptureSessionIngestRequest) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *CaptureSessionIngestRequest) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
