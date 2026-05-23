# V09SessionDeltaRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SourceId** | **string** |  |
**SessionId** | **string** |  |
**Deltas** | [**[]V09SessionDeltaRequestDeltasInner**](V09SessionDeltaRequestDeltasInner.md) |  |

## Methods

### NewV09SessionDeltaRequest

`func NewV09SessionDeltaRequest(sourceId string, sessionId string, deltas []V09SessionDeltaRequestDeltasInner, ) *V09SessionDeltaRequest`

NewV09SessionDeltaRequest instantiates a new V09SessionDeltaRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09SessionDeltaRequestWithDefaults

`func NewV09SessionDeltaRequestWithDefaults() *V09SessionDeltaRequest`

NewV09SessionDeltaRequestWithDefaults instantiates a new V09SessionDeltaRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSourceId

`func (o *V09SessionDeltaRequest) GetSourceId() string`

GetSourceId returns the SourceId field if non-nil, zero value otherwise.

### GetSourceIdOk

`func (o *V09SessionDeltaRequest) GetSourceIdOk() (*string, bool)`

GetSourceIdOk returns a tuple with the SourceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceId

`func (o *V09SessionDeltaRequest) SetSourceId(v string)`

SetSourceId sets SourceId field to given value.


### GetSessionId

`func (o *V09SessionDeltaRequest) GetSessionId() string`

GetSessionId returns the SessionId field if non-nil, zero value otherwise.

### GetSessionIdOk

`func (o *V09SessionDeltaRequest) GetSessionIdOk() (*string, bool)`

GetSessionIdOk returns a tuple with the SessionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionId

`func (o *V09SessionDeltaRequest) SetSessionId(v string)`

SetSessionId sets SessionId field to given value.


### GetDeltas

`func (o *V09SessionDeltaRequest) GetDeltas() []V09SessionDeltaRequestDeltasInner`

GetDeltas returns the Deltas field if non-nil, zero value otherwise.

### GetDeltasOk

`func (o *V09SessionDeltaRequest) GetDeltasOk() (*[]V09SessionDeltaRequestDeltasInner, bool)`

GetDeltasOk returns a tuple with the Deltas field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeltas

`func (o *V09SessionDeltaRequest) SetDeltas(v []V09SessionDeltaRequestDeltasInner)`

SetDeltas sets Deltas field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
