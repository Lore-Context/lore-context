# MemoryGet200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Memory** | Pointer to [**MemoryRecord**](MemoryRecord.md) |  | [optional]

## Methods

### NewMemoryGet200Response

`func NewMemoryGet200Response() *MemoryGet200Response`

NewMemoryGet200Response instantiates a new MemoryGet200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryGet200ResponseWithDefaults

`func NewMemoryGet200ResponseWithDefaults() *MemoryGet200Response`

NewMemoryGet200ResponseWithDefaults instantiates a new MemoryGet200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMemory

`func (o *MemoryGet200Response) GetMemory() MemoryRecord`

GetMemory returns the Memory field if non-nil, zero value otherwise.

### GetMemoryOk

`func (o *MemoryGet200Response) GetMemoryOk() (*MemoryRecord, bool)`

GetMemoryOk returns a tuple with the Memory field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemory

`func (o *MemoryGet200Response) SetMemory(v MemoryRecord)`

SetMemory sets Memory field to given value.

### HasMemory

`func (o *MemoryGet200Response) HasMemory() bool`

HasMemory returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
