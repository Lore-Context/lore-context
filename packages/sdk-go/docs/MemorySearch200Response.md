# MemorySearch200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Hits** | Pointer to [**[]MemoryHit**](MemoryHit.md) |  | [optional]
**Backend** | Pointer to **string** |  | [optional]
**Degraded** | Pointer to **bool** |  | [optional]
**AsOf** | Pointer to [**MemorySearch200ResponseAsOf**](MemorySearch200ResponseAsOf.md) |  | [optional]
**Diagnostics** | Pointer to [**MemorySearch200ResponseDiagnostics**](MemorySearch200ResponseDiagnostics.md) |  | [optional]

## Methods

### NewMemorySearch200Response

`func NewMemorySearch200Response() *MemorySearch200Response`

NewMemorySearch200Response instantiates a new MemorySearch200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemorySearch200ResponseWithDefaults

`func NewMemorySearch200ResponseWithDefaults() *MemorySearch200Response`

NewMemorySearch200ResponseWithDefaults instantiates a new MemorySearch200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetHits

`func (o *MemorySearch200Response) GetHits() []MemoryHit`

GetHits returns the Hits field if non-nil, zero value otherwise.

### GetHitsOk

`func (o *MemorySearch200Response) GetHitsOk() (*[]MemoryHit, bool)`

GetHitsOk returns a tuple with the Hits field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHits

`func (o *MemorySearch200Response) SetHits(v []MemoryHit)`

SetHits sets Hits field to given value.

### HasHits

`func (o *MemorySearch200Response) HasHits() bool`

HasHits returns a boolean if a field has been set.

### GetBackend

`func (o *MemorySearch200Response) GetBackend() string`

GetBackend returns the Backend field if non-nil, zero value otherwise.

### GetBackendOk

`func (o *MemorySearch200Response) GetBackendOk() (*string, bool)`

GetBackendOk returns a tuple with the Backend field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBackend

`func (o *MemorySearch200Response) SetBackend(v string)`

SetBackend sets Backend field to given value.

### HasBackend

`func (o *MemorySearch200Response) HasBackend() bool`

HasBackend returns a boolean if a field has been set.

### GetDegraded

`func (o *MemorySearch200Response) GetDegraded() bool`

GetDegraded returns the Degraded field if non-nil, zero value otherwise.

### GetDegradedOk

`func (o *MemorySearch200Response) GetDegradedOk() (*bool, bool)`

GetDegradedOk returns a tuple with the Degraded field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDegraded

`func (o *MemorySearch200Response) SetDegraded(v bool)`

SetDegraded sets Degraded field to given value.

### HasDegraded

`func (o *MemorySearch200Response) HasDegraded() bool`

HasDegraded returns a boolean if a field has been set.

### GetAsOf

`func (o *MemorySearch200Response) GetAsOf() MemorySearch200ResponseAsOf`

GetAsOf returns the AsOf field if non-nil, zero value otherwise.

### GetAsOfOk

`func (o *MemorySearch200Response) GetAsOfOk() (*MemorySearch200ResponseAsOf, bool)`

GetAsOfOk returns a tuple with the AsOf field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAsOf

`func (o *MemorySearch200Response) SetAsOf(v MemorySearch200ResponseAsOf)`

SetAsOf sets AsOf field to given value.

### HasAsOf

`func (o *MemorySearch200Response) HasAsOf() bool`

HasAsOf returns a boolean if a field has been set.

### GetDiagnostics

`func (o *MemorySearch200Response) GetDiagnostics() MemorySearch200ResponseDiagnostics`

GetDiagnostics returns the Diagnostics field if non-nil, zero value otherwise.

### GetDiagnosticsOk

`func (o *MemorySearch200Response) GetDiagnosticsOk() (*MemorySearch200ResponseDiagnostics, bool)`

GetDiagnosticsOk returns a tuple with the Diagnostics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDiagnostics

`func (o *MemorySearch200Response) SetDiagnostics(v MemorySearch200ResponseDiagnostics)`

SetDiagnostics sets Diagnostics field to given value.

### HasDiagnostics

`func (o *MemorySearch200Response) HasDiagnostics() bool`

HasDiagnostics returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
