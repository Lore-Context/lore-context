# V09UsageSummary

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Plan** | Pointer to **string** |  | [optional]
**Snapshot** | Pointer to [**V09UsageLimitSnapshot**](V09UsageLimitSnapshot.md) |  | [optional]
**Events** | Pointer to [**[]V09UsageSummaryEventsInner**](V09UsageSummaryEventsInner.md) |  | [optional]

## Methods

### NewV09UsageSummary

`func NewV09UsageSummary() *V09UsageSummary`

NewV09UsageSummary instantiates a new V09UsageSummary object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09UsageSummaryWithDefaults

`func NewV09UsageSummaryWithDefaults() *V09UsageSummary`

NewV09UsageSummaryWithDefaults instantiates a new V09UsageSummary object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetPlan

`func (o *V09UsageSummary) GetPlan() string`

GetPlan returns the Plan field if non-nil, zero value otherwise.

### GetPlanOk

`func (o *V09UsageSummary) GetPlanOk() (*string, bool)`

GetPlanOk returns a tuple with the Plan field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlan

`func (o *V09UsageSummary) SetPlan(v string)`

SetPlan sets Plan field to given value.

### HasPlan

`func (o *V09UsageSummary) HasPlan() bool`

HasPlan returns a boolean if a field has been set.

### GetSnapshot

`func (o *V09UsageSummary) GetSnapshot() V09UsageLimitSnapshot`

GetSnapshot returns the Snapshot field if non-nil, zero value otherwise.

### GetSnapshotOk

`func (o *V09UsageSummary) GetSnapshotOk() (*V09UsageLimitSnapshot, bool)`

GetSnapshotOk returns a tuple with the Snapshot field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSnapshot

`func (o *V09UsageSummary) SetSnapshot(v V09UsageLimitSnapshot)`

SetSnapshot sets Snapshot field to given value.

### HasSnapshot

`func (o *V09UsageSummary) HasSnapshot() bool`

HasSnapshot returns a boolean if a field has been set.

### GetEvents

`func (o *V09UsageSummary) GetEvents() []V09UsageSummaryEventsInner`

GetEvents returns the Events field if non-nil, zero value otherwise.

### GetEventsOk

`func (o *V09UsageSummary) GetEventsOk() (*[]V09UsageSummaryEventsInner, bool)`

GetEventsOk returns a tuple with the Events field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvents

`func (o *V09UsageSummary) SetEvents(v []V09UsageSummaryEventsInner)`

SetEvents sets Events field to given value.

### HasEvents

`func (o *V09UsageSummary) HasEvents() bool`

HasEvents returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
