# V10MeResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Account** | Pointer to [**V10GoogleAuthCallbackResponseAccount**](V10GoogleAuthCallbackResponseAccount.md) |  | [optional]
**Vault** | Pointer to [**V10MeResponseVault**](V10MeResponseVault.md) |  | [optional]
**Identity** | Pointer to **map[string]interface{}** |  | [optional]
**Session** | Pointer to [**V10MeResponseSession**](V10MeResponseSession.md) |  | [optional]

## Methods

### NewV10MeResponse

`func NewV10MeResponse() *V10MeResponse`

NewV10MeResponse instantiates a new V10MeResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV10MeResponseWithDefaults

`func NewV10MeResponseWithDefaults() *V10MeResponse`

NewV10MeResponseWithDefaults instantiates a new V10MeResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAccount

`func (o *V10MeResponse) GetAccount() V10GoogleAuthCallbackResponseAccount`

GetAccount returns the Account field if non-nil, zero value otherwise.

### GetAccountOk

`func (o *V10MeResponse) GetAccountOk() (*V10GoogleAuthCallbackResponseAccount, bool)`

GetAccountOk returns a tuple with the Account field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccount

`func (o *V10MeResponse) SetAccount(v V10GoogleAuthCallbackResponseAccount)`

SetAccount sets Account field to given value.

### HasAccount

`func (o *V10MeResponse) HasAccount() bool`

HasAccount returns a boolean if a field has been set.

### GetVault

`func (o *V10MeResponse) GetVault() V10MeResponseVault`

GetVault returns the Vault field if non-nil, zero value otherwise.

### GetVaultOk

`func (o *V10MeResponse) GetVaultOk() (*V10MeResponseVault, bool)`

GetVaultOk returns a tuple with the Vault field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVault

`func (o *V10MeResponse) SetVault(v V10MeResponseVault)`

SetVault sets Vault field to given value.

### HasVault

`func (o *V10MeResponse) HasVault() bool`

HasVault returns a boolean if a field has been set.

### GetIdentity

`func (o *V10MeResponse) GetIdentity() map[string]interface{}`

GetIdentity returns the Identity field if non-nil, zero value otherwise.

### GetIdentityOk

`func (o *V10MeResponse) GetIdentityOk() (*map[string]interface{}, bool)`

GetIdentityOk returns a tuple with the Identity field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIdentity

`func (o *V10MeResponse) SetIdentity(v map[string]interface{})`

SetIdentity sets Identity field to given value.

### HasIdentity

`func (o *V10MeResponse) HasIdentity() bool`

HasIdentity returns a boolean if a field has been set.

### SetIdentityNil

`func (o *V10MeResponse) SetIdentityNil(b bool)`

 SetIdentityNil sets the value for Identity to be an explicit nil

### UnsetIdentity
`func (o *V10MeResponse) UnsetIdentity()`

UnsetIdentity ensures that no value is present for Identity, not even an explicit nil
### GetSession

`func (o *V10MeResponse) GetSession() V10MeResponseSession`

GetSession returns the Session field if non-nil, zero value otherwise.

### GetSessionOk

`func (o *V10MeResponse) GetSessionOk() (*V10MeResponseSession, bool)`

GetSessionOk returns a tuple with the Session field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSession

`func (o *V10MeResponse) SetSession(v V10MeResponseSession)`

SetSession sets Session field to given value.

### HasSession

`func (o *V10MeResponse) HasSession() bool`

HasSession returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
