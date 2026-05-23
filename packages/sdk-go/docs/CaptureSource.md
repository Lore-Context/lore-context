# CaptureSource

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**DeviceId** | Pointer to **string** |  | [optional]
**SourceType** | Pointer to **string** |  | [optional]
**SourceProvider** | Pointer to **NullableString** |  | [optional]
**SourceRef** | Pointer to **NullableString** |  | [optional]
**Status** | Pointer to **string** |  | [optional]
**LastHeartbeatAt** | Pointer to **time.Time** |  | [optional]
**LastError** | Pointer to **NullableString** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]
**CreatedAt** | Pointer to **time.Time** |  | [optional]
**UpdatedAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewCaptureSource

`func NewCaptureSource() *CaptureSource`

NewCaptureSource instantiates a new CaptureSource object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCaptureSourceWithDefaults

`func NewCaptureSourceWithDefaults() *CaptureSource`

NewCaptureSourceWithDefaults instantiates a new CaptureSource object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *CaptureSource) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *CaptureSource) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *CaptureSource) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *CaptureSource) HasId() bool`

HasId returns a boolean if a field has been set.

### GetVaultId

`func (o *CaptureSource) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *CaptureSource) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *CaptureSource) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *CaptureSource) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetDeviceId

`func (o *CaptureSource) GetDeviceId() string`

GetDeviceId returns the DeviceId field if non-nil, zero value otherwise.

### GetDeviceIdOk

`func (o *CaptureSource) GetDeviceIdOk() (*string, bool)`

GetDeviceIdOk returns a tuple with the DeviceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeviceId

`func (o *CaptureSource) SetDeviceId(v string)`

SetDeviceId sets DeviceId field to given value.

### HasDeviceId

`func (o *CaptureSource) HasDeviceId() bool`

HasDeviceId returns a boolean if a field has been set.

### GetSourceType

`func (o *CaptureSource) GetSourceType() string`

GetSourceType returns the SourceType field if non-nil, zero value otherwise.

### GetSourceTypeOk

`func (o *CaptureSource) GetSourceTypeOk() (*string, bool)`

GetSourceTypeOk returns a tuple with the SourceType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceType

`func (o *CaptureSource) SetSourceType(v string)`

SetSourceType sets SourceType field to given value.

### HasSourceType

`func (o *CaptureSource) HasSourceType() bool`

HasSourceType returns a boolean if a field has been set.

### GetSourceProvider

`func (o *CaptureSource) GetSourceProvider() string`

GetSourceProvider returns the SourceProvider field if non-nil, zero value otherwise.

### GetSourceProviderOk

`func (o *CaptureSource) GetSourceProviderOk() (*string, bool)`

GetSourceProviderOk returns a tuple with the SourceProvider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceProvider

`func (o *CaptureSource) SetSourceProvider(v string)`

SetSourceProvider sets SourceProvider field to given value.

### HasSourceProvider

`func (o *CaptureSource) HasSourceProvider() bool`

HasSourceProvider returns a boolean if a field has been set.

### SetSourceProviderNil

`func (o *CaptureSource) SetSourceProviderNil(b bool)`

 SetSourceProviderNil sets the value for SourceProvider to be an explicit nil

### UnsetSourceProvider
`func (o *CaptureSource) UnsetSourceProvider()`

UnsetSourceProvider ensures that no value is present for SourceProvider, not even an explicit nil
### GetSourceRef

`func (o *CaptureSource) GetSourceRef() string`

GetSourceRef returns the SourceRef field if non-nil, zero value otherwise.

### GetSourceRefOk

`func (o *CaptureSource) GetSourceRefOk() (*string, bool)`

GetSourceRefOk returns a tuple with the SourceRef field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceRef

`func (o *CaptureSource) SetSourceRef(v string)`

SetSourceRef sets SourceRef field to given value.

### HasSourceRef

`func (o *CaptureSource) HasSourceRef() bool`

HasSourceRef returns a boolean if a field has been set.

### SetSourceRefNil

`func (o *CaptureSource) SetSourceRefNil(b bool)`

 SetSourceRefNil sets the value for SourceRef to be an explicit nil

### UnsetSourceRef
`func (o *CaptureSource) UnsetSourceRef()`

UnsetSourceRef ensures that no value is present for SourceRef, not even an explicit nil
### GetStatus

`func (o *CaptureSource) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *CaptureSource) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *CaptureSource) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *CaptureSource) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetLastHeartbeatAt

`func (o *CaptureSource) GetLastHeartbeatAt() time.Time`

GetLastHeartbeatAt returns the LastHeartbeatAt field if non-nil, zero value otherwise.

### GetLastHeartbeatAtOk

`func (o *CaptureSource) GetLastHeartbeatAtOk() (*time.Time, bool)`

GetLastHeartbeatAtOk returns a tuple with the LastHeartbeatAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastHeartbeatAt

`func (o *CaptureSource) SetLastHeartbeatAt(v time.Time)`

SetLastHeartbeatAt sets LastHeartbeatAt field to given value.

### HasLastHeartbeatAt

`func (o *CaptureSource) HasLastHeartbeatAt() bool`

HasLastHeartbeatAt returns a boolean if a field has been set.

### GetLastError

`func (o *CaptureSource) GetLastError() string`

GetLastError returns the LastError field if non-nil, zero value otherwise.

### GetLastErrorOk

`func (o *CaptureSource) GetLastErrorOk() (*string, bool)`

GetLastErrorOk returns a tuple with the LastError field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastError

`func (o *CaptureSource) SetLastError(v string)`

SetLastError sets LastError field to given value.

### HasLastError

`func (o *CaptureSource) HasLastError() bool`

HasLastError returns a boolean if a field has been set.

### SetLastErrorNil

`func (o *CaptureSource) SetLastErrorNil(b bool)`

 SetLastErrorNil sets the value for LastError to be an explicit nil

### UnsetLastError
`func (o *CaptureSource) UnsetLastError()`

UnsetLastError ensures that no value is present for LastError, not even an explicit nil
### GetMetadata

`func (o *CaptureSource) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *CaptureSource) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *CaptureSource) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *CaptureSource) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### GetCreatedAt

`func (o *CaptureSource) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *CaptureSource) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *CaptureSource) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.

### HasCreatedAt

`func (o *CaptureSource) HasCreatedAt() bool`

HasCreatedAt returns a boolean if a field has been set.

### GetUpdatedAt

`func (o *CaptureSource) GetUpdatedAt() time.Time`

GetUpdatedAt returns the UpdatedAt field if non-nil, zero value otherwise.

### GetUpdatedAtOk

`func (o *CaptureSource) GetUpdatedAtOk() (*time.Time, bool)`

GetUpdatedAtOk returns a tuple with the UpdatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpdatedAt

`func (o *CaptureSource) SetUpdatedAt(v time.Time)`

SetUpdatedAt sets UpdatedAt field to given value.

### HasUpdatedAt

`func (o *CaptureSource) HasUpdatedAt() bool`

HasUpdatedAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
