# EvalRun200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**EvalRunId** | Pointer to **string** |  | [optional]
**Metrics** | Pointer to [**EvalMetrics**](EvalMetrics.md) |  | [optional]

## Methods

### NewEvalRun200Response

`func NewEvalRun200Response() *EvalRun200Response`

NewEvalRun200Response instantiates a new EvalRun200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEvalRun200ResponseWithDefaults

`func NewEvalRun200ResponseWithDefaults() *EvalRun200Response`

NewEvalRun200ResponseWithDefaults instantiates a new EvalRun200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEvalRunId

`func (o *EvalRun200Response) GetEvalRunId() string`

GetEvalRunId returns the EvalRunId field if non-nil, zero value otherwise.

### GetEvalRunIdOk

`func (o *EvalRun200Response) GetEvalRunIdOk() (*string, bool)`

GetEvalRunIdOk returns a tuple with the EvalRunId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvalRunId

`func (o *EvalRun200Response) SetEvalRunId(v string)`

SetEvalRunId sets EvalRunId field to given value.

### HasEvalRunId

`func (o *EvalRun200Response) HasEvalRunId() bool`

HasEvalRunId returns a boolean if a field has been set.

### GetMetrics

`func (o *EvalRun200Response) GetMetrics() EvalMetrics`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *EvalRun200Response) GetMetricsOk() (*EvalMetrics, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *EvalRun200Response) SetMetrics(v EvalMetrics)`

SetMetrics sets Metrics field to given value.

### HasMetrics

`func (o *EvalRun200Response) HasMetrics() bool`

HasMetrics returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
