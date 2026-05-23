# ContextTrace

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**ProjectId** | Pointer to **string** |  | [optional]
**Query** | Pointer to **string** |  | [optional]
**Route** | Pointer to [**ContextRoute**](ContextRoute.md) |  | [optional]
**RetrievedMemoryIds** | Pointer to **[]string** |  | [optional]
**ComposedMemoryIds** | Pointer to **[]string** |  | [optional]
**IgnoredMemoryIds** | Pointer to **[]string** |  | [optional]
**Warnings** | Pointer to **[]string** |  | [optional]
**LatencyMs** | Pointer to **float32** |  | [optional]
**TokenBudget** | Pointer to **float32** |  | [optional]
**TokensUsed** | Pointer to **float32** |  | [optional]
**Feedback** | Pointer to **string** |  | [optional]
**CreatedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewContextTrace

`func NewContextTrace() *ContextTrace`

NewContextTrace instantiates a new ContextTrace object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewContextTraceWithDefaults

`func NewContextTraceWithDefaults() *ContextTrace`

NewContextTraceWithDefaults instantiates a new ContextTrace object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *ContextTrace) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ContextTrace) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ContextTrace) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *ContextTrace) HasId() bool`

HasId returns a boolean if a field has been set.

### GetProjectId

`func (o *ContextTrace) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *ContextTrace) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *ContextTrace) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.

### HasProjectId

`func (o *ContextTrace) HasProjectId() bool`

HasProjectId returns a boolean if a field has been set.

### GetQuery

`func (o *ContextTrace) GetQuery() string`

GetQuery returns the Query field if non-nil, zero value otherwise.

### GetQueryOk

`func (o *ContextTrace) GetQueryOk() (*string, bool)`

GetQueryOk returns a tuple with the Query field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQuery

`func (o *ContextTrace) SetQuery(v string)`

SetQuery sets Query field to given value.

### HasQuery

`func (o *ContextTrace) HasQuery() bool`

HasQuery returns a boolean if a field has been set.

### GetRoute

`func (o *ContextTrace) GetRoute() ContextRoute`

GetRoute returns the Route field if non-nil, zero value otherwise.

### GetRouteOk

`func (o *ContextTrace) GetRouteOk() (*ContextRoute, bool)`

GetRouteOk returns a tuple with the Route field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRoute

`func (o *ContextTrace) SetRoute(v ContextRoute)`

SetRoute sets Route field to given value.

### HasRoute

`func (o *ContextTrace) HasRoute() bool`

HasRoute returns a boolean if a field has been set.

### GetRetrievedMemoryIds

`func (o *ContextTrace) GetRetrievedMemoryIds() []string`

GetRetrievedMemoryIds returns the RetrievedMemoryIds field if non-nil, zero value otherwise.

### GetRetrievedMemoryIdsOk

`func (o *ContextTrace) GetRetrievedMemoryIdsOk() (*[]string, bool)`

GetRetrievedMemoryIdsOk returns a tuple with the RetrievedMemoryIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRetrievedMemoryIds

`func (o *ContextTrace) SetRetrievedMemoryIds(v []string)`

SetRetrievedMemoryIds sets RetrievedMemoryIds field to given value.

### HasRetrievedMemoryIds

`func (o *ContextTrace) HasRetrievedMemoryIds() bool`

HasRetrievedMemoryIds returns a boolean if a field has been set.

### GetComposedMemoryIds

`func (o *ContextTrace) GetComposedMemoryIds() []string`

GetComposedMemoryIds returns the ComposedMemoryIds field if non-nil, zero value otherwise.

### GetComposedMemoryIdsOk

`func (o *ContextTrace) GetComposedMemoryIdsOk() (*[]string, bool)`

GetComposedMemoryIdsOk returns a tuple with the ComposedMemoryIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetComposedMemoryIds

`func (o *ContextTrace) SetComposedMemoryIds(v []string)`

SetComposedMemoryIds sets ComposedMemoryIds field to given value.

### HasComposedMemoryIds

`func (o *ContextTrace) HasComposedMemoryIds() bool`

HasComposedMemoryIds returns a boolean if a field has been set.

### GetIgnoredMemoryIds

`func (o *ContextTrace) GetIgnoredMemoryIds() []string`

GetIgnoredMemoryIds returns the IgnoredMemoryIds field if non-nil, zero value otherwise.

### GetIgnoredMemoryIdsOk

`func (o *ContextTrace) GetIgnoredMemoryIdsOk() (*[]string, bool)`

GetIgnoredMemoryIdsOk returns a tuple with the IgnoredMemoryIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIgnoredMemoryIds

`func (o *ContextTrace) SetIgnoredMemoryIds(v []string)`

SetIgnoredMemoryIds sets IgnoredMemoryIds field to given value.

### HasIgnoredMemoryIds

`func (o *ContextTrace) HasIgnoredMemoryIds() bool`

HasIgnoredMemoryIds returns a boolean if a field has been set.

### GetWarnings

`func (o *ContextTrace) GetWarnings() []string`

GetWarnings returns the Warnings field if non-nil, zero value otherwise.

### GetWarningsOk

`func (o *ContextTrace) GetWarningsOk() (*[]string, bool)`

GetWarningsOk returns a tuple with the Warnings field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWarnings

`func (o *ContextTrace) SetWarnings(v []string)`

SetWarnings sets Warnings field to given value.

### HasWarnings

`func (o *ContextTrace) HasWarnings() bool`

HasWarnings returns a boolean if a field has been set.

### GetLatencyMs

`func (o *ContextTrace) GetLatencyMs() float32`

GetLatencyMs returns the LatencyMs field if non-nil, zero value otherwise.

### GetLatencyMsOk

`func (o *ContextTrace) GetLatencyMsOk() (*float32, bool)`

GetLatencyMsOk returns a tuple with the LatencyMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLatencyMs

`func (o *ContextTrace) SetLatencyMs(v float32)`

SetLatencyMs sets LatencyMs field to given value.

### HasLatencyMs

`func (o *ContextTrace) HasLatencyMs() bool`

HasLatencyMs returns a boolean if a field has been set.

### GetTokenBudget

`func (o *ContextTrace) GetTokenBudget() float32`

GetTokenBudget returns the TokenBudget field if non-nil, zero value otherwise.

### GetTokenBudgetOk

`func (o *ContextTrace) GetTokenBudgetOk() (*float32, bool)`

GetTokenBudgetOk returns a tuple with the TokenBudget field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokenBudget

`func (o *ContextTrace) SetTokenBudget(v float32)`

SetTokenBudget sets TokenBudget field to given value.

### HasTokenBudget

`func (o *ContextTrace) HasTokenBudget() bool`

HasTokenBudget returns a boolean if a field has been set.

### GetTokensUsed

`func (o *ContextTrace) GetTokensUsed() float32`

GetTokensUsed returns the TokensUsed field if non-nil, zero value otherwise.

### GetTokensUsedOk

`func (o *ContextTrace) GetTokensUsedOk() (*float32, bool)`

GetTokensUsedOk returns a tuple with the TokensUsed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokensUsed

`func (o *ContextTrace) SetTokensUsed(v float32)`

SetTokensUsed sets TokensUsed field to given value.

### HasTokensUsed

`func (o *ContextTrace) HasTokensUsed() bool`

HasTokensUsed returns a boolean if a field has been set.

### GetFeedback

`func (o *ContextTrace) GetFeedback() string`

GetFeedback returns the Feedback field if non-nil, zero value otherwise.

### GetFeedbackOk

`func (o *ContextTrace) GetFeedbackOk() (*string, bool)`

GetFeedbackOk returns a tuple with the Feedback field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFeedback

`func (o *ContextTrace) SetFeedback(v string)`

SetFeedback sets Feedback field to given value.

### HasFeedback

`func (o *ContextTrace) HasFeedback() bool`

HasFeedback returns a boolean if a field has been set.

### GetCreatedAt

`func (o *ContextTrace) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *ContextTrace) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *ContextTrace) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.

### HasCreatedAt

`func (o *ContextTrace) HasCreatedAt() bool`

HasCreatedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
