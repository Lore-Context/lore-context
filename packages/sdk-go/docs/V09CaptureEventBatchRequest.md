# V09CaptureEventBatchRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SourceId** | **string** |  |
**BatchIdempotencyKey** | Pointer to **string** |  | [optional]
**Events** | [**[]V09CaptureEvent**](V09CaptureEvent.md) |  |

## Methods

### NewV09CaptureEventBatchRequest

`func NewV09CaptureEventBatchRequest(sourceId string, events []V09CaptureEvent, ) *V09CaptureEventBatchRequest`

NewV09CaptureEventBatchRequest instantiates a new V09CaptureEventBatchRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09CaptureEventBatchRequestWithDefaults

`func NewV09CaptureEventBatchRequestWithDefaults() *V09CaptureEventBatchRequest`

NewV09CaptureEventBatchRequestWithDefaults instantiates a new V09CaptureEventBatchRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSourceId

`func (o *V09CaptureEventBatchRequest) GetSourceId() string`

GetSourceId returns the SourceId field if non-nil, zero value otherwise.

### GetSourceIdOk

`func (o *V09CaptureEventBatchRequest) GetSourceIdOk() (*string, bool)`

GetSourceIdOk returns a tuple with the SourceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceId

`func (o *V09CaptureEventBatchRequest) SetSourceId(v string)`

SetSourceId sets SourceId field to given value.


### GetBatchIdempotencyKey

`func (o *V09CaptureEventBatchRequest) GetBatchIdempotencyKey() string`

GetBatchIdempotencyKey returns the BatchIdempotencyKey field if non-nil, zero value otherwise.

### GetBatchIdempotencyKeyOk

`func (o *V09CaptureEventBatchRequest) GetBatchIdempotencyKeyOk() (*string, bool)`

GetBatchIdempotencyKeyOk returns a tuple with the BatchIdempotencyKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBatchIdempotencyKey

`func (o *V09CaptureEventBatchRequest) SetBatchIdempotencyKey(v string)`

SetBatchIdempotencyKey sets BatchIdempotencyKey field to given value.

### HasBatchIdempotencyKey

`func (o *V09CaptureEventBatchRequest) HasBatchIdempotencyKey() bool`

HasBatchIdempotencyKey returns a boolean if a field has been set.

### GetEvents

`func (o *V09CaptureEventBatchRequest) GetEvents() []V09CaptureEvent`

GetEvents returns the Events field if non-nil, zero value otherwise.

### GetEventsOk

`func (o *V09CaptureEventBatchRequest) GetEventsOk() (*[]V09CaptureEvent, bool)`

GetEventsOk returns a tuple with the Events field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvents

`func (o *V09CaptureEventBatchRequest) SetEvents(v []V09CaptureEvent)`

SetEvents sets Events field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
