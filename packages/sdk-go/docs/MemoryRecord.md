# MemoryRecord

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**ProjectId** | Pointer to **string** |  | [optional]
**MemoryType** | Pointer to **string** |  | [optional]
**Scope** | Pointer to **string** |  | [optional]
**Visibility** | Pointer to **string** |  | [optional]
**Content** | Pointer to **string** |  | [optional]
**Status** | Pointer to **string** |  | [optional]
**Confidence** | Pointer to **float32** |  | [optional]
**SourceRefs** | Pointer to [**[]SourceRef**](SourceRef.md) |  | [optional]
**RiskTags** | Pointer to **[]string** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]
**UseCount** | Pointer to **int32** |  | [optional]
**CreatedAt** | Pointer to **time.Time** |  | [optional]
**UpdatedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewMemoryRecord

`func NewMemoryRecord() *MemoryRecord`

NewMemoryRecord instantiates a new MemoryRecord object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryRecordWithDefaults

`func NewMemoryRecordWithDefaults() *MemoryRecord`

NewMemoryRecordWithDefaults instantiates a new MemoryRecord object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *MemoryRecord) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *MemoryRecord) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *MemoryRecord) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *MemoryRecord) HasId() bool`

HasId returns a boolean if a field has been set.

### GetProjectId

`func (o *MemoryRecord) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *MemoryRecord) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *MemoryRecord) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.

### HasProjectId

`func (o *MemoryRecord) HasProjectId() bool`

HasProjectId returns a boolean if a field has been set.

### GetMemoryType

`func (o *MemoryRecord) GetMemoryType() string`

GetMemoryType returns the MemoryType field if non-nil, zero value otherwise.

### GetMemoryTypeOk

`func (o *MemoryRecord) GetMemoryTypeOk() (*string, bool)`

GetMemoryTypeOk returns a tuple with the MemoryType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemoryType

`func (o *MemoryRecord) SetMemoryType(v string)`

SetMemoryType sets MemoryType field to given value.

### HasMemoryType

`func (o *MemoryRecord) HasMemoryType() bool`

HasMemoryType returns a boolean if a field has been set.

### GetScope

`func (o *MemoryRecord) GetScope() string`

GetScope returns the Scope field if non-nil, zero value otherwise.

### GetScopeOk

`func (o *MemoryRecord) GetScopeOk() (*string, bool)`

GetScopeOk returns a tuple with the Scope field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScope

`func (o *MemoryRecord) SetScope(v string)`

SetScope sets Scope field to given value.

### HasScope

`func (o *MemoryRecord) HasScope() bool`

HasScope returns a boolean if a field has been set.

### GetVisibility

`func (o *MemoryRecord) GetVisibility() string`

GetVisibility returns the Visibility field if non-nil, zero value otherwise.

### GetVisibilityOk

`func (o *MemoryRecord) GetVisibilityOk() (*string, bool)`

GetVisibilityOk returns a tuple with the Visibility field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVisibility

`func (o *MemoryRecord) SetVisibility(v string)`

SetVisibility sets Visibility field to given value.

### HasVisibility

`func (o *MemoryRecord) HasVisibility() bool`

HasVisibility returns a boolean if a field has been set.

### GetContent

`func (o *MemoryRecord) GetContent() string`

GetContent returns the Content field if non-nil, zero value otherwise.

### GetContentOk

`func (o *MemoryRecord) GetContentOk() (*string, bool)`

GetContentOk returns a tuple with the Content field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContent

`func (o *MemoryRecord) SetContent(v string)`

SetContent sets Content field to given value.

### HasContent

`func (o *MemoryRecord) HasContent() bool`

HasContent returns a boolean if a field has been set.

### GetStatus

`func (o *MemoryRecord) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *MemoryRecord) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *MemoryRecord) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *MemoryRecord) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetConfidence

`func (o *MemoryRecord) GetConfidence() float32`

GetConfidence returns the Confidence field if non-nil, zero value otherwise.

### GetConfidenceOk

`func (o *MemoryRecord) GetConfidenceOk() (*float32, bool)`

GetConfidenceOk returns a tuple with the Confidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfidence

`func (o *MemoryRecord) SetConfidence(v float32)`

SetConfidence sets Confidence field to given value.

### HasConfidence

`func (o *MemoryRecord) HasConfidence() bool`

HasConfidence returns a boolean if a field has been set.

### GetSourceRefs

`func (o *MemoryRecord) GetSourceRefs() []SourceRef`

GetSourceRefs returns the SourceRefs field if non-nil, zero value otherwise.

### GetSourceRefsOk

`func (o *MemoryRecord) GetSourceRefsOk() (*[]SourceRef, bool)`

GetSourceRefsOk returns a tuple with the SourceRefs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceRefs

`func (o *MemoryRecord) SetSourceRefs(v []SourceRef)`

SetSourceRefs sets SourceRefs field to given value.

### HasSourceRefs

`func (o *MemoryRecord) HasSourceRefs() bool`

HasSourceRefs returns a boolean if a field has been set.

### GetRiskTags

`func (o *MemoryRecord) GetRiskTags() []string`

GetRiskTags returns the RiskTags field if non-nil, zero value otherwise.

### GetRiskTagsOk

`func (o *MemoryRecord) GetRiskTagsOk() (*[]string, bool)`

GetRiskTagsOk returns a tuple with the RiskTags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRiskTags

`func (o *MemoryRecord) SetRiskTags(v []string)`

SetRiskTags sets RiskTags field to given value.

### HasRiskTags

`func (o *MemoryRecord) HasRiskTags() bool`

HasRiskTags returns a boolean if a field has been set.

### GetMetadata

`func (o *MemoryRecord) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *MemoryRecord) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *MemoryRecord) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *MemoryRecord) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### GetUseCount

`func (o *MemoryRecord) GetUseCount() int32`

GetUseCount returns the UseCount field if non-nil, zero value otherwise.

### GetUseCountOk

`func (o *MemoryRecord) GetUseCountOk() (*int32, bool)`

GetUseCountOk returns a tuple with the UseCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUseCount

`func (o *MemoryRecord) SetUseCount(v int32)`

SetUseCount sets UseCount field to given value.

### HasUseCount

`func (o *MemoryRecord) HasUseCount() bool`

HasUseCount returns a boolean if a field has been set.

### GetCreatedAt

`func (o *MemoryRecord) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *MemoryRecord) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *MemoryRecord) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.

### HasCreatedAt

`func (o *MemoryRecord) HasCreatedAt() bool`

HasCreatedAt returns a boolean if a field has been set.

### GetUpdatedAt

`func (o *MemoryRecord) GetUpdatedAt() time.Time`

GetUpdatedAt returns the UpdatedAt field if non-nil, zero value otherwise.

### GetUpdatedAtOk

`func (o *MemoryRecord) GetUpdatedAtOk() (*time.Time, bool)`

GetUpdatedAtOk returns a tuple with the UpdatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpdatedAt

`func (o *MemoryRecord) SetUpdatedAt(v time.Time)`

SetUpdatedAt sets UpdatedAt field to given value.

### HasUpdatedAt

`func (o *MemoryRecord) HasUpdatedAt() bool`

HasUpdatedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
