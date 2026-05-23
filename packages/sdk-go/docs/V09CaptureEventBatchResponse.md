# V09CaptureEventBatchResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Batch** | Pointer to [**V09CaptureEventBatchResponseBatch**](V09CaptureEventBatchResponseBatch.md) |  | [optional]
**Accepted** | Pointer to **int32** |  | [optional]
**Deduped** | Pointer to **int32** |  | [optional]
**EventIds** | Pointer to **[]string** |  | [optional]

## Methods

### NewV09CaptureEventBatchResponse

`func NewV09CaptureEventBatchResponse() *V09CaptureEventBatchResponse`

NewV09CaptureEventBatchResponse instantiates a new V09CaptureEventBatchResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09CaptureEventBatchResponseWithDefaults

`func NewV09CaptureEventBatchResponseWithDefaults() *V09CaptureEventBatchResponse`

NewV09CaptureEventBatchResponseWithDefaults instantiates a new V09CaptureEventBatchResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetBatch

`func (o *V09CaptureEventBatchResponse) GetBatch() V09CaptureEventBatchResponseBatch`

GetBatch returns the Batch field if non-nil, zero value otherwise.

### GetBatchOk

`func (o *V09CaptureEventBatchResponse) GetBatchOk() (*V09CaptureEventBatchResponseBatch, bool)`

GetBatchOk returns a tuple with the Batch field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatch

`func (o *V09CaptureEventBatchResponse) SetBatch(v V09CaptureEventBatchResponseBatch)`

SetBatch sets Batch field to given value.

### HasBatch

`func (o *V09CaptureEventBatchResponse) HasBatch() bool`

HasBatch returns a boolean if a field has been set.

### GetAccepted

`func (o *V09CaptureEventBatchResponse) GetAccepted() int32`

GetAccepted returns the Accepted field if non-nil, zero value otherwise.

### GetAcceptedOk

`func (o *V09CaptureEventBatchResponse) GetAcceptedOk() (*int32, bool)`

GetAcceptedOk returns a tuple with the Accepted field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccepted

`func (o *V09CaptureEventBatchResponse) SetAccepted(v int32)`

SetAccepted sets Accepted field to given value.

### HasAccepted

`func (o *V09CaptureEventBatchResponse) HasAccepted() bool`

HasAccepted returns a boolean if a field has been set.

### GetDeduped

`func (o *V09CaptureEventBatchResponse) GetDeduped() int32`

GetDeduped returns the Deduped field if non-nil, zero value otherwise.

### GetDedupedOk

`func (o *V09CaptureEventBatchResponse) GetDedupedOk() (*int32, bool)`

GetDedupedOk returns a tuple with the Deduped field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeduped

`func (o *V09CaptureEventBatchResponse) SetDeduped(v int32)`

SetDeduped sets Deduped field to given value.

### HasDeduped

`func (o *V09CaptureEventBatchResponse) HasDeduped() bool`

HasDeduped returns a boolean if a field has been set.

### GetEventIds

`func (o *V09CaptureEventBatchResponse) GetEventIds() []string`

GetEventIds returns the EventIds field if non-nil, zero value otherwise.

### GetEventIdsOk

`func (o *V09CaptureEventBatchResponse) GetEventIdsOk() (*[]string, bool)`

GetEventIdsOk returns a tuple with the EventIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventIds

`func (o *V09CaptureEventBatchResponse) SetEventIds(v []string)`

SetEventIds sets EventIds field to given value.

### HasEventIds

`func (o *V09CaptureEventBatchResponse) HasEventIds() bool`

HasEventIds returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
