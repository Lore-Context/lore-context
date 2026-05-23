# V09SourcePermissionEnvelope

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**PermissionType** | **string** |  |
**Scope** | Pointer to **string** |  | [optional]
**Value** | **string** |  |
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewV09SourcePermissionEnvelope

`func NewV09SourcePermissionEnvelope(permissionType string, value string, ) *V09SourcePermissionEnvelope`

NewV09SourcePermissionEnvelope instantiates a new V09SourcePermissionEnvelope object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09SourcePermissionEnvelopeWithDefaults

`func NewV09SourcePermissionEnvelopeWithDefaults() *V09SourcePermissionEnvelope`

NewV09SourcePermissionEnvelopeWithDefaults instantiates a new V09SourcePermissionEnvelope object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetPermissionType

`func (o *V09SourcePermissionEnvelope) GetPermissionType() string`

GetPermissionType returns the PermissionType field if non-nil, zero value otherwise.

### GetPermissionTypeOk

`func (o *V09SourcePermissionEnvelope) GetPermissionTypeOk() (*string, bool)`

GetPermissionTypeOk returns a tuple with the PermissionType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermissionType

`func (o *V09SourcePermissionEnvelope) SetPermissionType(v string)`

SetPermissionType sets PermissionType field to given value.


### GetScope

`func (o *V09SourcePermissionEnvelope) GetScope() string`

GetScope returns the Scope field if non-nil, zero value otherwise.

### GetScopeOk

`func (o *V09SourcePermissionEnvelope) GetScopeOk() (*string, bool)`

GetScopeOk returns a tuple with the Scope field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScope

`func (o *V09SourcePermissionEnvelope) SetScope(v string)`

SetScope sets Scope field to given value.

### HasScope

`func (o *V09SourcePermissionEnvelope) HasScope() bool`

HasScope returns a boolean if a field has been set.

### GetValue

`func (o *V09SourcePermissionEnvelope) GetValue() string`

GetValue returns the Value field if non-nil, zero value otherwise.

### GetValueOk

`func (o *V09SourcePermissionEnvelope) GetValueOk() (*string, bool)`

GetValueOk returns a tuple with the Value field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetValue

`func (o *V09SourcePermissionEnvelope) SetValue(v string)`

SetValue sets Value field to given value.


### GetMetadata

`func (o *V09SourcePermissionEnvelope) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *V09SourcePermissionEnvelope) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *V09SourcePermissionEnvelope) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *V09SourcePermissionEnvelope) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
