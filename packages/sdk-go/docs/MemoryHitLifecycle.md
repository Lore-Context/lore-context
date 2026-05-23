# MemoryHitLifecycle

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Status** | Pointer to **string** |  | [optional]
**ValidFrom** | Pointer to **time.Time** |  | [optional]
**ValidUntil** | Pointer to **time.Time** |  | [optional]
**SupersededBy** | Pointer to **string** |  | [optional]

## Methods

### NewMemoryHitLifecycle

`func NewMemoryHitLifecycle() *MemoryHitLifecycle`

NewMemoryHitLifecycle instantiates a new MemoryHitLifecycle object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryHitLifecycleWithDefaults

`func NewMemoryHitLifecycleWithDefaults() *MemoryHitLifecycle`

NewMemoryHitLifecycleWithDefaults instantiates a new MemoryHitLifecycle object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetStatus

`func (o *MemoryHitLifecycle) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *MemoryHitLifecycle) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *MemoryHitLifecycle) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *MemoryHitLifecycle) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetValidFrom

`func (o *MemoryHitLifecycle) GetValidFrom() time.Time`

GetValidFrom returns the ValidFrom field if non-nil, zero value otherwise.

### GetValidFromOk

`func (o *MemoryHitLifecycle) GetValidFromOk() (*time.Time, bool)`

GetValidFromOk returns a tuple with the ValidFrom field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetValidFrom

`func (o *MemoryHitLifecycle) SetValidFrom(v time.Time)`

SetValidFrom sets ValidFrom field to given value.

### HasValidFrom

`func (o *MemoryHitLifecycle) HasValidFrom() bool`

HasValidFrom returns a boolean if a field has been set.

### GetValidUntil

`func (o *MemoryHitLifecycle) GetValidUntil() time.Time`

GetValidUntil returns the ValidUntil field if non-nil, zero value otherwise.

### GetValidUntilOk

`func (o *MemoryHitLifecycle) GetValidUntilOk() (*time.Time, bool)`

GetValidUntilOk returns a tuple with the ValidUntil field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetValidUntil

`func (o *MemoryHitLifecycle) SetValidUntil(v time.Time)`

SetValidUntil sets ValidUntil field to given value.

### HasValidUntil

`func (o *MemoryHitLifecycle) HasValidUntil() bool`

HasValidUntil returns a boolean if a field has been set.

### GetSupersededBy

`func (o *MemoryHitLifecycle) GetSupersededBy() string`

GetSupersededBy returns the SupersededBy field if non-nil, zero value otherwise.

### GetSupersededByOk

`func (o *MemoryHitLifecycle) GetSupersededByOk() (*string, bool)`

GetSupersededByOk returns a tuple with the SupersededBy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSupersededBy

`func (o *MemoryHitLifecycle) SetSupersededBy(v string)`

SetSupersededBy sets SupersededBy field to given value.

### HasSupersededBy

`func (o *MemoryHitLifecycle) HasSupersededBy() bool`

HasSupersededBy returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
