# V09CaptureEvent

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ExternalEventId** | Pointer to **NullableString** |  | [optional]
**EventType** | Pointer to **string** |  | [optional]
**OccurredAt** | Pointer to **NullableTime** |  | [optional]
**Actor** | Pointer to **NullableString** |  | [optional]
**ContentRef** | Pointer to **map[string]interface{}** |  | [optional]
**RedactionState** | Pointer to **string** |  | [optional]
**IdempotencyKey** | Pointer to **NullableString** |  | [optional]
**SessionId** | Pointer to **NullableString** |  | [optional]
**Payload** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewV09CaptureEvent

`func NewV09CaptureEvent() *V09CaptureEvent`

NewV09CaptureEvent instantiates a new V09CaptureEvent object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09CaptureEventWithDefaults

`func NewV09CaptureEventWithDefaults() *V09CaptureEvent`

NewV09CaptureEventWithDefaults instantiates a new V09CaptureEvent object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetExternalEventId

`func (o *V09CaptureEvent) GetExternalEventId() string`

GetExternalEventId returns the ExternalEventId field if non-nil, zero value otherwise.

### GetExternalEventIdOk

`func (o *V09CaptureEvent) GetExternalEventIdOk() (*string, bool)`

GetExternalEventIdOk returns a tuple with the ExternalEventId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExternalEventId

`func (o *V09CaptureEvent) SetExternalEventId(v string)`

SetExternalEventId sets ExternalEventId field to given value.

### HasExternalEventId

`func (o *V09CaptureEvent) HasExternalEventId() bool`

HasExternalEventId returns a boolean if a field has been set.

### SetExternalEventIdNil

`func (o *V09CaptureEvent) SetExternalEventIdNil(b bool)`

 SetExternalEventIdNil sets the value for ExternalEventId to be an explicit nil

### UnsetExternalEventId
`func (o *V09CaptureEvent) UnsetExternalEventId()`

UnsetExternalEventId ensures that no value is present for ExternalEventId, not even an explicit nil
### GetEventType

`func (o *V09CaptureEvent) GetEventType() string`

GetEventType returns the EventType field if non-nil, zero value otherwise.

### GetEventTypeOk

`func (o *V09CaptureEvent) GetEventTypeOk() (*string, bool)`

GetEventTypeOk returns a tuple with the EventType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventType

`func (o *V09CaptureEvent) SetEventType(v string)`

SetEventType sets EventType field to given value.

### HasEventType

`func (o *V09CaptureEvent) HasEventType() bool`

HasEventType returns a boolean if a field has been set.

### GetOccurredAt

`func (o *V09CaptureEvent) GetOccurredAt() time.Time`

GetOccurredAt returns the OccurredAt field if non-nil, zero value otherwise.

### GetOccurredAtOk

`func (o *V09CaptureEvent) GetOccurredAtOk() (*time.Time, bool)`

GetOccurredAtOk returns a tuple with the OccurredAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOccurredAt

`func (o *V09CaptureEvent) SetOccurredAt(v time.Time)`

SetOccurredAt sets OccurredAt field to given value.

### HasOccurredAt

`func (o *V09CaptureEvent) HasOccurredAt() bool`

HasOccurredAt returns a boolean if a field has been set.

### SetOccurredAtNil

`func (o *V09CaptureEvent) SetOccurredAtNil(b bool)`

 SetOccurredAtNil sets the value for OccurredAt to be an explicit nil

### UnsetOccurredAt
`func (o *V09CaptureEvent) UnsetOccurredAt()`

UnsetOccurredAt ensures that no value is present for OccurredAt, not even an explicit nil
### GetActor

`func (o *V09CaptureEvent) GetActor() string`

GetActor returns the Actor field if non-nil, zero value otherwise.

### GetActorOk

`func (o *V09CaptureEvent) GetActorOk() (*string, bool)`

GetActorOk returns a tuple with the Actor field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetActor

`func (o *V09CaptureEvent) SetActor(v string)`

SetActor sets Actor field to given value.

### HasActor

`func (o *V09CaptureEvent) HasActor() bool`

HasActor returns a boolean if a field has been set.

### SetActorNil

`func (o *V09CaptureEvent) SetActorNil(b bool)`

 SetActorNil sets the value for Actor to be an explicit nil

### UnsetActor
`func (o *V09CaptureEvent) UnsetActor()`

UnsetActor ensures that no value is present for Actor, not even an explicit nil
### GetContentRef

`func (o *V09CaptureEvent) GetContentRef() map[string]interface{}`

GetContentRef returns the ContentRef field if non-nil, zero value otherwise.

### GetContentRefOk

`func (o *V09CaptureEvent) GetContentRefOk() (*map[string]interface{}, bool)`

GetContentRefOk returns a tuple with the ContentRef field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContentRef

`func (o *V09CaptureEvent) SetContentRef(v map[string]interface{})`

SetContentRef sets ContentRef field to given value.

### HasContentRef

`func (o *V09CaptureEvent) HasContentRef() bool`

HasContentRef returns a boolean if a field has been set.

### GetRedactionState

`func (o *V09CaptureEvent) GetRedactionState() string`

GetRedactionState returns the RedactionState field if non-nil, zero value otherwise.

### GetRedactionStateOk

`func (o *V09CaptureEvent) GetRedactionStateOk() (*string, bool)`

GetRedactionStateOk returns a tuple with the RedactionState field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRedactionState

`func (o *V09CaptureEvent) SetRedactionState(v string)`

SetRedactionState sets RedactionState field to given value.

### HasRedactionState

`func (o *V09CaptureEvent) HasRedactionState() bool`

HasRedactionState returns a boolean if a field has been set.

### GetIdempotencyKey

`func (o *V09CaptureEvent) GetIdempotencyKey() string`

GetIdempotencyKey returns the IdempotencyKey field if non-nil, zero value otherwise.

### GetIdempotencyKeyOk

`func (o *V09CaptureEvent) GetIdempotencyKeyOk() (*string, bool)`

GetIdempotencyKeyOk returns a tuple with the IdempotencyKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIdempotencyKey

`func (o *V09CaptureEvent) SetIdempotencyKey(v string)`

SetIdempotencyKey sets IdempotencyKey field to given value.

### HasIdempotencyKey

`func (o *V09CaptureEvent) HasIdempotencyKey() bool`

HasIdempotencyKey returns a boolean if a field has been set.

### SetIdempotencyKeyNil

`func (o *V09CaptureEvent) SetIdempotencyKeyNil(b bool)`

 SetIdempotencyKeyNil sets the value for IdempotencyKey to be an explicit nil

### UnsetIdempotencyKey
`func (o *V09CaptureEvent) UnsetIdempotencyKey()`

UnsetIdempotencyKey ensures that no value is present for IdempotencyKey, not even an explicit nil
### GetSessionId

`func (o *V09CaptureEvent) GetSessionId() string`

GetSessionId returns the SessionId field if non-nil, zero value otherwise.

### GetSessionIdOk

`func (o *V09CaptureEvent) GetSessionIdOk() (*string, bool)`

GetSessionIdOk returns a tuple with the SessionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionId

`func (o *V09CaptureEvent) SetSessionId(v string)`

SetSessionId sets SessionId field to given value.

### HasSessionId

`func (o *V09CaptureEvent) HasSessionId() bool`

HasSessionId returns a boolean if a field has been set.

### SetSessionIdNil

`func (o *V09CaptureEvent) SetSessionIdNil(b bool)`

 SetSessionIdNil sets the value for SessionId to be an explicit nil

### UnsetSessionId
`func (o *V09CaptureEvent) UnsetSessionId()`

UnsetSessionId ensures that no value is present for SessionId, not even an explicit nil
### GetPayload

`func (o *V09CaptureEvent) GetPayload() map[string]interface{}`

GetPayload returns the Payload field if non-nil, zero value otherwise.

### GetPayloadOk

`func (o *V09CaptureEvent) GetPayloadOk() (*map[string]interface{}, bool)`

GetPayloadOk returns a tuple with the Payload field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPayload

`func (o *V09CaptureEvent) SetPayload(v map[string]interface{})`

SetPayload sets Payload field to given value.

### HasPayload

`func (o *V09CaptureEvent) HasPayload() bool`

HasPayload returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
