# MemoryForgetRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**MemoryIds** | Pointer to **[]string** |  | [optional]
**Query** | Pointer to **string** |  | [optional]
**ProjectId** | Pointer to **string** |  | [optional]
**Reason** | **string** |  |
**HardDelete** | Pointer to **bool** |  | [optional] [default to false]
**Action** | Pointer to **string** | v12 lifecycle action; defaults to delete | [optional]

## Methods

### NewMemoryForgetRequest

`func NewMemoryForgetRequest(reason string, ) *MemoryForgetRequest`

NewMemoryForgetRequest instantiates a new MemoryForgetRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryForgetRequestWithDefaults

`func NewMemoryForgetRequestWithDefaults() *MemoryForgetRequest`

NewMemoryForgetRequestWithDefaults instantiates a new MemoryForgetRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMemoryIds

`func (o *MemoryForgetRequest) GetMemoryIds() []string`

GetMemoryIds returns the MemoryIds field if non-nil, zero value otherwise.

### GetMemoryIdsOk

`func (o *MemoryForgetRequest) GetMemoryIdsOk() (*[]string, bool)`

GetMemoryIdsOk returns a tuple with the MemoryIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemoryIds

`func (o *MemoryForgetRequest) SetMemoryIds(v []string)`

SetMemoryIds sets MemoryIds field to given value.

### HasMemoryIds

`func (o *MemoryForgetRequest) HasMemoryIds() bool`

HasMemoryIds returns a boolean if a field has been set.

### GetQuery

`func (o *MemoryForgetRequest) GetQuery() string`

GetQuery returns the Query field if non-nil, zero value otherwise.

### GetQueryOk

`func (o *MemoryForgetRequest) GetQueryOk() (*string, bool)`

GetQueryOk returns a tuple with the Query field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQuery

`func (o *MemoryForgetRequest) SetQuery(v string)`

SetQuery sets Query field to given value.

### HasQuery

`func (o *MemoryForgetRequest) HasQuery() bool`

HasQuery returns a boolean if a field has been set.

### GetProjectId

`func (o *MemoryForgetRequest) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *MemoryForgetRequest) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *MemoryForgetRequest) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.

### HasProjectId

`func (o *MemoryForgetRequest) HasProjectId() bool`

HasProjectId returns a boolean if a field has been set.

### GetReason

`func (o *MemoryForgetRequest) GetReason() string`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *MemoryForgetRequest) GetReasonOk() (*string, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *MemoryForgetRequest) SetReason(v string)`

SetReason sets Reason field to given value.


### GetHardDelete

`func (o *MemoryForgetRequest) GetHardDelete() bool`

GetHardDelete returns the HardDelete field if non-nil, zero value otherwise.

### GetHardDeleteOk

`func (o *MemoryForgetRequest) GetHardDeleteOk() (*bool, bool)`

GetHardDeleteOk returns a tuple with the HardDelete field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHardDelete

`func (o *MemoryForgetRequest) SetHardDelete(v bool)`

SetHardDelete sets HardDelete field to given value.

### HasHardDelete

`func (o *MemoryForgetRequest) HasHardDelete() bool`

HasHardDelete returns a boolean if a field has been set.

### GetAction

`func (o *MemoryForgetRequest) GetAction() string`

GetAction returns the Action field if non-nil, zero value otherwise.

### GetActionOk

`func (o *MemoryForgetRequest) GetActionOk() (*string, bool)`

GetActionOk returns a tuple with the Action field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAction

`func (o *MemoryForgetRequest) SetAction(v string)`

SetAction sets Action field to given value.

### HasAction

`func (o *MemoryForgetRequest) HasAction() bool`

HasAction returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
