# V09CaptureEventBatchResponseBatch

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**SourceId** | Pointer to **NullableString** |  | [optional]
**DeviceId** | Pointer to **NullableString** |  | [optional]
**BatchKind** | Pointer to **string** |  | [optional]
**EventCount** | Pointer to **int32** |  | [optional]
**Bytes** | Pointer to **int32** |  | [optional]
**Status** | Pointer to **string** |  | [optional]
**IdempotencyKey** | Pointer to **NullableString** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]
**ReceivedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewV09CaptureEventBatchResponseBatch

`func NewV09CaptureEventBatchResponseBatch() *V09CaptureEventBatchResponseBatch`

NewV09CaptureEventBatchResponseBatch instantiates a new V09CaptureEventBatchResponseBatch object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09CaptureEventBatchResponseBatchWithDefaults

`func NewV09CaptureEventBatchResponseBatchWithDefaults() *V09CaptureEventBatchResponseBatch`

NewV09CaptureEventBatchResponseBatchWithDefaults instantiates a new V09CaptureEventBatchResponseBatch object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *V09CaptureEventBatchResponseBatch) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *V09CaptureEventBatchResponseBatch) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *V09CaptureEventBatchResponseBatch) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *V09CaptureEventBatchResponseBatch) HasId() bool`

HasId returns a boolean if a field has been set.

### GetVaultId

`func (o *V09CaptureEventBatchResponseBatch) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *V09CaptureEventBatchResponseBatch) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *V09CaptureEventBatchResponseBatch) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *V09CaptureEventBatchResponseBatch) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetSourceId

`func (o *V09CaptureEventBatchResponseBatch) GetSourceId() string`

GetSourceId returns the SourceId field if non-nil, zero value otherwise.

### GetSourceIdOk

`func (o *V09CaptureEventBatchResponseBatch) GetSourceIdOk() (*string, bool)`

GetSourceIdOk returns a tuple with the SourceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceId

`func (o *V09CaptureEventBatchResponseBatch) SetSourceId(v string)`

SetSourceId sets SourceId field to given value.

### HasSourceId

`func (o *V09CaptureEventBatchResponseBatch) HasSourceId() bool`

HasSourceId returns a boolean if a field has been set.

### SetSourceIdNil

`func (o *V09CaptureEventBatchResponseBatch) SetSourceIdNil(b bool)`

 SetSourceIdNil sets the value for SourceId to be an explicit nil

### UnsetSourceId
`func (o *V09CaptureEventBatchResponseBatch) UnsetSourceId()`

UnsetSourceId ensures that no value is present for SourceId, not even an explicit nil
### GetDeviceId

`func (o *V09CaptureEventBatchResponseBatch) GetDeviceId() string`

GetDeviceId returns the DeviceId field if non-nil, zero value otherwise.

### GetDeviceIdOk

`func (o *V09CaptureEventBatchResponseBatch) GetDeviceIdOk() (*string, bool)`

GetDeviceIdOk returns a tuple with the DeviceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeviceId

`func (o *V09CaptureEventBatchResponseBatch) SetDeviceId(v string)`

SetDeviceId sets DeviceId field to given value.

### HasDeviceId

`func (o *V09CaptureEventBatchResponseBatch) HasDeviceId() bool`

HasDeviceId returns a boolean if a field has been set.

### SetDeviceIdNil

`func (o *V09CaptureEventBatchResponseBatch) SetDeviceIdNil(b bool)`

 SetDeviceIdNil sets the value for DeviceId to be an explicit nil

### UnsetDeviceId
`func (o *V09CaptureEventBatchResponseBatch) UnsetDeviceId()`

UnsetDeviceId ensures that no value is present for DeviceId, not even an explicit nil
### GetBatchKind

`func (o *V09CaptureEventBatchResponseBatch) GetBatchKind() string`

GetBatchKind returns the BatchKind field if non-nil, zero value otherwise.

### GetBatchKindOk

`func (o *V09CaptureEventBatchResponseBatch) GetBatchKindOk() (*string, bool)`

GetBatchKindOk returns a tuple with the BatchKind field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatchKind

`func (o *V09CaptureEventBatchResponseBatch) SetBatchKind(v string)`

SetBatchKind sets BatchKind field to given value.

### HasBatchKind

`func (o *V09CaptureEventBatchResponseBatch) HasBatchKind() bool`

HasBatchKind returns a boolean if a field has been set.

### GetEventCount

`func (o *V09CaptureEventBatchResponseBatch) GetEventCount() int32`

GetEventCount returns the EventCount field if non-nil, zero value otherwise.

### GetEventCountOk

`func (o *V09CaptureEventBatchResponseBatch) GetEventCountOk() (*int32, bool)`

GetEventCountOk returns a tuple with the EventCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventCount

`func (o *V09CaptureEventBatchResponseBatch) SetEventCount(v int32)`

SetEventCount sets EventCount field to given value.

### HasEventCount

`func (o *V09CaptureEventBatchResponseBatch) HasEventCount() bool`

HasEventCount returns a boolean if a field has been set.

### GetBytes

`func (o *V09CaptureEventBatchResponseBatch) GetBytes() int32`

GetBytes returns the Bytes field if non-nil, zero value otherwise.

### GetBytesOk

`func (o *V09CaptureEventBatchResponseBatch) GetBytesOk() (*int32, bool)`

GetBytesOk returns a tuple with the Bytes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBytes

`func (o *V09CaptureEventBatchResponseBatch) SetBytes(v int32)`

SetBytes sets Bytes field to given value.

### HasBytes

`func (o *V09CaptureEventBatchResponseBatch) HasBytes() bool`

HasBytes returns a boolean if a field has been set.

### GetStatus

`func (o *V09CaptureEventBatchResponseBatch) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *V09CaptureEventBatchResponseBatch) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *V09CaptureEventBatchResponseBatch) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *V09CaptureEventBatchResponseBatch) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetIdempotencyKey

`func (o *V09CaptureEventBatchResponseBatch) GetIdempotencyKey() string`

GetIdempotencyKey returns the IdempotencyKey field if non-nil, zero value otherwise.

### GetIdempotencyKeyOk

`func (o *V09CaptureEventBatchResponseBatch) GetIdempotencyKeyOk() (*string, bool)`

GetIdempotencyKeyOk returns a tuple with the IdempotencyKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIdempotencyKey

`func (o *V09CaptureEventBatchResponseBatch) SetIdempotencyKey(v string)`

SetIdempotencyKey sets IdempotencyKey field to given value.

### HasIdempotencyKey

`func (o *V09CaptureEventBatchResponseBatch) HasIdempotencyKey() bool`

HasIdempotencyKey returns a boolean if a field has been set.

### SetIdempotencyKeyNil

`func (o *V09CaptureEventBatchResponseBatch) SetIdempotencyKeyNil(b bool)`

 SetIdempotencyKeyNil sets the value for IdempotencyKey to be an explicit nil

### UnsetIdempotencyKey
`func (o *V09CaptureEventBatchResponseBatch) UnsetIdempotencyKey()`

UnsetIdempotencyKey ensures that no value is present for IdempotencyKey, not even an explicit nil
### GetMetadata

`func (o *V09CaptureEventBatchResponseBatch) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *V09CaptureEventBatchResponseBatch) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *V09CaptureEventBatchResponseBatch) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *V09CaptureEventBatchResponseBatch) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### GetReceivedAt

`func (o *V09CaptureEventBatchResponseBatch) GetReceivedAt() time.Time`

GetReceivedAt returns the ReceivedAt field if non-nil, zero value otherwise.

### GetReceivedAtOk

`func (o *V09CaptureEventBatchResponseBatch) GetReceivedAtOk() (*time.Time, bool)`

GetReceivedAtOk returns a tuple with the ReceivedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReceivedAt

`func (o *V09CaptureEventBatchResponseBatch) SetReceivedAt(v time.Time)`

SetReceivedAt sets ReceivedAt field to given value.

### HasReceivedAt

`func (o *V09CaptureEventBatchResponseBatch) HasReceivedAt() bool`

HasReceivedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
