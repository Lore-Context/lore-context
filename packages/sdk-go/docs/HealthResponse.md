# HealthResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Status** | Pointer to **interface{}** |  | [optional]
**Service** | Pointer to **interface{}** |  | [optional]
**Timestamp** | Pointer to **time.Time** |  | [optional]
**Reranker** | Pointer to [**HealthResponseReranker**](HealthResponseReranker.md) |  | [optional]

## Methods

### NewHealthResponse

`func NewHealthResponse() *HealthResponse`

NewHealthResponse instantiates a new HealthResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewHealthResponseWithDefaults

`func NewHealthResponseWithDefaults() *HealthResponse`

NewHealthResponseWithDefaults instantiates a new HealthResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetStatus

`func (o *HealthResponse) GetStatus() interface{}`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *HealthResponse) GetStatusOk() (*interface{}, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *HealthResponse) SetStatus(v interface{})`

SetStatus sets Status field to given value.

### HasStatus

`func (o *HealthResponse) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### SetStatusNil

`func (o *HealthResponse) SetStatusNil(b bool)`

 SetStatusNil sets the value for Status to be an explicit nil

### UnsetStatus
`func (o *HealthResponse) UnsetStatus()`

UnsetStatus ensures that no value is present for Status, not even an explicit nil
### GetService

`func (o *HealthResponse) GetService() interface{}`

GetService returns the Service field if non-nil, zero value otherwise.

### GetServiceOk

`func (o *HealthResponse) GetServiceOk() (*interface{}, bool)`

GetServiceOk returns a tuple with the Service field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetService

`func (o *HealthResponse) SetService(v interface{})`

SetService sets Service field to given value.

### HasService

`func (o *HealthResponse) HasService() bool`

HasService returns a boolean if a field has been set.

### SetServiceNil

`func (o *HealthResponse) SetServiceNil(b bool)`

 SetServiceNil sets the value for Service to be an explicit nil

### UnsetService
`func (o *HealthResponse) UnsetService()`

UnsetService ensures that no value is present for Service, not even an explicit nil
### GetTimestamp

`func (o *HealthResponse) GetTimestamp() time.Time`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *HealthResponse) GetTimestampOk() (*time.Time, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *HealthResponse) SetTimestamp(v time.Time)`

SetTimestamp sets Timestamp field to given value.

### HasTimestamp

`func (o *HealthResponse) HasTimestamp() bool`

HasTimestamp returns a boolean if a field has been set.

### GetReranker

`func (o *HealthResponse) GetReranker() HealthResponseReranker`

GetReranker returns the Reranker field if non-nil, zero value otherwise.

### GetRerankerOk

`func (o *HealthResponse) GetRerankerOk() (*HealthResponseReranker, bool)`

GetRerankerOk returns a tuple with the Reranker field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReranker

`func (o *HealthResponse) SetReranker(v HealthResponseReranker)`

SetReranker sets Reranker field to given value.

### HasReranker

`func (o *HealthResponse) HasReranker() bool`

HasReranker returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
