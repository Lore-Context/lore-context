# V10RecallTrace

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**Query** | Pointer to **string** |  | [optional]
**RouteReason** | Pointer to **NullableString** |  | [optional]
**LatencyMs** | Pointer to **NullableFloat32** |  | [optional]
**TokenBudget** | Pointer to **NullableFloat32** |  | [optional]
**TokensUsed** | Pointer to **NullableFloat32** |  | [optional]
**Feedback** | Pointer to **NullableString** |  | [optional]
**FeedbackAt** | Pointer to **NullableTime** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]
**CreatedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewV10RecallTrace

`func NewV10RecallTrace() *V10RecallTrace`

NewV10RecallTrace instantiates a new V10RecallTrace object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV10RecallTraceWithDefaults

`func NewV10RecallTraceWithDefaults() *V10RecallTrace`

NewV10RecallTraceWithDefaults instantiates a new V10RecallTrace object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *V10RecallTrace) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *V10RecallTrace) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *V10RecallTrace) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *V10RecallTrace) HasId() bool`

HasId returns a boolean if a field has been set.

### GetVaultId

`func (o *V10RecallTrace) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *V10RecallTrace) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *V10RecallTrace) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *V10RecallTrace) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetQuery

`func (o *V10RecallTrace) GetQuery() string`

GetQuery returns the Query field if non-nil, zero value otherwise.

### GetQueryOk

`func (o *V10RecallTrace) GetQueryOk() (*string, bool)`

GetQueryOk returns a tuple with the Query field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQuery

`func (o *V10RecallTrace) SetQuery(v string)`

SetQuery sets Query field to given value.

### HasQuery

`func (o *V10RecallTrace) HasQuery() bool`

HasQuery returns a boolean if a field has been set.

### GetRouteReason

`func (o *V10RecallTrace) GetRouteReason() string`

GetRouteReason returns the RouteReason field if non-nil, zero value otherwise.

### GetRouteReasonOk

`func (o *V10RecallTrace) GetRouteReasonOk() (*string, bool)`

GetRouteReasonOk returns a tuple with the RouteReason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRouteReason

`func (o *V10RecallTrace) SetRouteReason(v string)`

SetRouteReason sets RouteReason field to given value.

### HasRouteReason

`func (o *V10RecallTrace) HasRouteReason() bool`

HasRouteReason returns a boolean if a field has been set.

### SetRouteReasonNil

`func (o *V10RecallTrace) SetRouteReasonNil(b bool)`

 SetRouteReasonNil sets the value for RouteReason to be an explicit nil

### UnsetRouteReason
`func (o *V10RecallTrace) UnsetRouteReason()`

UnsetRouteReason ensures that no value is present for RouteReason, not even an explicit nil
### GetLatencyMs

`func (o *V10RecallTrace) GetLatencyMs() float32`

GetLatencyMs returns the LatencyMs field if non-nil, zero value otherwise.

### GetLatencyMsOk

`func (o *V10RecallTrace) GetLatencyMsOk() (*float32, bool)`

GetLatencyMsOk returns a tuple with the LatencyMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLatencyMs

`func (o *V10RecallTrace) SetLatencyMs(v float32)`

SetLatencyMs sets LatencyMs field to given value.

### HasLatencyMs

`func (o *V10RecallTrace) HasLatencyMs() bool`

HasLatencyMs returns a boolean if a field has been set.

### SetLatencyMsNil

`func (o *V10RecallTrace) SetLatencyMsNil(b bool)`

 SetLatencyMsNil sets the value for LatencyMs to be an explicit nil

### UnsetLatencyMs
`func (o *V10RecallTrace) UnsetLatencyMs()`

UnsetLatencyMs ensures that no value is present for LatencyMs, not even an explicit nil
### GetTokenBudget

`func (o *V10RecallTrace) GetTokenBudget() float32`

GetTokenBudget returns the TokenBudget field if non-nil, zero value otherwise.

### GetTokenBudgetOk

`func (o *V10RecallTrace) GetTokenBudgetOk() (*float32, bool)`

GetTokenBudgetOk returns a tuple with the TokenBudget field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokenBudget

`func (o *V10RecallTrace) SetTokenBudget(v float32)`

SetTokenBudget sets TokenBudget field to given value.

### HasTokenBudget

`func (o *V10RecallTrace) HasTokenBudget() bool`

HasTokenBudget returns a boolean if a field has been set.

### SetTokenBudgetNil

`func (o *V10RecallTrace) SetTokenBudgetNil(b bool)`

 SetTokenBudgetNil sets the value for TokenBudget to be an explicit nil

### UnsetTokenBudget
`func (o *V10RecallTrace) UnsetTokenBudget()`

UnsetTokenBudget ensures that no value is present for TokenBudget, not even an explicit nil
### GetTokensUsed

`func (o *V10RecallTrace) GetTokensUsed() float32`

GetTokensUsed returns the TokensUsed field if non-nil, zero value otherwise.

### GetTokensUsedOk

`func (o *V10RecallTrace) GetTokensUsedOk() (*float32, bool)`

GetTokensUsedOk returns a tuple with the TokensUsed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokensUsed

`func (o *V10RecallTrace) SetTokensUsed(v float32)`

SetTokensUsed sets TokensUsed field to given value.

### HasTokensUsed

`func (o *V10RecallTrace) HasTokensUsed() bool`

HasTokensUsed returns a boolean if a field has been set.

### SetTokensUsedNil

`func (o *V10RecallTrace) SetTokensUsedNil(b bool)`

 SetTokensUsedNil sets the value for TokensUsed to be an explicit nil

### UnsetTokensUsed
`func (o *V10RecallTrace) UnsetTokensUsed()`

UnsetTokensUsed ensures that no value is present for TokensUsed, not even an explicit nil
### GetFeedback

`func (o *V10RecallTrace) GetFeedback() string`

GetFeedback returns the Feedback field if non-nil, zero value otherwise.

### GetFeedbackOk

`func (o *V10RecallTrace) GetFeedbackOk() (*string, bool)`

GetFeedbackOk returns a tuple with the Feedback field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFeedback

`func (o *V10RecallTrace) SetFeedback(v string)`

SetFeedback sets Feedback field to given value.

### HasFeedback

`func (o *V10RecallTrace) HasFeedback() bool`

HasFeedback returns a boolean if a field has been set.

### SetFeedbackNil

`func (o *V10RecallTrace) SetFeedbackNil(b bool)`

 SetFeedbackNil sets the value for Feedback to be an explicit nil

### UnsetFeedback
`func (o *V10RecallTrace) UnsetFeedback()`

UnsetFeedback ensures that no value is present for Feedback, not even an explicit nil
### GetFeedbackAt

`func (o *V10RecallTrace) GetFeedbackAt() time.Time`

GetFeedbackAt returns the FeedbackAt field if non-nil, zero value otherwise.

### GetFeedbackAtOk

`func (o *V10RecallTrace) GetFeedbackAtOk() (*time.Time, bool)`

GetFeedbackAtOk returns a tuple with the FeedbackAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFeedbackAt

`func (o *V10RecallTrace) SetFeedbackAt(v time.Time)`

SetFeedbackAt sets FeedbackAt field to given value.

### HasFeedbackAt

`func (o *V10RecallTrace) HasFeedbackAt() bool`

HasFeedbackAt returns a boolean if a field has been set.

### SetFeedbackAtNil

`func (o *V10RecallTrace) SetFeedbackAtNil(b bool)`

 SetFeedbackAtNil sets the value for FeedbackAt to be an explicit nil

### UnsetFeedbackAt
`func (o *V10RecallTrace) UnsetFeedbackAt()`

UnsetFeedbackAt ensures that no value is present for FeedbackAt, not even an explicit nil
### GetMetadata

`func (o *V10RecallTrace) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *V10RecallTrace) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *V10RecallTrace) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *V10RecallTrace) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### GetCreatedAt

`func (o *V10RecallTrace) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *V10RecallTrace) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *V10RecallTrace) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.

### HasCreatedAt

`func (o *V10RecallTrace) HasCreatedAt() bool`

HasCreatedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
