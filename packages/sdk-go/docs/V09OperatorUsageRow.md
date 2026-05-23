# V09OperatorUsageRow

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**VaultId** | Pointer to **string** |  | [optional]
**AccountId** | Pointer to **NullableString** |  | [optional]
**Plan** | Pointer to **string** |  | [optional]
**IngestTokenUsed** | Pointer to **float32** |  | [optional]
**RecallUsed** | Pointer to **float32** |  | [optional]
**CaptureEventCount** | Pointer to **float32** |  | [optional]
**LastEventAt** | Pointer to **NullableTime** |  | [optional]

## Methods

### NewV09OperatorUsageRow

`func NewV09OperatorUsageRow() *V09OperatorUsageRow`

NewV09OperatorUsageRow instantiates a new V09OperatorUsageRow object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09OperatorUsageRowWithDefaults

`func NewV09OperatorUsageRowWithDefaults() *V09OperatorUsageRow`

NewV09OperatorUsageRowWithDefaults instantiates a new V09OperatorUsageRow object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetVaultId

`func (o *V09OperatorUsageRow) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *V09OperatorUsageRow) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *V09OperatorUsageRow) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *V09OperatorUsageRow) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetAccountId

`func (o *V09OperatorUsageRow) GetAccountId() string`

GetAccountId returns the AccountId field if non-nil, zero value otherwise.

### GetAccountIdOk

`func (o *V09OperatorUsageRow) GetAccountIdOk() (*string, bool)`

GetAccountIdOk returns a tuple with the AccountId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccountId

`func (o *V09OperatorUsageRow) SetAccountId(v string)`

SetAccountId sets AccountId field to given value.

### HasAccountId

`func (o *V09OperatorUsageRow) HasAccountId() bool`

HasAccountId returns a boolean if a field has been set.

### SetAccountIdNil

`func (o *V09OperatorUsageRow) SetAccountIdNil(b bool)`

 SetAccountIdNil sets the value for AccountId to be an explicit nil

### UnsetAccountId
`func (o *V09OperatorUsageRow) UnsetAccountId()`

UnsetAccountId ensures that no value is present for AccountId, not even an explicit nil
### GetPlan

`func (o *V09OperatorUsageRow) GetPlan() string`

GetPlan returns the Plan field if non-nil, zero value otherwise.

### GetPlanOk

`func (o *V09OperatorUsageRow) GetPlanOk() (*string, bool)`

GetPlanOk returns a tuple with the Plan field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlan

`func (o *V09OperatorUsageRow) SetPlan(v string)`

SetPlan sets Plan field to given value.

### HasPlan

`func (o *V09OperatorUsageRow) HasPlan() bool`

HasPlan returns a boolean if a field has been set.

### GetIngestTokenUsed

`func (o *V09OperatorUsageRow) GetIngestTokenUsed() float32`

GetIngestTokenUsed returns the IngestTokenUsed field if non-nil, zero value otherwise.

### GetIngestTokenUsedOk

`func (o *V09OperatorUsageRow) GetIngestTokenUsedOk() (*float32, bool)`

GetIngestTokenUsedOk returns a tuple with the IngestTokenUsed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIngestTokenUsed

`func (o *V09OperatorUsageRow) SetIngestTokenUsed(v float32)`

SetIngestTokenUsed sets IngestTokenUsed field to given value.

### HasIngestTokenUsed

`func (o *V09OperatorUsageRow) HasIngestTokenUsed() bool`

HasIngestTokenUsed returns a boolean if a field has been set.

### GetRecallUsed

`func (o *V09OperatorUsageRow) GetRecallUsed() float32`

GetRecallUsed returns the RecallUsed field if non-nil, zero value otherwise.

### GetRecallUsedOk

`func (o *V09OperatorUsageRow) GetRecallUsedOk() (*float32, bool)`

GetRecallUsedOk returns a tuple with the RecallUsed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRecallUsed

`func (o *V09OperatorUsageRow) SetRecallUsed(v float32)`

SetRecallUsed sets RecallUsed field to given value.

### HasRecallUsed

`func (o *V09OperatorUsageRow) HasRecallUsed() bool`

HasRecallUsed returns a boolean if a field has been set.

### GetCaptureEventCount

`func (o *V09OperatorUsageRow) GetCaptureEventCount() float32`

GetCaptureEventCount returns the CaptureEventCount field if non-nil, zero value otherwise.

### GetCaptureEventCountOk

`func (o *V09OperatorUsageRow) GetCaptureEventCountOk() (*float32, bool)`

GetCaptureEventCountOk returns a tuple with the CaptureEventCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCaptureEventCount

`func (o *V09OperatorUsageRow) SetCaptureEventCount(v float32)`

SetCaptureEventCount sets CaptureEventCount field to given value.

### HasCaptureEventCount

`func (o *V09OperatorUsageRow) HasCaptureEventCount() bool`

HasCaptureEventCount returns a boolean if a field has been set.

### GetLastEventAt

`func (o *V09OperatorUsageRow) GetLastEventAt() time.Time`

GetLastEventAt returns the LastEventAt field if non-nil, zero value otherwise.

### GetLastEventAtOk

`func (o *V09OperatorUsageRow) GetLastEventAtOk() (*time.Time, bool)`

GetLastEventAtOk returns a tuple with the LastEventAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastEventAt

`func (o *V09OperatorUsageRow) SetLastEventAt(v time.Time)`

SetLastEventAt sets LastEventAt field to given value.

### HasLastEventAt

`func (o *V09OperatorUsageRow) HasLastEventAt() bool`

HasLastEventAt returns a boolean if a field has been set.

### SetLastEventAtNil

`func (o *V09OperatorUsageRow) SetLastEventAtNil(b bool)`

 SetLastEventAtNil sets the value for LastEventAt to be an explicit nil

### UnsetLastEventAt
`func (o *V09OperatorUsageRow) UnsetLastEventAt()`

UnsetLastEventAt ensures that no value is present for LastEventAt, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
