# V09UsageLimitSnapshot

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**AccountId** | Pointer to **NullableString** |  | [optional]
**Plan** | Pointer to **string** |  | [optional]
**PeriodStart** | Pointer to **time.Time** |  | [optional]
**PeriodEnd** | Pointer to **time.Time** |  | [optional]
**IngestTokenUsed** | Pointer to **float32** |  | [optional]
**IngestTokenLimit** | Pointer to **float32** |  | [optional]
**RecallUsed** | Pointer to **float32** |  | [optional]
**RecallLimit** | Pointer to **float32** |  | [optional]
**AgentCount** | Pointer to **int32** |  | [optional]
**AgentLimit** | Pointer to **int32** |  | [optional]
**RawArchiveEnabled** | Pointer to **bool** |  | [optional]
**ObservedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewV09UsageLimitSnapshot

`func NewV09UsageLimitSnapshot() *V09UsageLimitSnapshot`

NewV09UsageLimitSnapshot instantiates a new V09UsageLimitSnapshot object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09UsageLimitSnapshotWithDefaults

`func NewV09UsageLimitSnapshotWithDefaults() *V09UsageLimitSnapshot`

NewV09UsageLimitSnapshotWithDefaults instantiates a new V09UsageLimitSnapshot object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *V09UsageLimitSnapshot) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *V09UsageLimitSnapshot) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *V09UsageLimitSnapshot) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *V09UsageLimitSnapshot) HasId() bool`

HasId returns a boolean if a field has been set.

### GetVaultId

`func (o *V09UsageLimitSnapshot) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *V09UsageLimitSnapshot) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *V09UsageLimitSnapshot) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *V09UsageLimitSnapshot) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetAccountId

`func (o *V09UsageLimitSnapshot) GetAccountId() string`

GetAccountId returns the AccountId field if non-nil, zero value otherwise.

### GetAccountIdOk

`func (o *V09UsageLimitSnapshot) GetAccountIdOk() (*string, bool)`

GetAccountIdOk returns a tuple with the AccountId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccountId

`func (o *V09UsageLimitSnapshot) SetAccountId(v string)`

SetAccountId sets AccountId field to given value.

### HasAccountId

`func (o *V09UsageLimitSnapshot) HasAccountId() bool`

HasAccountId returns a boolean if a field has been set.

### SetAccountIdNil

`func (o *V09UsageLimitSnapshot) SetAccountIdNil(b bool)`

 SetAccountIdNil sets the value for AccountId to be an explicit nil

### UnsetAccountId
`func (o *V09UsageLimitSnapshot) UnsetAccountId()`

UnsetAccountId ensures that no value is present for AccountId, not even an explicit nil
### GetPlan

`func (o *V09UsageLimitSnapshot) GetPlan() string`

GetPlan returns the Plan field if non-nil, zero value otherwise.

### GetPlanOk

`func (o *V09UsageLimitSnapshot) GetPlanOk() (*string, bool)`

GetPlanOk returns a tuple with the Plan field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlan

`func (o *V09UsageLimitSnapshot) SetPlan(v string)`

SetPlan sets Plan field to given value.

### HasPlan

`func (o *V09UsageLimitSnapshot) HasPlan() bool`

HasPlan returns a boolean if a field has been set.

### GetPeriodStart

`func (o *V09UsageLimitSnapshot) GetPeriodStart() time.Time`

GetPeriodStart returns the PeriodStart field if non-nil, zero value otherwise.

### GetPeriodStartOk

`func (o *V09UsageLimitSnapshot) GetPeriodStartOk() (*time.Time, bool)`

GetPeriodStartOk returns a tuple with the PeriodStart field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodStart

`func (o *V09UsageLimitSnapshot) SetPeriodStart(v time.Time)`

SetPeriodStart sets PeriodStart field to given value.

### HasPeriodStart

`func (o *V09UsageLimitSnapshot) HasPeriodStart() bool`

HasPeriodStart returns a boolean if a field has been set.

### GetPeriodEnd

`func (o *V09UsageLimitSnapshot) GetPeriodEnd() time.Time`

GetPeriodEnd returns the PeriodEnd field if non-nil, zero value otherwise.

### GetPeriodEndOk

`func (o *V09UsageLimitSnapshot) GetPeriodEndOk() (*time.Time, bool)`

GetPeriodEndOk returns a tuple with the PeriodEnd field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodEnd

`func (o *V09UsageLimitSnapshot) SetPeriodEnd(v time.Time)`

SetPeriodEnd sets PeriodEnd field to given value.

### HasPeriodEnd

`func (o *V09UsageLimitSnapshot) HasPeriodEnd() bool`

HasPeriodEnd returns a boolean if a field has been set.

### GetIngestTokenUsed

`func (o *V09UsageLimitSnapshot) GetIngestTokenUsed() float32`

GetIngestTokenUsed returns the IngestTokenUsed field if non-nil, zero value otherwise.

### GetIngestTokenUsedOk

`func (o *V09UsageLimitSnapshot) GetIngestTokenUsedOk() (*float32, bool)`

GetIngestTokenUsedOk returns a tuple with the IngestTokenUsed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIngestTokenUsed

`func (o *V09UsageLimitSnapshot) SetIngestTokenUsed(v float32)`

SetIngestTokenUsed sets IngestTokenUsed field to given value.

### HasIngestTokenUsed

`func (o *V09UsageLimitSnapshot) HasIngestTokenUsed() bool`

HasIngestTokenUsed returns a boolean if a field has been set.

### GetIngestTokenLimit

`func (o *V09UsageLimitSnapshot) GetIngestTokenLimit() float32`

GetIngestTokenLimit returns the IngestTokenLimit field if non-nil, zero value otherwise.

### GetIngestTokenLimitOk

`func (o *V09UsageLimitSnapshot) GetIngestTokenLimitOk() (*float32, bool)`

GetIngestTokenLimitOk returns a tuple with the IngestTokenLimit field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIngestTokenLimit

`func (o *V09UsageLimitSnapshot) SetIngestTokenLimit(v float32)`

SetIngestTokenLimit sets IngestTokenLimit field to given value.

### HasIngestTokenLimit

`func (o *V09UsageLimitSnapshot) HasIngestTokenLimit() bool`

HasIngestTokenLimit returns a boolean if a field has been set.

### GetRecallUsed

`func (o *V09UsageLimitSnapshot) GetRecallUsed() float32`

GetRecallUsed returns the RecallUsed field if non-nil, zero value otherwise.

### GetRecallUsedOk

`func (o *V09UsageLimitSnapshot) GetRecallUsedOk() (*float32, bool)`

GetRecallUsedOk returns a tuple with the RecallUsed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRecallUsed

`func (o *V09UsageLimitSnapshot) SetRecallUsed(v float32)`

SetRecallUsed sets RecallUsed field to given value.

### HasRecallUsed

`func (o *V09UsageLimitSnapshot) HasRecallUsed() bool`

HasRecallUsed returns a boolean if a field has been set.

### GetRecallLimit

`func (o *V09UsageLimitSnapshot) GetRecallLimit() float32`

GetRecallLimit returns the RecallLimit field if non-nil, zero value otherwise.

### GetRecallLimitOk

`func (o *V09UsageLimitSnapshot) GetRecallLimitOk() (*float32, bool)`

GetRecallLimitOk returns a tuple with the RecallLimit field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRecallLimit

`func (o *V09UsageLimitSnapshot) SetRecallLimit(v float32)`

SetRecallLimit sets RecallLimit field to given value.

### HasRecallLimit

`func (o *V09UsageLimitSnapshot) HasRecallLimit() bool`

HasRecallLimit returns a boolean if a field has been set.

### GetAgentCount

`func (o *V09UsageLimitSnapshot) GetAgentCount() int32`

GetAgentCount returns the AgentCount field if non-nil, zero value otherwise.

### GetAgentCountOk

`func (o *V09UsageLimitSnapshot) GetAgentCountOk() (*int32, bool)`

GetAgentCountOk returns a tuple with the AgentCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAgentCount

`func (o *V09UsageLimitSnapshot) SetAgentCount(v int32)`

SetAgentCount sets AgentCount field to given value.

### HasAgentCount

`func (o *V09UsageLimitSnapshot) HasAgentCount() bool`

HasAgentCount returns a boolean if a field has been set.

### GetAgentLimit

`func (o *V09UsageLimitSnapshot) GetAgentLimit() int32`

GetAgentLimit returns the AgentLimit field if non-nil, zero value otherwise.

### GetAgentLimitOk

`func (o *V09UsageLimitSnapshot) GetAgentLimitOk() (*int32, bool)`

GetAgentLimitOk returns a tuple with the AgentLimit field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAgentLimit

`func (o *V09UsageLimitSnapshot) SetAgentLimit(v int32)`

SetAgentLimit sets AgentLimit field to given value.

### HasAgentLimit

`func (o *V09UsageLimitSnapshot) HasAgentLimit() bool`

HasAgentLimit returns a boolean if a field has been set.

### GetRawArchiveEnabled

`func (o *V09UsageLimitSnapshot) GetRawArchiveEnabled() bool`

GetRawArchiveEnabled returns the RawArchiveEnabled field if non-nil, zero value otherwise.

### GetRawArchiveEnabledOk

`func (o *V09UsageLimitSnapshot) GetRawArchiveEnabledOk() (*bool, bool)`

GetRawArchiveEnabledOk returns a tuple with the RawArchiveEnabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRawArchiveEnabled

`func (o *V09UsageLimitSnapshot) SetRawArchiveEnabled(v bool)`

SetRawArchiveEnabled sets RawArchiveEnabled field to given value.

### HasRawArchiveEnabled

`func (o *V09UsageLimitSnapshot) HasRawArchiveEnabled() bool`

HasRawArchiveEnabled returns a boolean if a field has been set.

### GetObservedAt

`func (o *V09UsageLimitSnapshot) GetObservedAt() time.Time`

GetObservedAt returns the ObservedAt field if non-nil, zero value otherwise.

### GetObservedAtOk

`func (o *V09UsageLimitSnapshot) GetObservedAtOk() (*time.Time, bool)`

GetObservedAtOk returns a tuple with the ObservedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetObservedAt

`func (o *V09UsageLimitSnapshot) SetObservedAt(v time.Time)`

SetObservedAt sets ObservedAt field to given value.

### HasObservedAt

`func (o *V09UsageLimitSnapshot) HasObservedAt() bool`

HasObservedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
