# TraceList200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Traces** | Pointer to [**[]ContextTrace**](ContextTrace.md) |  | [optional]

## Methods

### NewTraceList200Response

`func NewTraceList200Response() *TraceList200Response`

NewTraceList200Response instantiates a new TraceList200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTraceList200ResponseWithDefaults

`func NewTraceList200ResponseWithDefaults() *TraceList200Response`

NewTraceList200ResponseWithDefaults instantiates a new TraceList200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTraces

`func (o *TraceList200Response) GetTraces() []ContextTrace`

GetTraces returns the Traces field if non-nil, zero value otherwise.

### GetTracesOk

`func (o *TraceList200Response) GetTracesOk() (*[]ContextTrace, bool)`

GetTracesOk returns a tuple with the Traces field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraces

`func (o *TraceList200Response) SetTraces(v []ContextTrace)`

SetTraces sets Traces field to given value.

### HasTraces

`func (o *TraceList200Response) HasTraces() bool`

HasTraces returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
