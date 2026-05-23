# EventsIngestRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**EventType** | **string** |  |
**ProjectId** | Pointer to **string** |  | [optional]
**Payload** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewEventsIngestRequest

`func NewEventsIngestRequest(eventType string, ) *EventsIngestRequest`

NewEventsIngestRequest instantiates a new EventsIngestRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEventsIngestRequestWithDefaults

`func NewEventsIngestRequestWithDefaults() *EventsIngestRequest`

NewEventsIngestRequestWithDefaults instantiates a new EventsIngestRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEventType

`func (o *EventsIngestRequest) GetEventType() string`

GetEventType returns the EventType field if non-nil, zero value otherwise.

### GetEventTypeOk

`func (o *EventsIngestRequest) GetEventTypeOk() (*string, bool)`

GetEventTypeOk returns a tuple with the EventType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventType

`func (o *EventsIngestRequest) SetEventType(v string)`

SetEventType sets EventType field to given value.


### GetProjectId

`func (o *EventsIngestRequest) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *EventsIngestRequest) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *EventsIngestRequest) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.

### HasProjectId

`func (o *EventsIngestRequest) HasProjectId() bool`

HasProjectId returns a boolean if a field has been set.

### GetPayload

`func (o *EventsIngestRequest) GetPayload() map[string]interface{}`

GetPayload returns the Payload field if non-nil, zero value otherwise.

### GetPayloadOk

`func (o *EventsIngestRequest) GetPayloadOk() (*map[string]interface{}, bool)`

GetPayloadOk returns a tuple with the Payload field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPayload

`func (o *EventsIngestRequest) SetPayload(v map[string]interface{})`

SetPayload sets Payload field to given value.

### HasPayload

`func (o *EventsIngestRequest) HasPayload() bool`

HasPayload returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
