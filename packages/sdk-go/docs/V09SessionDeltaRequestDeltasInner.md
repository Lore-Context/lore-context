# V09SessionDeltaRequestDeltasInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**IdempotencyKey** | **string** |  |
**OccurredAt** | Pointer to **time.Time** |  | [optional]
**Payload** | **map[string]interface{}** |  |

## Methods

### NewV09SessionDeltaRequestDeltasInner

`func NewV09SessionDeltaRequestDeltasInner(idempotencyKey string, payload map[string]interface{}, ) *V09SessionDeltaRequestDeltasInner`

NewV09SessionDeltaRequestDeltasInner instantiates a new V09SessionDeltaRequestDeltasInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09SessionDeltaRequestDeltasInnerWithDefaults

`func NewV09SessionDeltaRequestDeltasInnerWithDefaults() *V09SessionDeltaRequestDeltasInner`

NewV09SessionDeltaRequestDeltasInnerWithDefaults instantiates a new V09SessionDeltaRequestDeltasInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetIdempotencyKey

`func (o *V09SessionDeltaRequestDeltasInner) GetIdempotencyKey() string`

GetIdempotencyKey returns the IdempotencyKey field if non-nil, zero value otherwise.

### GetIdempotencyKeyOk

`func (o *V09SessionDeltaRequestDeltasInner) GetIdempotencyKeyOk() (*string, bool)`

GetIdempotencyKeyOk returns a tuple with the IdempotencyKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIdempotencyKey

`func (o *V09SessionDeltaRequestDeltasInner) SetIdempotencyKey(v string)`

SetIdempotencyKey sets IdempotencyKey field to given value.


### GetOccurredAt

`func (o *V09SessionDeltaRequestDeltasInner) GetOccurredAt() time.Time`

GetOccurredAt returns the OccurredAt field if non-nil, zero value otherwise.

### GetOccurredAtOk

`func (o *V09SessionDeltaRequestDeltasInner) GetOccurredAtOk() (*time.Time, bool)`

GetOccurredAtOk returns a tuple with the OccurredAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOccurredAt

`func (o *V09SessionDeltaRequestDeltasInner) SetOccurredAt(v time.Time)`

SetOccurredAt sets OccurredAt field to given value.

### HasOccurredAt

`func (o *V09SessionDeltaRequestDeltasInner) HasOccurredAt() bool`

HasOccurredAt returns a boolean if a field has been set.

### GetPayload

`func (o *V09SessionDeltaRequestDeltasInner) GetPayload() map[string]interface{}`

GetPayload returns the Payload field if non-nil, zero value otherwise.

### GetPayloadOk

`func (o *V09SessionDeltaRequestDeltasInner) GetPayloadOk() (*map[string]interface{}, bool)`

GetPayloadOk returns a tuple with the Payload field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPayload

`func (o *V09SessionDeltaRequestDeltasInner) SetPayload(v map[string]interface{})`

SetPayload sets Payload field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
