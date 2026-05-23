# MemorySupersede200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Previous** | Pointer to [**MemoryRecord**](MemoryRecord.md) |  | [optional]
**Memory** | Pointer to [**MemoryRecord**](MemoryRecord.md) |  | [optional]
**ReviewRequired** | Pointer to **bool** |  | [optional]
**EngineVersion** | Pointer to **string** | v12 when routed through the v1.2 engine | [optional]
**Lifecycle** | Pointer to **map[string]interface{}** | v12 lifecycle propagation counts (relationsInvalidated, embeddingsRemoved, wikiPagesMarked) | [optional]

## Methods

### NewMemorySupersede200Response

`func NewMemorySupersede200Response() *MemorySupersede200Response`

NewMemorySupersede200Response instantiates a new MemorySupersede200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemorySupersede200ResponseWithDefaults

`func NewMemorySupersede200ResponseWithDefaults() *MemorySupersede200Response`

NewMemorySupersede200ResponseWithDefaults instantiates a new MemorySupersede200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetPrevious

`func (o *MemorySupersede200Response) GetPrevious() MemoryRecord`

GetPrevious returns the Previous field if non-nil, zero value otherwise.

### GetPreviousOk

`func (o *MemorySupersede200Response) GetPreviousOk() (*MemoryRecord, bool)`

GetPreviousOk returns a tuple with the Previous field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrevious

`func (o *MemorySupersede200Response) SetPrevious(v MemoryRecord)`

SetPrevious sets Previous field to given value.

### HasPrevious

`func (o *MemorySupersede200Response) HasPrevious() bool`

HasPrevious returns a boolean if a field has been set.

### GetMemory

`func (o *MemorySupersede200Response) GetMemory() MemoryRecord`

GetMemory returns the Memory field if non-nil, zero value otherwise.

### GetMemoryOk

`func (o *MemorySupersede200Response) GetMemoryOk() (*MemoryRecord, bool)`

GetMemoryOk returns a tuple with the Memory field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemory

`func (o *MemorySupersede200Response) SetMemory(v MemoryRecord)`

SetMemory sets Memory field to given value.

### HasMemory

`func (o *MemorySupersede200Response) HasMemory() bool`

HasMemory returns a boolean if a field has been set.

### GetReviewRequired

`func (o *MemorySupersede200Response) GetReviewRequired() bool`

GetReviewRequired returns the ReviewRequired field if non-nil, zero value otherwise.

### GetReviewRequiredOk

`func (o *MemorySupersede200Response) GetReviewRequiredOk() (*bool, bool)`

GetReviewRequiredOk returns a tuple with the ReviewRequired field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReviewRequired

`func (o *MemorySupersede200Response) SetReviewRequired(v bool)`

SetReviewRequired sets ReviewRequired field to given value.

### HasReviewRequired

`func (o *MemorySupersede200Response) HasReviewRequired() bool`

HasReviewRequired returns a boolean if a field has been set.

### GetEngineVersion

`func (o *MemorySupersede200Response) GetEngineVersion() string`

GetEngineVersion returns the EngineVersion field if non-nil, zero value otherwise.

### GetEngineVersionOk

`func (o *MemorySupersede200Response) GetEngineVersionOk() (*string, bool)`

GetEngineVersionOk returns a tuple with the EngineVersion field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEngineVersion

`func (o *MemorySupersede200Response) SetEngineVersion(v string)`

SetEngineVersion sets EngineVersion field to given value.

### HasEngineVersion

`func (o *MemorySupersede200Response) HasEngineVersion() bool`

HasEngineVersion returns a boolean if a field has been set.

### GetLifecycle

`func (o *MemorySupersede200Response) GetLifecycle() map[string]interface{}`

GetLifecycle returns the Lifecycle field if non-nil, zero value otherwise.

### GetLifecycleOk

`func (o *MemorySupersede200Response) GetLifecycleOk() (*map[string]interface{}, bool)`

GetLifecycleOk returns a tuple with the Lifecycle field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLifecycle

`func (o *MemorySupersede200Response) SetLifecycle(v map[string]interface{})`

SetLifecycle sets Lifecycle field to given value.

### HasLifecycle

`func (o *MemorySupersede200Response) HasLifecycle() bool`

HasLifecycle returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
