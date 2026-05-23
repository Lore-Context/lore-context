# V09SourceCheckpoint

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**SourceId** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**CheckpointKey** | Pointer to **string** |  | [optional]
**OffsetValue** | Pointer to **NullableString** |  | [optional]
**ContentHash** | Pointer to **NullableString** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]
**UpdatedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewV09SourceCheckpoint

`func NewV09SourceCheckpoint() *V09SourceCheckpoint`

NewV09SourceCheckpoint instantiates a new V09SourceCheckpoint object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09SourceCheckpointWithDefaults

`func NewV09SourceCheckpointWithDefaults() *V09SourceCheckpoint`

NewV09SourceCheckpointWithDefaults instantiates a new V09SourceCheckpoint object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *V09SourceCheckpoint) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *V09SourceCheckpoint) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *V09SourceCheckpoint) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *V09SourceCheckpoint) HasId() bool`

HasId returns a boolean if a field has been set.

### GetSourceId

`func (o *V09SourceCheckpoint) GetSourceId() string`

GetSourceId returns the SourceId field if non-nil, zero value otherwise.

### GetSourceIdOk

`func (o *V09SourceCheckpoint) GetSourceIdOk() (*string, bool)`

GetSourceIdOk returns a tuple with the SourceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceId

`func (o *V09SourceCheckpoint) SetSourceId(v string)`

SetSourceId sets SourceId field to given value.

### HasSourceId

`func (o *V09SourceCheckpoint) HasSourceId() bool`

HasSourceId returns a boolean if a field has been set.

### GetVaultId

`func (o *V09SourceCheckpoint) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *V09SourceCheckpoint) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *V09SourceCheckpoint) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *V09SourceCheckpoint) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetCheckpointKey

`func (o *V09SourceCheckpoint) GetCheckpointKey() string`

GetCheckpointKey returns the CheckpointKey field if non-nil, zero value otherwise.

### GetCheckpointKeyOk

`func (o *V09SourceCheckpoint) GetCheckpointKeyOk() (*string, bool)`

GetCheckpointKeyOk returns a tuple with the CheckpointKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCheckpointKey

`func (o *V09SourceCheckpoint) SetCheckpointKey(v string)`

SetCheckpointKey sets CheckpointKey field to given value.

### HasCheckpointKey

`func (o *V09SourceCheckpoint) HasCheckpointKey() bool`

HasCheckpointKey returns a boolean if a field has been set.

### GetOffsetValue

`func (o *V09SourceCheckpoint) GetOffsetValue() string`

GetOffsetValue returns the OffsetValue field if non-nil, zero value otherwise.

### GetOffsetValueOk

`func (o *V09SourceCheckpoint) GetOffsetValueOk() (*string, bool)`

GetOffsetValueOk returns a tuple with the OffsetValue field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOffsetValue

`func (o *V09SourceCheckpoint) SetOffsetValue(v string)`

SetOffsetValue sets OffsetValue field to given value.

### HasOffsetValue

`func (o *V09SourceCheckpoint) HasOffsetValue() bool`

HasOffsetValue returns a boolean if a field has been set.

### SetOffsetValueNil

`func (o *V09SourceCheckpoint) SetOffsetValueNil(b bool)`

 SetOffsetValueNil sets the value for OffsetValue to be an explicit nil

### UnsetOffsetValue
`func (o *V09SourceCheckpoint) UnsetOffsetValue()`

UnsetOffsetValue ensures that no value is present for OffsetValue, not even an explicit nil
### GetContentHash

`func (o *V09SourceCheckpoint) GetContentHash() string`

GetContentHash returns the ContentHash field if non-nil, zero value otherwise.

### GetContentHashOk

`func (o *V09SourceCheckpoint) GetContentHashOk() (*string, bool)`

GetContentHashOk returns a tuple with the ContentHash field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContentHash

`func (o *V09SourceCheckpoint) SetContentHash(v string)`

SetContentHash sets ContentHash field to given value.

### HasContentHash

`func (o *V09SourceCheckpoint) HasContentHash() bool`

HasContentHash returns a boolean if a field has been set.

### SetContentHashNil

`func (o *V09SourceCheckpoint) SetContentHashNil(b bool)`

 SetContentHashNil sets the value for ContentHash to be an explicit nil

### UnsetContentHash
`func (o *V09SourceCheckpoint) UnsetContentHash()`

UnsetContentHash ensures that no value is present for ContentHash, not even an explicit nil
### GetMetadata

`func (o *V09SourceCheckpoint) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *V09SourceCheckpoint) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *V09SourceCheckpoint) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *V09SourceCheckpoint) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### GetUpdatedAt

`func (o *V09SourceCheckpoint) GetUpdatedAt() time.Time`

GetUpdatedAt returns the UpdatedAt field if non-nil, zero value otherwise.

### GetUpdatedAtOk

`func (o *V09SourceCheckpoint) GetUpdatedAtOk() (*time.Time, bool)`

GetUpdatedAtOk returns a tuple with the UpdatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpdatedAt

`func (o *V09SourceCheckpoint) SetUpdatedAt(v time.Time)`

SetUpdatedAt sets UpdatedAt field to given value.

### HasUpdatedAt

`func (o *V09SourceCheckpoint) HasUpdatedAt() bool`

HasUpdatedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
