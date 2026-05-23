# V10RecallTraceItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**TraceId** | Pointer to **string** |  | [optional]
**MemoryId** | Pointer to **NullableString** |  | [optional]
**CandidateId** | Pointer to **NullableString** |  | [optional]
**Disposition** | Pointer to **string** |  | [optional]
**Confidence** | Pointer to **NullableFloat32** |  | [optional]
**RiskTags** | Pointer to **[]string** |  | [optional]
**Reason** | Pointer to **NullableString** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewV10RecallTraceItem

`func NewV10RecallTraceItem() *V10RecallTraceItem`

NewV10RecallTraceItem instantiates a new V10RecallTraceItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV10RecallTraceItemWithDefaults

`func NewV10RecallTraceItemWithDefaults() *V10RecallTraceItem`

NewV10RecallTraceItemWithDefaults instantiates a new V10RecallTraceItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *V10RecallTraceItem) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *V10RecallTraceItem) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *V10RecallTraceItem) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *V10RecallTraceItem) HasId() bool`

HasId returns a boolean if a field has been set.

### GetTraceId

`func (o *V10RecallTraceItem) GetTraceId() string`

GetTraceId returns the TraceId field if non-nil, zero value otherwise.

### GetTraceIdOk

`func (o *V10RecallTraceItem) GetTraceIdOk() (*string, bool)`

GetTraceIdOk returns a tuple with the TraceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceId

`func (o *V10RecallTraceItem) SetTraceId(v string)`

SetTraceId sets TraceId field to given value.

### HasTraceId

`func (o *V10RecallTraceItem) HasTraceId() bool`

HasTraceId returns a boolean if a field has been set.

### GetMemoryId

`func (o *V10RecallTraceItem) GetMemoryId() string`

GetMemoryId returns the MemoryId field if non-nil, zero value otherwise.

### GetMemoryIdOk

`func (o *V10RecallTraceItem) GetMemoryIdOk() (*string, bool)`

GetMemoryIdOk returns a tuple with the MemoryId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemoryId

`func (o *V10RecallTraceItem) SetMemoryId(v string)`

SetMemoryId sets MemoryId field to given value.

### HasMemoryId

`func (o *V10RecallTraceItem) HasMemoryId() bool`

HasMemoryId returns a boolean if a field has been set.

### SetMemoryIdNil

`func (o *V10RecallTraceItem) SetMemoryIdNil(b bool)`

 SetMemoryIdNil sets the value for MemoryId to be an explicit nil

### UnsetMemoryId
`func (o *V10RecallTraceItem) UnsetMemoryId()`

UnsetMemoryId ensures that no value is present for MemoryId, not even an explicit nil
### GetCandidateId

`func (o *V10RecallTraceItem) GetCandidateId() string`

GetCandidateId returns the CandidateId field if non-nil, zero value otherwise.

### GetCandidateIdOk

`func (o *V10RecallTraceItem) GetCandidateIdOk() (*string, bool)`

GetCandidateIdOk returns a tuple with the CandidateId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCandidateId

`func (o *V10RecallTraceItem) SetCandidateId(v string)`

SetCandidateId sets CandidateId field to given value.

### HasCandidateId

`func (o *V10RecallTraceItem) HasCandidateId() bool`

HasCandidateId returns a boolean if a field has been set.

### SetCandidateIdNil

`func (o *V10RecallTraceItem) SetCandidateIdNil(b bool)`

 SetCandidateIdNil sets the value for CandidateId to be an explicit nil

### UnsetCandidateId
`func (o *V10RecallTraceItem) UnsetCandidateId()`

UnsetCandidateId ensures that no value is present for CandidateId, not even an explicit nil
### GetDisposition

`func (o *V10RecallTraceItem) GetDisposition() string`

GetDisposition returns the Disposition field if non-nil, zero value otherwise.

### GetDispositionOk

`func (o *V10RecallTraceItem) GetDispositionOk() (*string, bool)`

GetDispositionOk returns a tuple with the Disposition field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisposition

`func (o *V10RecallTraceItem) SetDisposition(v string)`

SetDisposition sets Disposition field to given value.

### HasDisposition

`func (o *V10RecallTraceItem) HasDisposition() bool`

HasDisposition returns a boolean if a field has been set.

### GetConfidence

`func (o *V10RecallTraceItem) GetConfidence() float32`

GetConfidence returns the Confidence field if non-nil, zero value otherwise.

### GetConfidenceOk

`func (o *V10RecallTraceItem) GetConfidenceOk() (*float32, bool)`

GetConfidenceOk returns a tuple with the Confidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfidence

`func (o *V10RecallTraceItem) SetConfidence(v float32)`

SetConfidence sets Confidence field to given value.

### HasConfidence

`func (o *V10RecallTraceItem) HasConfidence() bool`

HasConfidence returns a boolean if a field has been set.

### SetConfidenceNil

`func (o *V10RecallTraceItem) SetConfidenceNil(b bool)`

 SetConfidenceNil sets the value for Confidence to be an explicit nil

### UnsetConfidence
`func (o *V10RecallTraceItem) UnsetConfidence()`

UnsetConfidence ensures that no value is present for Confidence, not even an explicit nil
### GetRiskTags

`func (o *V10RecallTraceItem) GetRiskTags() []string`

GetRiskTags returns the RiskTags field if non-nil, zero value otherwise.

### GetRiskTagsOk

`func (o *V10RecallTraceItem) GetRiskTagsOk() (*[]string, bool)`

GetRiskTagsOk returns a tuple with the RiskTags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRiskTags

`func (o *V10RecallTraceItem) SetRiskTags(v []string)`

SetRiskTags sets RiskTags field to given value.

### HasRiskTags

`func (o *V10RecallTraceItem) HasRiskTags() bool`

HasRiskTags returns a boolean if a field has been set.

### GetReason

`func (o *V10RecallTraceItem) GetReason() string`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *V10RecallTraceItem) GetReasonOk() (*string, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *V10RecallTraceItem) SetReason(v string)`

SetReason sets Reason field to given value.

### HasReason

`func (o *V10RecallTraceItem) HasReason() bool`

HasReason returns a boolean if a field has been set.

### SetReasonNil

`func (o *V10RecallTraceItem) SetReasonNil(b bool)`

 SetReasonNil sets the value for Reason to be an explicit nil

### UnsetReason
`func (o *V10RecallTraceItem) UnsetReason()`

UnsetReason ensures that no value is present for Reason, not even an explicit nil
### GetMetadata

`func (o *V10RecallTraceItem) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *V10RecallTraceItem) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *V10RecallTraceItem) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *V10RecallTraceItem) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
