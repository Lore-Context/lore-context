# EvidenceLedgerRow

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**MemoryId** | Pointer to **string** |  | [optional]
**ContentPreview** | Pointer to **string** |  | [optional]
**Disposition** | Pointer to **string** |  | [optional]
**Status** | Pointer to **string** |  | [optional]
**Confidence** | Pointer to **NullableFloat32** |  | [optional]
**SourceRefs** | Pointer to [**[]SourceRef**](SourceRef.md) |  | [optional]
**RiskTags** | Pointer to **[]string** |  | [optional]
**Warnings** | Pointer to **[]string** |  | [optional]

## Methods

### NewEvidenceLedgerRow

`func NewEvidenceLedgerRow() *EvidenceLedgerRow`

NewEvidenceLedgerRow instantiates a new EvidenceLedgerRow object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEvidenceLedgerRowWithDefaults

`func NewEvidenceLedgerRowWithDefaults() *EvidenceLedgerRow`

NewEvidenceLedgerRowWithDefaults instantiates a new EvidenceLedgerRow object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMemoryId

`func (o *EvidenceLedgerRow) GetMemoryId() string`

GetMemoryId returns the MemoryId field if non-nil, zero value otherwise.

### GetMemoryIdOk

`func (o *EvidenceLedgerRow) GetMemoryIdOk() (*string, bool)`

GetMemoryIdOk returns a tuple with the MemoryId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemoryId

`func (o *EvidenceLedgerRow) SetMemoryId(v string)`

SetMemoryId sets MemoryId field to given value.

### HasMemoryId

`func (o *EvidenceLedgerRow) HasMemoryId() bool`

HasMemoryId returns a boolean if a field has been set.

### GetContentPreview

`func (o *EvidenceLedgerRow) GetContentPreview() string`

GetContentPreview returns the ContentPreview field if non-nil, zero value otherwise.

### GetContentPreviewOk

`func (o *EvidenceLedgerRow) GetContentPreviewOk() (*string, bool)`

GetContentPreviewOk returns a tuple with the ContentPreview field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContentPreview

`func (o *EvidenceLedgerRow) SetContentPreview(v string)`

SetContentPreview sets ContentPreview field to given value.

### HasContentPreview

`func (o *EvidenceLedgerRow) HasContentPreview() bool`

HasContentPreview returns a boolean if a field has been set.

### GetDisposition

`func (o *EvidenceLedgerRow) GetDisposition() string`

GetDisposition returns the Disposition field if non-nil, zero value otherwise.

### GetDispositionOk

`func (o *EvidenceLedgerRow) GetDispositionOk() (*string, bool)`

GetDispositionOk returns a tuple with the Disposition field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisposition

`func (o *EvidenceLedgerRow) SetDisposition(v string)`

SetDisposition sets Disposition field to given value.

### HasDisposition

`func (o *EvidenceLedgerRow) HasDisposition() bool`

HasDisposition returns a boolean if a field has been set.

### GetStatus

`func (o *EvidenceLedgerRow) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *EvidenceLedgerRow) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *EvidenceLedgerRow) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *EvidenceLedgerRow) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetConfidence

`func (o *EvidenceLedgerRow) GetConfidence() float32`

GetConfidence returns the Confidence field if non-nil, zero value otherwise.

### GetConfidenceOk

`func (o *EvidenceLedgerRow) GetConfidenceOk() (*float32, bool)`

GetConfidenceOk returns a tuple with the Confidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfidence

`func (o *EvidenceLedgerRow) SetConfidence(v float32)`

SetConfidence sets Confidence field to given value.

### HasConfidence

`func (o *EvidenceLedgerRow) HasConfidence() bool`

HasConfidence returns a boolean if a field has been set.

### SetConfidenceNil

`func (o *EvidenceLedgerRow) SetConfidenceNil(b bool)`

 SetConfidenceNil sets the value for Confidence to be an explicit nil

### UnsetConfidence
`func (o *EvidenceLedgerRow) UnsetConfidence()`

UnsetConfidence ensures that no value is present for Confidence, not even an explicit nil
### GetSourceRefs

`func (o *EvidenceLedgerRow) GetSourceRefs() []SourceRef`

GetSourceRefs returns the SourceRefs field if non-nil, zero value otherwise.

### GetSourceRefsOk

`func (o *EvidenceLedgerRow) GetSourceRefsOk() (*[]SourceRef, bool)`

GetSourceRefsOk returns a tuple with the SourceRefs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceRefs

`func (o *EvidenceLedgerRow) SetSourceRefs(v []SourceRef)`

SetSourceRefs sets SourceRefs field to given value.

### HasSourceRefs

`func (o *EvidenceLedgerRow) HasSourceRefs() bool`

HasSourceRefs returns a boolean if a field has been set.

### GetRiskTags

`func (o *EvidenceLedgerRow) GetRiskTags() []string`

GetRiskTags returns the RiskTags field if non-nil, zero value otherwise.

### GetRiskTagsOk

`func (o *EvidenceLedgerRow) GetRiskTagsOk() (*[]string, bool)`

GetRiskTagsOk returns a tuple with the RiskTags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRiskTags

`func (o *EvidenceLedgerRow) SetRiskTags(v []string)`

SetRiskTags sets RiskTags field to given value.

### HasRiskTags

`func (o *EvidenceLedgerRow) HasRiskTags() bool`

HasRiskTags returns a boolean if a field has been set.

### GetWarnings

`func (o *EvidenceLedgerRow) GetWarnings() []string`

GetWarnings returns the Warnings field if non-nil, zero value otherwise.

### GetWarningsOk

`func (o *EvidenceLedgerRow) GetWarningsOk() (*[]string, bool)`

GetWarningsOk returns a tuple with the Warnings field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWarnings

`func (o *EvidenceLedgerRow) SetWarnings(v []string)`

SetWarnings sets Warnings field to given value.

### HasWarnings

`func (o *EvidenceLedgerRow) HasWarnings() bool`

HasWarnings returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
