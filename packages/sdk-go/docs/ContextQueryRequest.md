# ContextQueryRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Query** | **string** |  |
**ProjectId** | Pointer to **string** |  | [optional]
**TokenBudget** | Pointer to **int32** |  | [optional]
**IncludeSources** | Pointer to **bool** |  | [optional]
**Mode** | Pointer to **string** |  | [optional]

## Methods

### NewContextQueryRequest

`func NewContextQueryRequest(query string, ) *ContextQueryRequest`

NewContextQueryRequest instantiates a new ContextQueryRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewContextQueryRequestWithDefaults

`func NewContextQueryRequestWithDefaults() *ContextQueryRequest`

NewContextQueryRequestWithDefaults instantiates a new ContextQueryRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetQuery

`func (o *ContextQueryRequest) GetQuery() string`

GetQuery returns the Query field if non-nil, zero value otherwise.

### GetQueryOk

`func (o *ContextQueryRequest) GetQueryOk() (*string, bool)`

GetQueryOk returns a tuple with the Query field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQuery

`func (o *ContextQueryRequest) SetQuery(v string)`

SetQuery sets Query field to given value.


### GetProjectId

`func (o *ContextQueryRequest) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *ContextQueryRequest) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *ContextQueryRequest) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.

### HasProjectId

`func (o *ContextQueryRequest) HasProjectId() bool`

HasProjectId returns a boolean if a field has been set.

### GetTokenBudget

`func (o *ContextQueryRequest) GetTokenBudget() int32`

GetTokenBudget returns the TokenBudget field if non-nil, zero value otherwise.

### GetTokenBudgetOk

`func (o *ContextQueryRequest) GetTokenBudgetOk() (*int32, bool)`

GetTokenBudgetOk returns a tuple with the TokenBudget field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokenBudget

`func (o *ContextQueryRequest) SetTokenBudget(v int32)`

SetTokenBudget sets TokenBudget field to given value.

### HasTokenBudget

`func (o *ContextQueryRequest) HasTokenBudget() bool`

HasTokenBudget returns a boolean if a field has been set.

### GetIncludeSources

`func (o *ContextQueryRequest) GetIncludeSources() bool`

GetIncludeSources returns the IncludeSources field if non-nil, zero value otherwise.

### GetIncludeSourcesOk

`func (o *ContextQueryRequest) GetIncludeSourcesOk() (*bool, bool)`

GetIncludeSourcesOk returns a tuple with the IncludeSources field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIncludeSources

`func (o *ContextQueryRequest) SetIncludeSources(v bool)`

SetIncludeSources sets IncludeSources field to given value.

### HasIncludeSources

`func (o *ContextQueryRequest) HasIncludeSources() bool`

HasIncludeSources returns a boolean if a field has been set.

### GetMode

`func (o *ContextQueryRequest) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *ContextQueryRequest) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *ContextQueryRequest) SetMode(v string)`

SetMode sets Mode field to given value.

### HasMode

`func (o *ContextQueryRequest) HasMode() bool`

HasMode returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
