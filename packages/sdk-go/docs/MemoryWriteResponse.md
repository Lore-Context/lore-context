# MemoryWriteResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Memory** | Pointer to [**MemoryRecord**](MemoryRecord.md) |  | [optional]
**ReviewRequired** | Pointer to **bool** |  | [optional]

## Methods

### NewMemoryWriteResponse

`func NewMemoryWriteResponse() *MemoryWriteResponse`

NewMemoryWriteResponse instantiates a new MemoryWriteResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryWriteResponseWithDefaults

`func NewMemoryWriteResponseWithDefaults() *MemoryWriteResponse`

NewMemoryWriteResponseWithDefaults instantiates a new MemoryWriteResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMemory

`func (o *MemoryWriteResponse) GetMemory() MemoryRecord`

GetMemory returns the Memory field if non-nil, zero value otherwise.

### GetMemoryOk

`func (o *MemoryWriteResponse) GetMemoryOk() (*MemoryRecord, bool)`

GetMemoryOk returns a tuple with the Memory field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemory

`func (o *MemoryWriteResponse) SetMemory(v MemoryRecord)`

SetMemory sets Memory field to given value.

### HasMemory

`func (o *MemoryWriteResponse) HasMemory() bool`

HasMemory returns a boolean if a field has been set.

### GetReviewRequired

`func (o *MemoryWriteResponse) GetReviewRequired() bool`

GetReviewRequired returns the ReviewRequired field if non-nil, zero value otherwise.

### GetReviewRequiredOk

`func (o *MemoryWriteResponse) GetReviewRequiredOk() (*bool, bool)`

GetReviewRequiredOk returns a tuple with the ReviewRequired field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReviewRequired

`func (o *MemoryWriteResponse) SetReviewRequired(v bool)`

SetReviewRequired sets ReviewRequired field to given value.

### HasReviewRequired

`func (o *MemoryWriteResponse) HasReviewRequired() bool`

HasReviewRequired returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
