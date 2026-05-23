# CloudInstallTokenResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**InstallToken** | Pointer to **string** |  | [optional]
**TokenId** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**AccountId** | Pointer to **string** |  | [optional]
**ExpiresAt** | Pointer to **time.Time** |  | [optional]
**SingleUse** | Pointer to **bool** |  | [optional]

## Methods

### NewCloudInstallTokenResponse

`func NewCloudInstallTokenResponse() *CloudInstallTokenResponse`

NewCloudInstallTokenResponse instantiates a new CloudInstallTokenResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCloudInstallTokenResponseWithDefaults

`func NewCloudInstallTokenResponseWithDefaults() *CloudInstallTokenResponse`

NewCloudInstallTokenResponseWithDefaults instantiates a new CloudInstallTokenResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetInstallToken

`func (o *CloudInstallTokenResponse) GetInstallToken() string`

GetInstallToken returns the InstallToken field if non-nil, zero value otherwise.

### GetInstallTokenOk

`func (o *CloudInstallTokenResponse) GetInstallTokenOk() (*string, bool)`

GetInstallTokenOk returns a tuple with the InstallToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInstallToken

`func (o *CloudInstallTokenResponse) SetInstallToken(v string)`

SetInstallToken sets InstallToken field to given value.

### HasInstallToken

`func (o *CloudInstallTokenResponse) HasInstallToken() bool`

HasInstallToken returns a boolean if a field has been set.

### GetTokenId

`func (o *CloudInstallTokenResponse) GetTokenId() string`

GetTokenId returns the TokenId field if non-nil, zero value otherwise.

### GetTokenIdOk

`func (o *CloudInstallTokenResponse) GetTokenIdOk() (*string, bool)`

GetTokenIdOk returns a tuple with the TokenId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokenId

`func (o *CloudInstallTokenResponse) SetTokenId(v string)`

SetTokenId sets TokenId field to given value.

### HasTokenId

`func (o *CloudInstallTokenResponse) HasTokenId() bool`

HasTokenId returns a boolean if a field has been set.

### GetVaultId

`func (o *CloudInstallTokenResponse) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *CloudInstallTokenResponse) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *CloudInstallTokenResponse) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *CloudInstallTokenResponse) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetAccountId

`func (o *CloudInstallTokenResponse) GetAccountId() string`

GetAccountId returns the AccountId field if non-nil, zero value otherwise.

### GetAccountIdOk

`func (o *CloudInstallTokenResponse) GetAccountIdOk() (*string, bool)`

GetAccountIdOk returns a tuple with the AccountId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccountId

`func (o *CloudInstallTokenResponse) SetAccountId(v string)`

SetAccountId sets AccountId field to given value.

### HasAccountId

`func (o *CloudInstallTokenResponse) HasAccountId() bool`

HasAccountId returns a boolean if a field has been set.

### GetExpiresAt

`func (o *CloudInstallTokenResponse) GetExpiresAt() time.Time`

GetExpiresAt returns the ExpiresAt field if non-nil, zero value otherwise.

### GetExpiresAtOk

`func (o *CloudInstallTokenResponse) GetExpiresAtOk() (*time.Time, bool)`

GetExpiresAtOk returns a tuple with the ExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresAt

`func (o *CloudInstallTokenResponse) SetExpiresAt(v time.Time)`

SetExpiresAt sets ExpiresAt field to given value.

### HasExpiresAt

`func (o *CloudInstallTokenResponse) HasExpiresAt() bool`

HasExpiresAt returns a boolean if a field has been set.

### GetSingleUse

`func (o *CloudInstallTokenResponse) GetSingleUse() bool`

GetSingleUse returns the SingleUse field if non-nil, zero value otherwise.

### GetSingleUseOk

`func (o *CloudInstallTokenResponse) GetSingleUseOk() (*bool, bool)`

GetSingleUseOk returns a tuple with the SingleUse field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSingleUse

`func (o *CloudInstallTokenResponse) SetSingleUse(v bool)`

SetSingleUse sets SingleUse field to given value.

### HasSingleUse

`func (o *CloudInstallTokenResponse) HasSingleUse() bool`

HasSingleUse returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
