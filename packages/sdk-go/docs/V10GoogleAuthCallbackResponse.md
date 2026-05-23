# V10GoogleAuthCallbackResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Account** | Pointer to [**V10GoogleAuthCallbackResponseAccount**](V10GoogleAuthCallbackResponseAccount.md) |  | [optional]
**Vault** | Pointer to [**V10GoogleAuthCallbackResponseVault**](V10GoogleAuthCallbackResponseVault.md) |  | [optional]
**Identity** | Pointer to [**V10GoogleAuthCallbackResponseIdentity**](V10GoogleAuthCallbackResponseIdentity.md) |  | [optional]
**Session** | Pointer to [**V10GoogleAuthCallbackResponseSession**](V10GoogleAuthCallbackResponseSession.md) |  | [optional]
**CsrfToken** | Pointer to **string** |  | [optional]
**CreatedNew** | Pointer to **bool** |  | [optional]

## Methods

### NewV10GoogleAuthCallbackResponse

`func NewV10GoogleAuthCallbackResponse() *V10GoogleAuthCallbackResponse`

NewV10GoogleAuthCallbackResponse instantiates a new V10GoogleAuthCallbackResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV10GoogleAuthCallbackResponseWithDefaults

`func NewV10GoogleAuthCallbackResponseWithDefaults() *V10GoogleAuthCallbackResponse`

NewV10GoogleAuthCallbackResponseWithDefaults instantiates a new V10GoogleAuthCallbackResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAccount

`func (o *V10GoogleAuthCallbackResponse) GetAccount() V10GoogleAuthCallbackResponseAccount`

GetAccount returns the Account field if non-nil, zero value otherwise.

### GetAccountOk

`func (o *V10GoogleAuthCallbackResponse) GetAccountOk() (*V10GoogleAuthCallbackResponseAccount, bool)`

GetAccountOk returns a tuple with the Account field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccount

`func (o *V10GoogleAuthCallbackResponse) SetAccount(v V10GoogleAuthCallbackResponseAccount)`

SetAccount sets Account field to given value.

### HasAccount

`func (o *V10GoogleAuthCallbackResponse) HasAccount() bool`

HasAccount returns a boolean if a field has been set.

### GetVault

`func (o *V10GoogleAuthCallbackResponse) GetVault() V10GoogleAuthCallbackResponseVault`

GetVault returns the Vault field if non-nil, zero value otherwise.

### GetVaultOk

`func (o *V10GoogleAuthCallbackResponse) GetVaultOk() (*V10GoogleAuthCallbackResponseVault, bool)`

GetVaultOk returns a tuple with the Vault field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVault

`func (o *V10GoogleAuthCallbackResponse) SetVault(v V10GoogleAuthCallbackResponseVault)`

SetVault sets Vault field to given value.

### HasVault

`func (o *V10GoogleAuthCallbackResponse) HasVault() bool`

HasVault returns a boolean if a field has been set.

### GetIdentity

`func (o *V10GoogleAuthCallbackResponse) GetIdentity() V10GoogleAuthCallbackResponseIdentity`

GetIdentity returns the Identity field if non-nil, zero value otherwise.

### GetIdentityOk

`func (o *V10GoogleAuthCallbackResponse) GetIdentityOk() (*V10GoogleAuthCallbackResponseIdentity, bool)`

GetIdentityOk returns a tuple with the Identity field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIdentity

`func (o *V10GoogleAuthCallbackResponse) SetIdentity(v V10GoogleAuthCallbackResponseIdentity)`

SetIdentity sets Identity field to given value.

### HasIdentity

`func (o *V10GoogleAuthCallbackResponse) HasIdentity() bool`

HasIdentity returns a boolean if a field has been set.

### GetSession

`func (o *V10GoogleAuthCallbackResponse) GetSession() V10GoogleAuthCallbackResponseSession`

GetSession returns the Session field if non-nil, zero value otherwise.

### GetSessionOk

`func (o *V10GoogleAuthCallbackResponse) GetSessionOk() (*V10GoogleAuthCallbackResponseSession, bool)`

GetSessionOk returns a tuple with the Session field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSession

`func (o *V10GoogleAuthCallbackResponse) SetSession(v V10GoogleAuthCallbackResponseSession)`

SetSession sets Session field to given value.

### HasSession

`func (o *V10GoogleAuthCallbackResponse) HasSession() bool`

HasSession returns a boolean if a field has been set.

### GetCsrfToken

`func (o *V10GoogleAuthCallbackResponse) GetCsrfToken() string`

GetCsrfToken returns the CsrfToken field if non-nil, zero value otherwise.

### GetCsrfTokenOk

`func (o *V10GoogleAuthCallbackResponse) GetCsrfTokenOk() (*string, bool)`

GetCsrfTokenOk returns a tuple with the CsrfToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCsrfToken

`func (o *V10GoogleAuthCallbackResponse) SetCsrfToken(v string)`

SetCsrfToken sets CsrfToken field to given value.

### HasCsrfToken

`func (o *V10GoogleAuthCallbackResponse) HasCsrfToken() bool`

HasCsrfToken returns a boolean if a field has been set.

### GetCreatedNew

`func (o *V10GoogleAuthCallbackResponse) GetCreatedNew() bool`

GetCreatedNew returns the CreatedNew field if non-nil, zero value otherwise.

### GetCreatedNewOk

`func (o *V10GoogleAuthCallbackResponse) GetCreatedNewOk() (*bool, bool)`

GetCreatedNewOk returns a tuple with the CreatedNew field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedNew

`func (o *V10GoogleAuthCallbackResponse) SetCreatedNew(v bool)`

SetCreatedNew sets CreatedNew field to given value.

### HasCreatedNew

`func (o *V10GoogleAuthCallbackResponse) HasCreatedNew() bool`

HasCreatedNew returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
