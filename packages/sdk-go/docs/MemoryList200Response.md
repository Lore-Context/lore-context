# MemoryList200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Memories** | Pointer to [**[]MemoryRecord**](MemoryRecord.md) |  | [optional]

## Methods

### NewMemoryList200Response

`func NewMemoryList200Response() *MemoryList200Response`

NewMemoryList200Response instantiates a new MemoryList200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryList200ResponseWithDefaults

`func NewMemoryList200ResponseWithDefaults() *MemoryList200Response`

NewMemoryList200ResponseWithDefaults instantiates a new MemoryList200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMemories

`func (o *MemoryList200Response) GetMemories() []MemoryRecord`

GetMemories returns the Memories field if non-nil, zero value otherwise.

### GetMemoriesOk

`func (o *MemoryList200Response) GetMemoriesOk() (*[]MemoryRecord, bool)`

GetMemoriesOk returns a tuple with the Memories field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemories

`func (o *MemoryList200Response) SetMemories(v []MemoryRecord)`

SetMemories sets Memories field to given value.

### HasMemories

`func (o *MemoryList200Response) HasMemories() bool`

HasMemories returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
