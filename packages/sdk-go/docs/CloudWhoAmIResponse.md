# CloudWhoAmIResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Account** | Pointer to [**CloudAccount**](CloudAccount.md) |  | [optional]
**Vault** | Pointer to [**CloudVault**](CloudVault.md) |  | [optional]
**Device** | Pointer to [**CloudDevice**](CloudDevice.md) |  | [optional]
**TokenKind** | Pointer to **string** |  | [optional]
**Scopes** | Pointer to **[]string** |  | [optional]

## Methods

### NewCloudWhoAmIResponse

`func NewCloudWhoAmIResponse() *CloudWhoAmIResponse`

NewCloudWhoAmIResponse instantiates a new CloudWhoAmIResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCloudWhoAmIResponseWithDefaults

`func NewCloudWhoAmIResponseWithDefaults() *CloudWhoAmIResponse`

NewCloudWhoAmIResponseWithDefaults instantiates a new CloudWhoAmIResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAccount

`func (o *CloudWhoAmIResponse) GetAccount() CloudAccount`

GetAccount returns the Account field if non-nil, zero value otherwise.

### GetAccountOk

`func (o *CloudWhoAmIResponse) GetAccountOk() (*CloudAccount, bool)`

GetAccountOk returns a tuple with the Account field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccount

`func (o *CloudWhoAmIResponse) SetAccount(v CloudAccount)`

SetAccount sets Account field to given value.

### HasAccount

`func (o *CloudWhoAmIResponse) HasAccount() bool`

HasAccount returns a boolean if a field has been set.

### GetVault

`func (o *CloudWhoAmIResponse) GetVault() CloudVault`

GetVault returns the Vault field if non-nil, zero value otherwise.

### GetVaultOk

`func (o *CloudWhoAmIResponse) GetVaultOk() (*CloudVault, bool)`

GetVaultOk returns a tuple with the Vault field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVault

`func (o *CloudWhoAmIResponse) SetVault(v CloudVault)`

SetVault sets Vault field to given value.

### HasVault

`func (o *CloudWhoAmIResponse) HasVault() bool`

HasVault returns a boolean if a field has been set.

### GetDevice

`func (o *CloudWhoAmIResponse) GetDevice() CloudDevice`

GetDevice returns the Device field if non-nil, zero value otherwise.

### GetDeviceOk

`func (o *CloudWhoAmIResponse) GetDeviceOk() (*CloudDevice, bool)`

GetDeviceOk returns a tuple with the Device field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDevice

`func (o *CloudWhoAmIResponse) SetDevice(v CloudDevice)`

SetDevice sets Device field to given value.

### HasDevice

`func (o *CloudWhoAmIResponse) HasDevice() bool`

HasDevice returns a boolean if a field has been set.

### GetTokenKind

`func (o *CloudWhoAmIResponse) GetTokenKind() string`

GetTokenKind returns the TokenKind field if non-nil, zero value otherwise.

### GetTokenKindOk

`func (o *CloudWhoAmIResponse) GetTokenKindOk() (*string, bool)`

GetTokenKindOk returns a tuple with the TokenKind field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokenKind

`func (o *CloudWhoAmIResponse) SetTokenKind(v string)`

SetTokenKind sets TokenKind field to given value.

### HasTokenKind

`func (o *CloudWhoAmIResponse) HasTokenKind() bool`

HasTokenKind returns a boolean if a field has been set.

### GetScopes

`func (o *CloudWhoAmIResponse) GetScopes() []string`

GetScopes returns the Scopes field if non-nil, zero value otherwise.

### GetScopesOk

`func (o *CloudWhoAmIResponse) GetScopesOk() (*[]string, bool)`

GetScopesOk returns a tuple with the Scopes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScopes

`func (o *CloudWhoAmIResponse) SetScopes(v []string)`

SetScopes sets Scopes field to given value.

### HasScopes

`func (o *CloudWhoAmIResponse) HasScopes() bool`

HasScopes returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
