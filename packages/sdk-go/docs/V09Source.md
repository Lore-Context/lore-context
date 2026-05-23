# V09Source

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**DeviceId** | Pointer to **NullableString** |  | [optional]
**SourceType** | Pointer to **string** |  | [optional]
**SourceProvider** | Pointer to **NullableString** |  | [optional]
**SourceRef** | Pointer to **NullableString** |  | [optional]
**DisplayName** | Pointer to **NullableString** |  | [optional]
**RawArchivePolicy** | Pointer to **string** |  | [optional]
**Status** | Pointer to **string** |  | [optional]
**PausedAt** | Pointer to **NullableTime** |  | [optional]
**LastHeartbeatAt** | Pointer to **NullableTime** |  | [optional]
**LastError** | Pointer to **NullableString** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]
**CreatedAt** | Pointer to **time.Time** |  | [optional]
**UpdatedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewV09Source

`func NewV09Source() *V09Source`

NewV09Source instantiates a new V09Source object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09SourceWithDefaults

`func NewV09SourceWithDefaults() *V09Source`

NewV09SourceWithDefaults instantiates a new V09Source object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *V09Source) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *V09Source) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *V09Source) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *V09Source) HasId() bool`

HasId returns a boolean if a field has been set.

### GetVaultId

`func (o *V09Source) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *V09Source) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *V09Source) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *V09Source) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetDeviceId

`func (o *V09Source) GetDeviceId() string`

GetDeviceId returns the DeviceId field if non-nil, zero value otherwise.

### GetDeviceIdOk

`func (o *V09Source) GetDeviceIdOk() (*string, bool)`

GetDeviceIdOk returns a tuple with the DeviceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeviceId

`func (o *V09Source) SetDeviceId(v string)`

SetDeviceId sets DeviceId field to given value.

### HasDeviceId

`func (o *V09Source) HasDeviceId() bool`

HasDeviceId returns a boolean if a field has been set.

### SetDeviceIdNil

`func (o *V09Source) SetDeviceIdNil(b bool)`

 SetDeviceIdNil sets the value for DeviceId to be an explicit nil

### UnsetDeviceId
`func (o *V09Source) UnsetDeviceId()`

UnsetDeviceId ensures that no value is present for DeviceId, not even an explicit nil
### GetSourceType

`func (o *V09Source) GetSourceType() string`

GetSourceType returns the SourceType field if non-nil, zero value otherwise.

### GetSourceTypeOk

`func (o *V09Source) GetSourceTypeOk() (*string, bool)`

GetSourceTypeOk returns a tuple with the SourceType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceType

`func (o *V09Source) SetSourceType(v string)`

SetSourceType sets SourceType field to given value.

### HasSourceType

`func (o *V09Source) HasSourceType() bool`

HasSourceType returns a boolean if a field has been set.

### GetSourceProvider

`func (o *V09Source) GetSourceProvider() string`

GetSourceProvider returns the SourceProvider field if non-nil, zero value otherwise.

### GetSourceProviderOk

`func (o *V09Source) GetSourceProviderOk() (*string, bool)`

GetSourceProviderOk returns a tuple with the SourceProvider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceProvider

`func (o *V09Source) SetSourceProvider(v string)`

SetSourceProvider sets SourceProvider field to given value.

### HasSourceProvider

`func (o *V09Source) HasSourceProvider() bool`

HasSourceProvider returns a boolean if a field has been set.

### SetSourceProviderNil

`func (o *V09Source) SetSourceProviderNil(b bool)`

 SetSourceProviderNil sets the value for SourceProvider to be an explicit nil

### UnsetSourceProvider
`func (o *V09Source) UnsetSourceProvider()`

UnsetSourceProvider ensures that no value is present for SourceProvider, not even an explicit nil
### GetSourceRef

`func (o *V09Source) GetSourceRef() string`

GetSourceRef returns the SourceRef field if non-nil, zero value otherwise.

### GetSourceRefOk

`func (o *V09Source) GetSourceRefOk() (*string, bool)`

GetSourceRefOk returns a tuple with the SourceRef field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceRef

`func (o *V09Source) SetSourceRef(v string)`

SetSourceRef sets SourceRef field to given value.

### HasSourceRef

`func (o *V09Source) HasSourceRef() bool`

HasSourceRef returns a boolean if a field has been set.

### SetSourceRefNil

`func (o *V09Source) SetSourceRefNil(b bool)`

 SetSourceRefNil sets the value for SourceRef to be an explicit nil

### UnsetSourceRef
`func (o *V09Source) UnsetSourceRef()`

UnsetSourceRef ensures that no value is present for SourceRef, not even an explicit nil
### GetDisplayName

`func (o *V09Source) GetDisplayName() string`

GetDisplayName returns the DisplayName field if non-nil, zero value otherwise.

### GetDisplayNameOk

`func (o *V09Source) GetDisplayNameOk() (*string, bool)`

GetDisplayNameOk returns a tuple with the DisplayName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisplayName

`func (o *V09Source) SetDisplayName(v string)`

SetDisplayName sets DisplayName field to given value.

### HasDisplayName

`func (o *V09Source) HasDisplayName() bool`

HasDisplayName returns a boolean if a field has been set.

### SetDisplayNameNil

`func (o *V09Source) SetDisplayNameNil(b bool)`

 SetDisplayNameNil sets the value for DisplayName to be an explicit nil

### UnsetDisplayName
`func (o *V09Source) UnsetDisplayName()`

UnsetDisplayName ensures that no value is present for DisplayName, not even an explicit nil
### GetRawArchivePolicy

`func (o *V09Source) GetRawArchivePolicy() string`

GetRawArchivePolicy returns the RawArchivePolicy field if non-nil, zero value otherwise.

### GetRawArchivePolicyOk

`func (o *V09Source) GetRawArchivePolicyOk() (*string, bool)`

GetRawArchivePolicyOk returns a tuple with the RawArchivePolicy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRawArchivePolicy

`func (o *V09Source) SetRawArchivePolicy(v string)`

SetRawArchivePolicy sets RawArchivePolicy field to given value.

### HasRawArchivePolicy

`func (o *V09Source) HasRawArchivePolicy() bool`

HasRawArchivePolicy returns a boolean if a field has been set.

### GetStatus

`func (o *V09Source) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *V09Source) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *V09Source) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *V09Source) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetPausedAt

`func (o *V09Source) GetPausedAt() time.Time`

GetPausedAt returns the PausedAt field if non-nil, zero value otherwise.

### GetPausedAtOk

`func (o *V09Source) GetPausedAtOk() (*time.Time, bool)`

GetPausedAtOk returns a tuple with the PausedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPausedAt

`func (o *V09Source) SetPausedAt(v time.Time)`

SetPausedAt sets PausedAt field to given value.

### HasPausedAt

`func (o *V09Source) HasPausedAt() bool`

HasPausedAt returns a boolean if a field has been set.

### SetPausedAtNil

`func (o *V09Source) SetPausedAtNil(b bool)`

 SetPausedAtNil sets the value for PausedAt to be an explicit nil

### UnsetPausedAt
`func (o *V09Source) UnsetPausedAt()`

UnsetPausedAt ensures that no value is present for PausedAt, not even an explicit nil
### GetLastHeartbeatAt

`func (o *V09Source) GetLastHeartbeatAt() time.Time`

GetLastHeartbeatAt returns the LastHeartbeatAt field if non-nil, zero value otherwise.

### GetLastHeartbeatAtOk

`func (o *V09Source) GetLastHeartbeatAtOk() (*time.Time, bool)`

GetLastHeartbeatAtOk returns a tuple with the LastHeartbeatAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastHeartbeatAt

`func (o *V09Source) SetLastHeartbeatAt(v time.Time)`

SetLastHeartbeatAt sets LastHeartbeatAt field to given value.

### HasLastHeartbeatAt

`func (o *V09Source) HasLastHeartbeatAt() bool`

HasLastHeartbeatAt returns a boolean if a field has been set.

### SetLastHeartbeatAtNil

`func (o *V09Source) SetLastHeartbeatAtNil(b bool)`

 SetLastHeartbeatAtNil sets the value for LastHeartbeatAt to be an explicit nil

### UnsetLastHeartbeatAt
`func (o *V09Source) UnsetLastHeartbeatAt()`

UnsetLastHeartbeatAt ensures that no value is present for LastHeartbeatAt, not even an explicit nil
### GetLastError

`func (o *V09Source) GetLastError() string`

GetLastError returns the LastError field if non-nil, zero value otherwise.

### GetLastErrorOk

`func (o *V09Source) GetLastErrorOk() (*string, bool)`

GetLastErrorOk returns a tuple with the LastError field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastError

`func (o *V09Source) SetLastError(v string)`

SetLastError sets LastError field to given value.

### HasLastError

`func (o *V09Source) HasLastError() bool`

HasLastError returns a boolean if a field has been set.

### SetLastErrorNil

`func (o *V09Source) SetLastErrorNil(b bool)`

 SetLastErrorNil sets the value for LastError to be an explicit nil

### UnsetLastError
`func (o *V09Source) UnsetLastError()`

UnsetLastError ensures that no value is present for LastError, not even an explicit nil
### GetMetadata

`func (o *V09Source) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *V09Source) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *V09Source) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *V09Source) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### GetCreatedAt

`func (o *V09Source) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *V09Source) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *V09Source) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.

### HasCreatedAt

`func (o *V09Source) HasCreatedAt() bool`

HasCreatedAt returns a boolean if a field has been set.

### GetUpdatedAt

`func (o *V09Source) GetUpdatedAt() time.Time`

GetUpdatedAt returns the UpdatedAt field if non-nil, zero value otherwise.

### GetUpdatedAtOk

`func (o *V09Source) GetUpdatedAtOk() (*time.Time, bool)`

GetUpdatedAtOk returns a tuple with the UpdatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpdatedAt

`func (o *V09Source) SetUpdatedAt(v time.Time)`

SetUpdatedAt sets UpdatedAt field to given value.

### HasUpdatedAt

`func (o *V09Source) HasUpdatedAt() bool`

HasUpdatedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
