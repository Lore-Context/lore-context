# EvalRunRecord

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**Provider** | Pointer to **string** |  | [optional]
**ProjectId** | Pointer to **string** |  | [optional]
**Metrics** | Pointer to [**EvalMetrics**](EvalMetrics.md) |  | [optional]
**Status** | Pointer to **interface{}** |  | [optional]
**CreatedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewEvalRunRecord

`func NewEvalRunRecord() *EvalRunRecord`

NewEvalRunRecord instantiates a new EvalRunRecord object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEvalRunRecordWithDefaults

`func NewEvalRunRecordWithDefaults() *EvalRunRecord`

NewEvalRunRecordWithDefaults instantiates a new EvalRunRecord object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *EvalRunRecord) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *EvalRunRecord) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *EvalRunRecord) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *EvalRunRecord) HasId() bool`

HasId returns a boolean if a field has been set.

### GetProvider

`func (o *EvalRunRecord) GetProvider() string`

GetProvider returns the Provider field if non-nil, zero value otherwise.

### GetProviderOk

`func (o *EvalRunRecord) GetProviderOk() (*string, bool)`

GetProviderOk returns a tuple with the Provider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProvider

`func (o *EvalRunRecord) SetProvider(v string)`

SetProvider sets Provider field to given value.

### HasProvider

`func (o *EvalRunRecord) HasProvider() bool`

HasProvider returns a boolean if a field has been set.

### GetProjectId

`func (o *EvalRunRecord) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *EvalRunRecord) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *EvalRunRecord) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.

### HasProjectId

`func (o *EvalRunRecord) HasProjectId() bool`

HasProjectId returns a boolean if a field has been set.

### GetMetrics

`func (o *EvalRunRecord) GetMetrics() EvalMetrics`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *EvalRunRecord) GetMetricsOk() (*EvalMetrics, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *EvalRunRecord) SetMetrics(v EvalMetrics)`

SetMetrics sets Metrics field to given value.

### HasMetrics

`func (o *EvalRunRecord) HasMetrics() bool`

HasMetrics returns a boolean if a field has been set.

### GetStatus

`func (o *EvalRunRecord) GetStatus() interface{}`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *EvalRunRecord) GetStatusOk() (*interface{}, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *EvalRunRecord) SetStatus(v interface{})`

SetStatus sets Status field to given value.

### HasStatus

`func (o *EvalRunRecord) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### SetStatusNil

`func (o *EvalRunRecord) SetStatusNil(b bool)`

 SetStatusNil sets the value for Status to be an explicit nil

### UnsetStatus
`func (o *EvalRunRecord) UnsetStatus()`

UnsetStatus ensures that no value is present for Status, not even an explicit nil
### GetCreatedAt

`func (o *EvalRunRecord) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *EvalRunRecord) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *EvalRunRecord) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.

### HasCreatedAt

`func (o *EvalRunRecord) HasCreatedAt() bool`

HasCreatedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
