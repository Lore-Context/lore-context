# V10MemoryCandidate

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**SourceId** | Pointer to **NullableString** |  | [optional]
**SessionId** | Pointer to **NullableString** |  | [optional]
**ExternalEventId** | Pointer to **NullableString** |  | [optional]
**Content** | Pointer to **string** |  | [optional]
**MemoryType** | Pointer to **string** |  | [optional]
**Status** | Pointer to **string** |  | [optional]
**RiskTags** | Pointer to **[]string** |  | [optional]
**Confidence** | Pointer to **float32** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]
**CreatedAt** | Pointer to **time.Time** |  | [optional]
**UpdatedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewV10MemoryCandidate

`func NewV10MemoryCandidate() *V10MemoryCandidate`

NewV10MemoryCandidate instantiates a new V10MemoryCandidate object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV10MemoryCandidateWithDefaults

`func NewV10MemoryCandidateWithDefaults() *V10MemoryCandidate`

NewV10MemoryCandidateWithDefaults instantiates a new V10MemoryCandidate object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *V10MemoryCandidate) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *V10MemoryCandidate) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *V10MemoryCandidate) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *V10MemoryCandidate) HasId() bool`

HasId returns a boolean if a field has been set.

### GetVaultId

`func (o *V10MemoryCandidate) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *V10MemoryCandidate) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *V10MemoryCandidate) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *V10MemoryCandidate) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetSourceId

`func (o *V10MemoryCandidate) GetSourceId() string`

GetSourceId returns the SourceId field if non-nil, zero value otherwise.

### GetSourceIdOk

`func (o *V10MemoryCandidate) GetSourceIdOk() (*string, bool)`

GetSourceIdOk returns a tuple with the SourceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceId

`func (o *V10MemoryCandidate) SetSourceId(v string)`

SetSourceId sets SourceId field to given value.

### HasSourceId

`func (o *V10MemoryCandidate) HasSourceId() bool`

HasSourceId returns a boolean if a field has been set.

### SetSourceIdNil

`func (o *V10MemoryCandidate) SetSourceIdNil(b bool)`

 SetSourceIdNil sets the value for SourceId to be an explicit nil

### UnsetSourceId
`func (o *V10MemoryCandidate) UnsetSourceId()`

UnsetSourceId ensures that no value is present for SourceId, not even an explicit nil
### GetSessionId

`func (o *V10MemoryCandidate) GetSessionId() string`

GetSessionId returns the SessionId field if non-nil, zero value otherwise.

### GetSessionIdOk

`func (o *V10MemoryCandidate) GetSessionIdOk() (*string, bool)`

GetSessionIdOk returns a tuple with the SessionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionId

`func (o *V10MemoryCandidate) SetSessionId(v string)`

SetSessionId sets SessionId field to given value.

### HasSessionId

`func (o *V10MemoryCandidate) HasSessionId() bool`

HasSessionId returns a boolean if a field has been set.

### SetSessionIdNil

`func (o *V10MemoryCandidate) SetSessionIdNil(b bool)`

 SetSessionIdNil sets the value for SessionId to be an explicit nil

### UnsetSessionId
`func (o *V10MemoryCandidate) UnsetSessionId()`

UnsetSessionId ensures that no value is present for SessionId, not even an explicit nil
### GetExternalEventId

`func (o *V10MemoryCandidate) GetExternalEventId() string`

GetExternalEventId returns the ExternalEventId field if non-nil, zero value otherwise.

### GetExternalEventIdOk

`func (o *V10MemoryCandidate) GetExternalEventIdOk() (*string, bool)`

GetExternalEventIdOk returns a tuple with the ExternalEventId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExternalEventId

`func (o *V10MemoryCandidate) SetExternalEventId(v string)`

SetExternalEventId sets ExternalEventId field to given value.

### HasExternalEventId

`func (o *V10MemoryCandidate) HasExternalEventId() bool`

HasExternalEventId returns a boolean if a field has been set.

### SetExternalEventIdNil

`func (o *V10MemoryCandidate) SetExternalEventIdNil(b bool)`

 SetExternalEventIdNil sets the value for ExternalEventId to be an explicit nil

### UnsetExternalEventId
`func (o *V10MemoryCandidate) UnsetExternalEventId()`

UnsetExternalEventId ensures that no value is present for ExternalEventId, not even an explicit nil
### GetContent

`func (o *V10MemoryCandidate) GetContent() string`

GetContent returns the Content field if non-nil, zero value otherwise.

### GetContentOk

`func (o *V10MemoryCandidate) GetContentOk() (*string, bool)`

GetContentOk returns a tuple with the Content field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContent

`func (o *V10MemoryCandidate) SetContent(v string)`

SetContent sets Content field to given value.

### HasContent

`func (o *V10MemoryCandidate) HasContent() bool`

HasContent returns a boolean if a field has been set.

### GetMemoryType

`func (o *V10MemoryCandidate) GetMemoryType() string`

GetMemoryType returns the MemoryType field if non-nil, zero value otherwise.

### GetMemoryTypeOk

`func (o *V10MemoryCandidate) GetMemoryTypeOk() (*string, bool)`

GetMemoryTypeOk returns a tuple with the MemoryType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemoryType

`func (o *V10MemoryCandidate) SetMemoryType(v string)`

SetMemoryType sets MemoryType field to given value.

### HasMemoryType

`func (o *V10MemoryCandidate) HasMemoryType() bool`

HasMemoryType returns a boolean if a field has been set.

### GetStatus

`func (o *V10MemoryCandidate) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *V10MemoryCandidate) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *V10MemoryCandidate) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *V10MemoryCandidate) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetRiskTags

`func (o *V10MemoryCandidate) GetRiskTags() []string`

GetRiskTags returns the RiskTags field if non-nil, zero value otherwise.

### GetRiskTagsOk

`func (o *V10MemoryCandidate) GetRiskTagsOk() (*[]string, bool)`

GetRiskTagsOk returns a tuple with the RiskTags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRiskTags

`func (o *V10MemoryCandidate) SetRiskTags(v []string)`

SetRiskTags sets RiskTags field to given value.

### HasRiskTags

`func (o *V10MemoryCandidate) HasRiskTags() bool`

HasRiskTags returns a boolean if a field has been set.

### GetConfidence

`func (o *V10MemoryCandidate) GetConfidence() float32`

GetConfidence returns the Confidence field if non-nil, zero value otherwise.

### GetConfidenceOk

`func (o *V10MemoryCandidate) GetConfidenceOk() (*float32, bool)`

GetConfidenceOk returns a tuple with the Confidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfidence

`func (o *V10MemoryCandidate) SetConfidence(v float32)`

SetConfidence sets Confidence field to given value.

### HasConfidence

`func (o *V10MemoryCandidate) HasConfidence() bool`

HasConfidence returns a boolean if a field has been set.

### GetMetadata

`func (o *V10MemoryCandidate) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *V10MemoryCandidate) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *V10MemoryCandidate) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *V10MemoryCandidate) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### GetCreatedAt

`func (o *V10MemoryCandidate) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *V10MemoryCandidate) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *V10MemoryCandidate) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.

### HasCreatedAt

`func (o *V10MemoryCandidate) HasCreatedAt() bool`

HasCreatedAt returns a boolean if a field has been set.

### GetUpdatedAt

`func (o *V10MemoryCandidate) GetUpdatedAt() time.Time`

GetUpdatedAt returns the UpdatedAt field if non-nil, zero value otherwise.

### GetUpdatedAtOk

`func (o *V10MemoryCandidate) GetUpdatedAtOk() (*time.Time, bool)`

GetUpdatedAtOk returns a tuple with the UpdatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpdatedAt

`func (o *V10MemoryCandidate) SetUpdatedAt(v time.Time)`

SetUpdatedAt sets UpdatedAt field to given value.

### HasUpdatedAt

`func (o *V10MemoryCandidate) HasUpdatedAt() bool`

HasUpdatedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
