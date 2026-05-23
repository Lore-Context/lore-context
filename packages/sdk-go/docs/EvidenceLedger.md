# EvidenceLedger

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TraceId** | Pointer to **string** |  | [optional]
**Query** | Pointer to **string** |  | [optional]
**ProjectId** | Pointer to **string** |  | [optional]
**Route** | Pointer to [**ContextRoute**](ContextRoute.md) |  | [optional]
**TraceWarnings** | Pointer to **[]string** |  | [optional]
**Summary** | Pointer to [**EvidenceLedgerSummary**](EvidenceLedgerSummary.md) |  | [optional]
**Rows** | Pointer to [**[]EvidenceLedgerRow**](EvidenceLedgerRow.md) |  | [optional]
**Actions** | Pointer to **[]string** |  | [optional]
**CreatedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewEvidenceLedger

`func NewEvidenceLedger() *EvidenceLedger`

NewEvidenceLedger instantiates a new EvidenceLedger object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEvidenceLedgerWithDefaults

`func NewEvidenceLedgerWithDefaults() *EvidenceLedger`

NewEvidenceLedgerWithDefaults instantiates a new EvidenceLedger object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTraceId

`func (o *EvidenceLedger) GetTraceId() string`

GetTraceId returns the TraceId field if non-nil, zero value otherwise.

### GetTraceIdOk

`func (o *EvidenceLedger) GetTraceIdOk() (*string, bool)`

GetTraceIdOk returns a tuple with the TraceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceId

`func (o *EvidenceLedger) SetTraceId(v string)`

SetTraceId sets TraceId field to given value.

### HasTraceId

`func (o *EvidenceLedger) HasTraceId() bool`

HasTraceId returns a boolean if a field has been set.

### GetQuery

`func (o *EvidenceLedger) GetQuery() string`

GetQuery returns the Query field if non-nil, zero value otherwise.

### GetQueryOk

`func (o *EvidenceLedger) GetQueryOk() (*string, bool)`

GetQueryOk returns a tuple with the Query field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQuery

`func (o *EvidenceLedger) SetQuery(v string)`

SetQuery sets Query field to given value.

### HasQuery

`func (o *EvidenceLedger) HasQuery() bool`

HasQuery returns a boolean if a field has been set.

### GetProjectId

`func (o *EvidenceLedger) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *EvidenceLedger) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *EvidenceLedger) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.

### HasProjectId

`func (o *EvidenceLedger) HasProjectId() bool`

HasProjectId returns a boolean if a field has been set.

### GetRoute

`func (o *EvidenceLedger) GetRoute() ContextRoute`

GetRoute returns the Route field if non-nil, zero value otherwise.

### GetRouteOk

`func (o *EvidenceLedger) GetRouteOk() (*ContextRoute, bool)`

GetRouteOk returns a tuple with the Route field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRoute

`func (o *EvidenceLedger) SetRoute(v ContextRoute)`

SetRoute sets Route field to given value.

### HasRoute

`func (o *EvidenceLedger) HasRoute() bool`

HasRoute returns a boolean if a field has been set.

### GetTraceWarnings

`func (o *EvidenceLedger) GetTraceWarnings() []string`

GetTraceWarnings returns the TraceWarnings field if non-nil, zero value otherwise.

### GetTraceWarningsOk

`func (o *EvidenceLedger) GetTraceWarningsOk() (*[]string, bool)`

GetTraceWarningsOk returns a tuple with the TraceWarnings field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceWarnings

`func (o *EvidenceLedger) SetTraceWarnings(v []string)`

SetTraceWarnings sets TraceWarnings field to given value.

### HasTraceWarnings

`func (o *EvidenceLedger) HasTraceWarnings() bool`

HasTraceWarnings returns a boolean if a field has been set.

### GetSummary

`func (o *EvidenceLedger) GetSummary() EvidenceLedgerSummary`

GetSummary returns the Summary field if non-nil, zero value otherwise.

### GetSummaryOk

`func (o *EvidenceLedger) GetSummaryOk() (*EvidenceLedgerSummary, bool)`

GetSummaryOk returns a tuple with the Summary field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSummary

`func (o *EvidenceLedger) SetSummary(v EvidenceLedgerSummary)`

SetSummary sets Summary field to given value.

### HasSummary

`func (o *EvidenceLedger) HasSummary() bool`

HasSummary returns a boolean if a field has been set.

### GetRows

`func (o *EvidenceLedger) GetRows() []EvidenceLedgerRow`

GetRows returns the Rows field if non-nil, zero value otherwise.

### GetRowsOk

`func (o *EvidenceLedger) GetRowsOk() (*[]EvidenceLedgerRow, bool)`

GetRowsOk returns a tuple with the Rows field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRows

`func (o *EvidenceLedger) SetRows(v []EvidenceLedgerRow)`

SetRows sets Rows field to given value.

### HasRows

`func (o *EvidenceLedger) HasRows() bool`

HasRows returns a boolean if a field has been set.

### GetActions

`func (o *EvidenceLedger) GetActions() []string`

GetActions returns the Actions field if non-nil, zero value otherwise.

### GetActionsOk

`func (o *EvidenceLedger) GetActionsOk() (*[]string, bool)`

GetActionsOk returns a tuple with the Actions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetActions

`func (o *EvidenceLedger) SetActions(v []string)`

SetActions sets Actions field to given value.

### HasActions

`func (o *EvidenceLedger) HasActions() bool`

HasActions returns a boolean if a field has been set.

### GetCreatedAt

`func (o *EvidenceLedger) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *EvidenceLedger) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *EvidenceLedger) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.

### HasCreatedAt

`func (o *EvidenceLedger) HasCreatedAt() bool`

HasCreatedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
