# V09SourceRegisterRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SourceId** | Pointer to **string** |  | [optional]
**SourceType** | Pointer to **string** |  | [optional]
**SourceProvider** | **string** |  |
**SourceRef** | Pointer to **string** |  | [optional]
**DisplayName** | Pointer to **string** |  | [optional]
**RawArchivePolicy** | Pointer to **string** |  | [optional]
**Permissions** | Pointer to [**[]V09SourcePermissionEnvelope**](V09SourcePermissionEnvelope.md) |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewV09SourceRegisterRequest

`func NewV09SourceRegisterRequest(sourceProvider string, ) *V09SourceRegisterRequest`

NewV09SourceRegisterRequest instantiates a new V09SourceRegisterRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09SourceRegisterRequestWithDefaults

`func NewV09SourceRegisterRequestWithDefaults() *V09SourceRegisterRequest`

NewV09SourceRegisterRequestWithDefaults instantiates a new V09SourceRegisterRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSourceId

`func (o *V09SourceRegisterRequest) GetSourceId() string`

GetSourceId returns the SourceId field if non-nil, zero value otherwise.

### GetSourceIdOk

`func (o *V09SourceRegisterRequest) GetSourceIdOk() (*string, bool)`

GetSourceIdOk returns a tuple with the SourceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceId

`func (o *V09SourceRegisterRequest) SetSourceId(v string)`

SetSourceId sets SourceId field to given value.

### HasSourceId

`func (o *V09SourceRegisterRequest) HasSourceId() bool`

HasSourceId returns a boolean if a field has been set.

### GetSourceType

`func (o *V09SourceRegisterRequest) GetSourceType() string`

GetSourceType returns the SourceType field if non-nil, zero value otherwise.

### GetSourceTypeOk

`func (o *V09SourceRegisterRequest) GetSourceTypeOk() (*string, bool)`

GetSourceTypeOk returns a tuple with the SourceType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceType

`func (o *V09SourceRegisterRequest) SetSourceType(v string)`

SetSourceType sets SourceType field to given value.

### HasSourceType

`func (o *V09SourceRegisterRequest) HasSourceType() bool`

HasSourceType returns a boolean if a field has been set.

### GetSourceProvider

`func (o *V09SourceRegisterRequest) GetSourceProvider() string`

GetSourceProvider returns the SourceProvider field if non-nil, zero value otherwise.

### GetSourceProviderOk

`func (o *V09SourceRegisterRequest) GetSourceProviderOk() (*string, bool)`

GetSourceProviderOk returns a tuple with the SourceProvider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceProvider

`func (o *V09SourceRegisterRequest) SetSourceProvider(v string)`

SetSourceProvider sets SourceProvider field to given value.


### GetSourceRef

`func (o *V09SourceRegisterRequest) GetSourceRef() string`

GetSourceRef returns the SourceRef field if non-nil, zero value otherwise.

### GetSourceRefOk

`func (o *V09SourceRegisterRequest) GetSourceRefOk() (*string, bool)`

GetSourceRefOk returns a tuple with the SourceRef field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceRef

`func (o *V09SourceRegisterRequest) SetSourceRef(v string)`

SetSourceRef sets SourceRef field to given value.

### HasSourceRef

`func (o *V09SourceRegisterRequest) HasSourceRef() bool`

HasSourceRef returns a boolean if a field has been set.

### GetDisplayName

`func (o *V09SourceRegisterRequest) GetDisplayName() string`

GetDisplayName returns the DisplayName field if non-nil, zero value otherwise.

### GetDisplayNameOk

`func (o *V09SourceRegisterRequest) GetDisplayNameOk() (*string, bool)`

GetDisplayNameOk returns a tuple with the DisplayName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisplayName

`func (o *V09SourceRegisterRequest) SetDisplayName(v string)`

SetDisplayName sets DisplayName field to given value.

### HasDisplayName

`func (o *V09SourceRegisterRequest) HasDisplayName() bool`

HasDisplayName returns a boolean if a field has been set.

### GetRawArchivePolicy

`func (o *V09SourceRegisterRequest) GetRawArchivePolicy() string`

GetRawArchivePolicy returns the RawArchivePolicy field if non-nil, zero value otherwise.

### GetRawArchivePolicyOk

`func (o *V09SourceRegisterRequest) GetRawArchivePolicyOk() (*string, bool)`

GetRawArchivePolicyOk returns a tuple with the RawArchivePolicy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRawArchivePolicy

`func (o *V09SourceRegisterRequest) SetRawArchivePolicy(v string)`

SetRawArchivePolicy sets RawArchivePolicy field to given value.

### HasRawArchivePolicy

`func (o *V09SourceRegisterRequest) HasRawArchivePolicy() bool`

HasRawArchivePolicy returns a boolean if a field has been set.

### GetPermissions

`func (o *V09SourceRegisterRequest) GetPermissions() []V09SourcePermissionEnvelope`

GetPermissions returns the Permissions field if non-nil, zero value otherwise.

### GetPermissionsOk

`func (o *V09SourceRegisterRequest) GetPermissionsOk() (*[]V09SourcePermissionEnvelope, bool)`

GetPermissionsOk returns a tuple with the Permissions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermissions

`func (o *V09SourceRegisterRequest) SetPermissions(v []V09SourcePermissionEnvelope)`

SetPermissions sets Permissions field to given value.

### HasPermissions

`func (o *V09SourceRegisterRequest) HasPermissions() bool`

HasPermissions returns a boolean if a field has been set.

### GetMetadata

`func (o *V09SourceRegisterRequest) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *V09SourceRegisterRequest) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *V09SourceRegisterRequest) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *V09SourceRegisterRequest) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
