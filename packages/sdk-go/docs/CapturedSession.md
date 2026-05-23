# CapturedSession

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**SourceId** | Pointer to **string** |  | [optional]
**DeviceId** | Pointer to **NullableString** |  | [optional]
**Provider** | Pointer to **string** |  | [optional]
**SourceOriginalId** | Pointer to **string** |  | [optional]
**ContentHash** | Pointer to **string** |  | [optional]
**IdempotencyKey** | Pointer to **string** |  | [optional]
**CaptureMode** | Pointer to **string** |  | [optional]
**StartedAt** | Pointer to **NullableTime** |  | [optional]
**EndedAt** | Pointer to **NullableTime** |  | [optional]
**Redaction** | Pointer to [**CapturedSessionRedaction**](CapturedSessionRedaction.md) |  | [optional]
**ReceivedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewCapturedSession

`func NewCapturedSession() *CapturedSession`

NewCapturedSession instantiates a new CapturedSession object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCapturedSessionWithDefaults

`func NewCapturedSessionWithDefaults() *CapturedSession`

NewCapturedSessionWithDefaults instantiates a new CapturedSession object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *CapturedSession) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *CapturedSession) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *CapturedSession) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *CapturedSession) HasId() bool`

HasId returns a boolean if a field has been set.

### GetVaultId

`func (o *CapturedSession) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *CapturedSession) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *CapturedSession) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *CapturedSession) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetSourceId

`func (o *CapturedSession) GetSourceId() string`

GetSourceId returns the SourceId field if non-nil, zero value otherwise.

### GetSourceIdOk

`func (o *CapturedSession) GetSourceIdOk() (*string, bool)`

GetSourceIdOk returns a tuple with the SourceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceId

`func (o *CapturedSession) SetSourceId(v string)`

SetSourceId sets SourceId field to given value.

### HasSourceId

`func (o *CapturedSession) HasSourceId() bool`

HasSourceId returns a boolean if a field has been set.

### GetDeviceId

`func (o *CapturedSession) GetDeviceId() string`

GetDeviceId returns the DeviceId field if non-nil, zero value otherwise.

### GetDeviceIdOk

`func (o *CapturedSession) GetDeviceIdOk() (*string, bool)`

GetDeviceIdOk returns a tuple with the DeviceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeviceId

`func (o *CapturedSession) SetDeviceId(v string)`

SetDeviceId sets DeviceId field to given value.

### HasDeviceId

`func (o *CapturedSession) HasDeviceId() bool`

HasDeviceId returns a boolean if a field has been set.

### SetDeviceIdNil

`func (o *CapturedSession) SetDeviceIdNil(b bool)`

 SetDeviceIdNil sets the value for DeviceId to be an explicit nil

### UnsetDeviceId
`func (o *CapturedSession) UnsetDeviceId()`

UnsetDeviceId ensures that no value is present for DeviceId, not even an explicit nil
### GetProvider

`func (o *CapturedSession) GetProvider() string`

GetProvider returns the Provider field if non-nil, zero value otherwise.

### GetProviderOk

`func (o *CapturedSession) GetProviderOk() (*string, bool)`

GetProviderOk returns a tuple with the Provider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProvider

`func (o *CapturedSession) SetProvider(v string)`

SetProvider sets Provider field to given value.

### HasProvider

`func (o *CapturedSession) HasProvider() bool`

HasProvider returns a boolean if a field has been set.

### GetSourceOriginalId

`func (o *CapturedSession) GetSourceOriginalId() string`

GetSourceOriginalId returns the SourceOriginalId field if non-nil, zero value otherwise.

### GetSourceOriginalIdOk

`func (o *CapturedSession) GetSourceOriginalIdOk() (*string, bool)`

GetSourceOriginalIdOk returns a tuple with the SourceOriginalId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceOriginalId

`func (o *CapturedSession) SetSourceOriginalId(v string)`

SetSourceOriginalId sets SourceOriginalId field to given value.

### HasSourceOriginalId

`func (o *CapturedSession) HasSourceOriginalId() bool`

HasSourceOriginalId returns a boolean if a field has been set.

### GetContentHash

`func (o *CapturedSession) GetContentHash() string`

GetContentHash returns the ContentHash field if non-nil, zero value otherwise.

### GetContentHashOk

`func (o *CapturedSession) GetContentHashOk() (*string, bool)`

GetContentHashOk returns a tuple with the ContentHash field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContentHash

`func (o *CapturedSession) SetContentHash(v string)`

SetContentHash sets ContentHash field to given value.

### HasContentHash

`func (o *CapturedSession) HasContentHash() bool`

HasContentHash returns a boolean if a field has been set.

### GetIdempotencyKey

`func (o *CapturedSession) GetIdempotencyKey() string`

GetIdempotencyKey returns the IdempotencyKey field if non-nil, zero value otherwise.

### GetIdempotencyKeyOk

`func (o *CapturedSession) GetIdempotencyKeyOk() (*string, bool)`

GetIdempotencyKeyOk returns a tuple with the IdempotencyKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIdempotencyKey

`func (o *CapturedSession) SetIdempotencyKey(v string)`

SetIdempotencyKey sets IdempotencyKey field to given value.

### HasIdempotencyKey

`func (o *CapturedSession) HasIdempotencyKey() bool`

HasIdempotencyKey returns a boolean if a field has been set.

### GetCaptureMode

`func (o *CapturedSession) GetCaptureMode() string`

GetCaptureMode returns the CaptureMode field if non-nil, zero value otherwise.

### GetCaptureModeOk

`func (o *CapturedSession) GetCaptureModeOk() (*string, bool)`

GetCaptureModeOk returns a tuple with the CaptureMode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCaptureMode

`func (o *CapturedSession) SetCaptureMode(v string)`

SetCaptureMode sets CaptureMode field to given value.

### HasCaptureMode

`func (o *CapturedSession) HasCaptureMode() bool`

HasCaptureMode returns a boolean if a field has been set.

### GetStartedAt

`func (o *CapturedSession) GetStartedAt() time.Time`

GetStartedAt returns the StartedAt field if non-nil, zero value otherwise.

### GetStartedAtOk

`func (o *CapturedSession) GetStartedAtOk() (*time.Time, bool)`

GetStartedAtOk returns a tuple with the StartedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartedAt

`func (o *CapturedSession) SetStartedAt(v time.Time)`

SetStartedAt sets StartedAt field to given value.

### HasStartedAt

`func (o *CapturedSession) HasStartedAt() bool`

HasStartedAt returns a boolean if a field has been set.

### SetStartedAtNil

`func (o *CapturedSession) SetStartedAtNil(b bool)`

 SetStartedAtNil sets the value for StartedAt to be an explicit nil

### UnsetStartedAt
`func (o *CapturedSession) UnsetStartedAt()`

UnsetStartedAt ensures that no value is present for StartedAt, not even an explicit nil
### GetEndedAt

`func (o *CapturedSession) GetEndedAt() time.Time`

GetEndedAt returns the EndedAt field if non-nil, zero value otherwise.

### GetEndedAtOk

`func (o *CapturedSession) GetEndedAtOk() (*time.Time, bool)`

GetEndedAtOk returns a tuple with the EndedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndedAt

`func (o *CapturedSession) SetEndedAt(v time.Time)`

SetEndedAt sets EndedAt field to given value.

### HasEndedAt

`func (o *CapturedSession) HasEndedAt() bool`

HasEndedAt returns a boolean if a field has been set.

### SetEndedAtNil

`func (o *CapturedSession) SetEndedAtNil(b bool)`

 SetEndedAtNil sets the value for EndedAt to be an explicit nil

### UnsetEndedAt
`func (o *CapturedSession) UnsetEndedAt()`

UnsetEndedAt ensures that no value is present for EndedAt, not even an explicit nil
### GetRedaction

`func (o *CapturedSession) GetRedaction() CapturedSessionRedaction`

GetRedaction returns the Redaction field if non-nil, zero value otherwise.

### GetRedactionOk

`func (o *CapturedSession) GetRedactionOk() (*CapturedSessionRedaction, bool)`

GetRedactionOk returns a tuple with the Redaction field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRedaction

`func (o *CapturedSession) SetRedaction(v CapturedSessionRedaction)`

SetRedaction sets Redaction field to given value.

### HasRedaction

`func (o *CapturedSession) HasRedaction() bool`

HasRedaction returns a boolean if a field has been set.

### GetReceivedAt

`func (o *CapturedSession) GetReceivedAt() time.Time`

GetReceivedAt returns the ReceivedAt field if non-nil, zero value otherwise.

### GetReceivedAtOk

`func (o *CapturedSession) GetReceivedAtOk() (*time.Time, bool)`

GetReceivedAtOk returns a tuple with the ReceivedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReceivedAt

`func (o *CapturedSession) SetReceivedAt(v time.Time)`

SetReceivedAt sets ReceivedAt field to given value.

### HasReceivedAt

`func (o *CapturedSession) HasReceivedAt() bool`

HasReceivedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
