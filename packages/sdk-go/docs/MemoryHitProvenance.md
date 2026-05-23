# MemoryHitProvenance

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SourceRefs** | Pointer to **[]interface{}** |  | [optional]
**CandidateId** | Pointer to **string** |  | [optional]
**ApprovedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewMemoryHitProvenance

`func NewMemoryHitProvenance() *MemoryHitProvenance`

NewMemoryHitProvenance instantiates a new MemoryHitProvenance object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryHitProvenanceWithDefaults

`func NewMemoryHitProvenanceWithDefaults() *MemoryHitProvenance`

NewMemoryHitProvenanceWithDefaults instantiates a new MemoryHitProvenance object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSourceRefs

`func (o *MemoryHitProvenance) GetSourceRefs() []interface{}`

GetSourceRefs returns the SourceRefs field if non-nil, zero value otherwise.

### GetSourceRefsOk

`func (o *MemoryHitProvenance) GetSourceRefsOk() (*[]interface{}, bool)`

GetSourceRefsOk returns a tuple with the SourceRefs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceRefs

`func (o *MemoryHitProvenance) SetSourceRefs(v []interface{})`

SetSourceRefs sets SourceRefs field to given value.

### HasSourceRefs

`func (o *MemoryHitProvenance) HasSourceRefs() bool`

HasSourceRefs returns a boolean if a field has been set.

### GetCandidateId

`func (o *MemoryHitProvenance) GetCandidateId() string`

GetCandidateId returns the CandidateId field if non-nil, zero value otherwise.

### GetCandidateIdOk

`func (o *MemoryHitProvenance) GetCandidateIdOk() (*string, bool)`

GetCandidateIdOk returns a tuple with the CandidateId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCandidateId

`func (o *MemoryHitProvenance) SetCandidateId(v string)`

SetCandidateId sets CandidateId field to given value.

### HasCandidateId

`func (o *MemoryHitProvenance) HasCandidateId() bool`

HasCandidateId returns a boolean if a field has been set.

### GetApprovedAt

`func (o *MemoryHitProvenance) GetApprovedAt() time.Time`

GetApprovedAt returns the ApprovedAt field if non-nil, zero value otherwise.

### GetApprovedAtOk

`func (o *MemoryHitProvenance) GetApprovedAtOk() (*time.Time, bool)`

GetApprovedAtOk returns a tuple with the ApprovedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetApprovedAt

`func (o *MemoryHitProvenance) SetApprovedAt(v time.Time)`

SetApprovedAt sets ApprovedAt field to given value.

### HasApprovedAt

`func (o *MemoryHitProvenance) HasApprovedAt() bool`

HasApprovedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
