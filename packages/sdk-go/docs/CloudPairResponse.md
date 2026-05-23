# CloudPairResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**DeviceId** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**AccountId** | Pointer to **string** |  | [optional]
**DeviceToken** | Pointer to **string** |  | [optional]
**DeviceTokenExpiresAt** | Pointer to **time.Time** |  | [optional]
**ServiceToken** | Pointer to **string** |  | [optional]
**ServiceTokenExpiresAt** | Pointer to **time.Time** |  | [optional]
**Scopes** | Pointer to [**CloudPairResponseScopes**](CloudPairResponseScopes.md) |  | [optional]

## Methods

### NewCloudPairResponse

`func NewCloudPairResponse() *CloudPairResponse`

NewCloudPairResponse instantiates a new CloudPairResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCloudPairResponseWithDefaults

`func NewCloudPairResponseWithDefaults() *CloudPairResponse`

NewCloudPairResponseWithDefaults instantiates a new CloudPairResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetDeviceId

`func (o *CloudPairResponse) GetDeviceId() string`

GetDeviceId returns the DeviceId field if non-nil, zero value otherwise.

### GetDeviceIdOk

`func (o *CloudPairResponse) GetDeviceIdOk() (*string, bool)`

GetDeviceIdOk returns a tuple with the DeviceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeviceId

`func (o *CloudPairResponse) SetDeviceId(v string)`

SetDeviceId sets DeviceId field to given value.

### HasDeviceId

`func (o *CloudPairResponse) HasDeviceId() bool`

HasDeviceId returns a boolean if a field has been set.

### GetVaultId

`func (o *CloudPairResponse) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *CloudPairResponse) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *CloudPairResponse) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *CloudPairResponse) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetAccountId

`func (o *CloudPairResponse) GetAccountId() string`

GetAccountId returns the AccountId field if non-nil, zero value otherwise.

### GetAccountIdOk

`func (o *CloudPairResponse) GetAccountIdOk() (*string, bool)`

GetAccountIdOk returns a tuple with the AccountId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccountId

`func (o *CloudPairResponse) SetAccountId(v string)`

SetAccountId sets AccountId field to given value.

### HasAccountId

`func (o *CloudPairResponse) HasAccountId() bool`

HasAccountId returns a boolean if a field has been set.

### GetDeviceToken

`func (o *CloudPairResponse) GetDeviceToken() string`

GetDeviceToken returns the DeviceToken field if non-nil, zero value otherwise.

### GetDeviceTokenOk

`func (o *CloudPairResponse) GetDeviceTokenOk() (*string, bool)`

GetDeviceTokenOk returns a tuple with the DeviceToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeviceToken

`func (o *CloudPairResponse) SetDeviceToken(v string)`

SetDeviceToken sets DeviceToken field to given value.

### HasDeviceToken

`func (o *CloudPairResponse) HasDeviceToken() bool`

HasDeviceToken returns a boolean if a field has been set.

### GetDeviceTokenExpiresAt

`func (o *CloudPairResponse) GetDeviceTokenExpiresAt() time.Time`

GetDeviceTokenExpiresAt returns the DeviceTokenExpiresAt field if non-nil, zero value otherwise.

### GetDeviceTokenExpiresAtOk

`func (o *CloudPairResponse) GetDeviceTokenExpiresAtOk() (*time.Time, bool)`

GetDeviceTokenExpiresAtOk returns a tuple with the DeviceTokenExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeviceTokenExpiresAt

`func (o *CloudPairResponse) SetDeviceTokenExpiresAt(v time.Time)`

SetDeviceTokenExpiresAt sets DeviceTokenExpiresAt field to given value.

### HasDeviceTokenExpiresAt

`func (o *CloudPairResponse) HasDeviceTokenExpiresAt() bool`

HasDeviceTokenExpiresAt returns a boolean if a field has been set.

### GetServiceToken

`func (o *CloudPairResponse) GetServiceToken() string`

GetServiceToken returns the ServiceToken field if non-nil, zero value otherwise.

### GetServiceTokenOk

`func (o *CloudPairResponse) GetServiceTokenOk() (*string, bool)`

GetServiceTokenOk returns a tuple with the ServiceToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetServiceToken

`func (o *CloudPairResponse) SetServiceToken(v string)`

SetServiceToken sets ServiceToken field to given value.

### HasServiceToken

`func (o *CloudPairResponse) HasServiceToken() bool`

HasServiceToken returns a boolean if a field has been set.

### GetServiceTokenExpiresAt

`func (o *CloudPairResponse) GetServiceTokenExpiresAt() time.Time`

GetServiceTokenExpiresAt returns the ServiceTokenExpiresAt field if non-nil, zero value otherwise.

### GetServiceTokenExpiresAtOk

`func (o *CloudPairResponse) GetServiceTokenExpiresAtOk() (*time.Time, bool)`

GetServiceTokenExpiresAtOk returns a tuple with the ServiceTokenExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetServiceTokenExpiresAt

`func (o *CloudPairResponse) SetServiceTokenExpiresAt(v time.Time)`

SetServiceTokenExpiresAt sets ServiceTokenExpiresAt field to given value.

### HasServiceTokenExpiresAt

`func (o *CloudPairResponse) HasServiceTokenExpiresAt() bool`

HasServiceTokenExpiresAt returns a boolean if a field has been set.

### GetScopes

`func (o *CloudPairResponse) GetScopes() CloudPairResponseScopes`

GetScopes returns the Scopes field if non-nil, zero value otherwise.

### GetScopesOk

`func (o *CloudPairResponse) GetScopesOk() (*CloudPairResponseScopes, bool)`

GetScopesOk returns a tuple with the Scopes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScopes

`func (o *CloudPairResponse) SetScopes(v CloudPairResponseScopes)`

SetScopes sets Scopes field to given value.

### HasScopes

`func (o *CloudPairResponse) HasScopes() bool`

HasScopes returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
