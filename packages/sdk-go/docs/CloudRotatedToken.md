# CloudRotatedToken

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TokenId** | Pointer to **string** |  | [optional]
**Token** | Pointer to **string** |  | [optional]
**Kind** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**AccountId** | Pointer to **string** |  | [optional]
**DeviceId** | Pointer to **string** |  | [optional]
**Scopes** | Pointer to **[]string** |  | [optional]
**ExpiresAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewCloudRotatedToken

`func NewCloudRotatedToken() *CloudRotatedToken`

NewCloudRotatedToken instantiates a new CloudRotatedToken object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCloudRotatedTokenWithDefaults

`func NewCloudRotatedTokenWithDefaults() *CloudRotatedToken`

NewCloudRotatedTokenWithDefaults instantiates a new CloudRotatedToken object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTokenId

`func (o *CloudRotatedToken) GetTokenId() string`

GetTokenId returns the TokenId field if non-nil, zero value otherwise.

### GetTokenIdOk

`func (o *CloudRotatedToken) GetTokenIdOk() (*string, bool)`

GetTokenIdOk returns a tuple with the TokenId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokenId

`func (o *CloudRotatedToken) SetTokenId(v string)`

SetTokenId sets TokenId field to given value.

### HasTokenId

`func (o *CloudRotatedToken) HasTokenId() bool`

HasTokenId returns a boolean if a field has been set.

### GetToken

`func (o *CloudRotatedToken) GetToken() string`

GetToken returns the Token field if non-nil, zero value otherwise.

### GetTokenOk

`func (o *CloudRotatedToken) GetTokenOk() (*string, bool)`

GetTokenOk returns a tuple with the Token field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToken

`func (o *CloudRotatedToken) SetToken(v string)`

SetToken sets Token field to given value.

### HasToken

`func (o *CloudRotatedToken) HasToken() bool`

HasToken returns a boolean if a field has been set.

### GetKind

`func (o *CloudRotatedToken) GetKind() string`

GetKind returns the Kind field if non-nil, zero value otherwise.

### GetKindOk

`func (o *CloudRotatedToken) GetKindOk() (*string, bool)`

GetKindOk returns a tuple with the Kind field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKind

`func (o *CloudRotatedToken) SetKind(v string)`

SetKind sets Kind field to given value.

### HasKind

`func (o *CloudRotatedToken) HasKind() bool`

HasKind returns a boolean if a field has been set.

### GetVaultId

`func (o *CloudRotatedToken) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *CloudRotatedToken) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *CloudRotatedToken) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *CloudRotatedToken) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetAccountId

`func (o *CloudRotatedToken) GetAccountId() string`

GetAccountId returns the AccountId field if non-nil, zero value otherwise.

### GetAccountIdOk

`func (o *CloudRotatedToken) GetAccountIdOk() (*string, bool)`

GetAccountIdOk returns a tuple with the AccountId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccountId

`func (o *CloudRotatedToken) SetAccountId(v string)`

SetAccountId sets AccountId field to given value.

### HasAccountId

`func (o *CloudRotatedToken) HasAccountId() bool`

HasAccountId returns a boolean if a field has been set.

### GetDeviceId

`func (o *CloudRotatedToken) GetDeviceId() string`

GetDeviceId returns the DeviceId field if non-nil, zero value otherwise.

### GetDeviceIdOk

`func (o *CloudRotatedToken) GetDeviceIdOk() (*string, bool)`

GetDeviceIdOk returns a tuple with the DeviceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeviceId

`func (o *CloudRotatedToken) SetDeviceId(v string)`

SetDeviceId sets DeviceId field to given value.

### HasDeviceId

`func (o *CloudRotatedToken) HasDeviceId() bool`

HasDeviceId returns a boolean if a field has been set.

### GetScopes

`func (o *CloudRotatedToken) GetScopes() []string`

GetScopes returns the Scopes field if non-nil, zero value otherwise.

### GetScopesOk

`func (o *CloudRotatedToken) GetScopesOk() (*[]string, bool)`

GetScopesOk returns a tuple with the Scopes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScopes

`func (o *CloudRotatedToken) SetScopes(v []string)`

SetScopes sets Scopes field to given value.

### HasScopes

`func (o *CloudRotatedToken) HasScopes() bool`

HasScopes returns a boolean if a field has been set.

### GetExpiresAt

`func (o *CloudRotatedToken) GetExpiresAt() time.Time`

GetExpiresAt returns the ExpiresAt field if non-nil, zero value otherwise.

### GetExpiresAtOk

`func (o *CloudRotatedToken) GetExpiresAtOk() (*time.Time, bool)`

GetExpiresAtOk returns a tuple with the ExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresAt

`func (o *CloudRotatedToken) SetExpiresAt(v time.Time)`

SetExpiresAt sets ExpiresAt field to given value.

### HasExpiresAt

`func (o *CloudRotatedToken) HasExpiresAt() bool`

HasExpiresAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
