# MemoryForget200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Deleted** | Pointer to **int32** |  | [optional]
**MemoryIds** | Pointer to **[]string** |  | [optional]
**HardDelete** | Pointer to **bool** |  | [optional]
**EngineVersion** | Pointer to **string** | v12 when routed through the v1.2 engine | [optional]
**LifecycleAction** | Pointer to **string** | Resolved lifecycle action (delete or redact) | [optional]
**Lifecycle** | Pointer to **[]map[string]interface{}** | Per-item lifecycle propagation results | [optional]

## Methods

### NewMemoryForget200Response

`func NewMemoryForget200Response() *MemoryForget200Response`

NewMemoryForget200Response instantiates a new MemoryForget200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryForget200ResponseWithDefaults

`func NewMemoryForget200ResponseWithDefaults() *MemoryForget200Response`

NewMemoryForget200ResponseWithDefaults instantiates a new MemoryForget200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetDeleted

`func (o *MemoryForget200Response) GetDeleted() int32`

GetDeleted returns the Deleted field if non-nil, zero value otherwise.

### GetDeletedOk

`func (o *MemoryForget200Response) GetDeletedOk() (*int32, bool)`

GetDeletedOk returns a tuple with the Deleted field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeleted

`func (o *MemoryForget200Response) SetDeleted(v int32)`

SetDeleted sets Deleted field to given value.

### HasDeleted

`func (o *MemoryForget200Response) HasDeleted() bool`

HasDeleted returns a boolean if a field has been set.

### GetMemoryIds

`func (o *MemoryForget200Response) GetMemoryIds() []string`

GetMemoryIds returns the MemoryIds field if non-nil, zero value otherwise.

### GetMemoryIdsOk

`func (o *MemoryForget200Response) GetMemoryIdsOk() (*[]string, bool)`

GetMemoryIdsOk returns a tuple with the MemoryIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemoryIds

`func (o *MemoryForget200Response) SetMemoryIds(v []string)`

SetMemoryIds sets MemoryIds field to given value.

### HasMemoryIds

`func (o *MemoryForget200Response) HasMemoryIds() bool`

HasMemoryIds returns a boolean if a field has been set.

### GetHardDelete

`func (o *MemoryForget200Response) GetHardDelete() bool`

GetHardDelete returns the HardDelete field if non-nil, zero value otherwise.

### GetHardDeleteOk

`func (o *MemoryForget200Response) GetHardDeleteOk() (*bool, bool)`

GetHardDeleteOk returns a tuple with the HardDelete field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHardDelete

`func (o *MemoryForget200Response) SetHardDelete(v bool)`

SetHardDelete sets HardDelete field to given value.

### HasHardDelete

`func (o *MemoryForget200Response) HasHardDelete() bool`

HasHardDelete returns a boolean if a field has been set.

### GetEngineVersion

`func (o *MemoryForget200Response) GetEngineVersion() string`

GetEngineVersion returns the EngineVersion field if non-nil, zero value otherwise.

### GetEngineVersionOk

`func (o *MemoryForget200Response) GetEngineVersionOk() (*string, bool)`

GetEngineVersionOk returns a tuple with the EngineVersion field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEngineVersion

`func (o *MemoryForget200Response) SetEngineVersion(v string)`

SetEngineVersion sets EngineVersion field to given value.

### HasEngineVersion

`func (o *MemoryForget200Response) HasEngineVersion() bool`

HasEngineVersion returns a boolean if a field has been set.

### GetLifecycleAction

`func (o *MemoryForget200Response) GetLifecycleAction() string`

GetLifecycleAction returns the LifecycleAction field if non-nil, zero value otherwise.

### GetLifecycleActionOk

`func (o *MemoryForget200Response) GetLifecycleActionOk() (*string, bool)`

GetLifecycleActionOk returns a tuple with the LifecycleAction field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLifecycleAction

`func (o *MemoryForget200Response) SetLifecycleAction(v string)`

SetLifecycleAction sets LifecycleAction field to given value.

### HasLifecycleAction

`func (o *MemoryForget200Response) HasLifecycleAction() bool`

HasLifecycleAction returns a boolean if a field has been set.

### GetLifecycle

`func (o *MemoryForget200Response) GetLifecycle() []map[string]interface{}`

GetLifecycle returns the Lifecycle field if non-nil, zero value otherwise.

### GetLifecycleOk

`func (o *MemoryForget200Response) GetLifecycleOk() (*[]map[string]interface{}, bool)`

GetLifecycleOk returns a tuple with the Lifecycle field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLifecycle

`func (o *MemoryForget200Response) SetLifecycle(v []map[string]interface{})`

SetLifecycle sets Lifecycle field to given value.

### HasLifecycle

`func (o *MemoryForget200Response) HasLifecycle() bool`

HasLifecycle returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
