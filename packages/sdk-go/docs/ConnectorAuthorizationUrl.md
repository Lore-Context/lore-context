# ConnectorAuthorizationUrl

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Provider** | Pointer to **string** |  | [optional]
**AuthorizationUrl** | Pointer to **string** |  | [optional]
**State** | Pointer to **string** |  | [optional]
**Scopes** | Pointer to **[]string** |  | [optional]
**SignInScopes** | Pointer to **[]string** |  | [optional]
**FixtureBacked** | Pointer to **bool** |  | [optional]
**PrivateBeta** | Pointer to **bool** |  | [optional]
**CredentialStatus** | Pointer to **string** |  | [optional]
**CredentialEnv** | Pointer to **[]string** |  | [optional]
**MissingCredentialEnv** | Pointer to **[]string** |  | [optional]

## Methods

### NewConnectorAuthorizationUrl

`func NewConnectorAuthorizationUrl() *ConnectorAuthorizationUrl`

NewConnectorAuthorizationUrl instantiates a new ConnectorAuthorizationUrl object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorAuthorizationUrlWithDefaults

`func NewConnectorAuthorizationUrlWithDefaults() *ConnectorAuthorizationUrl`

NewConnectorAuthorizationUrlWithDefaults instantiates a new ConnectorAuthorizationUrl object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetProvider

`func (o *ConnectorAuthorizationUrl) GetProvider() string`

GetProvider returns the Provider field if non-nil, zero value otherwise.

### GetProviderOk

`func (o *ConnectorAuthorizationUrl) GetProviderOk() (*string, bool)`

GetProviderOk returns a tuple with the Provider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProvider

`func (o *ConnectorAuthorizationUrl) SetProvider(v string)`

SetProvider sets Provider field to given value.

### HasProvider

`func (o *ConnectorAuthorizationUrl) HasProvider() bool`

HasProvider returns a boolean if a field has been set.

### GetAuthorizationUrl

`func (o *ConnectorAuthorizationUrl) GetAuthorizationUrl() string`

GetAuthorizationUrl returns the AuthorizationUrl field if non-nil, zero value otherwise.

### GetAuthorizationUrlOk

`func (o *ConnectorAuthorizationUrl) GetAuthorizationUrlOk() (*string, bool)`

GetAuthorizationUrlOk returns a tuple with the AuthorizationUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuthorizationUrl

`func (o *ConnectorAuthorizationUrl) SetAuthorizationUrl(v string)`

SetAuthorizationUrl sets AuthorizationUrl field to given value.

### HasAuthorizationUrl

`func (o *ConnectorAuthorizationUrl) HasAuthorizationUrl() bool`

HasAuthorizationUrl returns a boolean if a field has been set.

### GetState

`func (o *ConnectorAuthorizationUrl) GetState() string`

GetState returns the State field if non-nil, zero value otherwise.

### GetStateOk

`func (o *ConnectorAuthorizationUrl) GetStateOk() (*string, bool)`

GetStateOk returns a tuple with the State field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetState

`func (o *ConnectorAuthorizationUrl) SetState(v string)`

SetState sets State field to given value.

### HasState

`func (o *ConnectorAuthorizationUrl) HasState() bool`

HasState returns a boolean if a field has been set.

### GetScopes

`func (o *ConnectorAuthorizationUrl) GetScopes() []string`

GetScopes returns the Scopes field if non-nil, zero value otherwise.

### GetScopesOk

`func (o *ConnectorAuthorizationUrl) GetScopesOk() (*[]string, bool)`

GetScopesOk returns a tuple with the Scopes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScopes

`func (o *ConnectorAuthorizationUrl) SetScopes(v []string)`

SetScopes sets Scopes field to given value.

### HasScopes

`func (o *ConnectorAuthorizationUrl) HasScopes() bool`

HasScopes returns a boolean if a field has been set.

### GetSignInScopes

`func (o *ConnectorAuthorizationUrl) GetSignInScopes() []string`

GetSignInScopes returns the SignInScopes field if non-nil, zero value otherwise.

### GetSignInScopesOk

`func (o *ConnectorAuthorizationUrl) GetSignInScopesOk() (*[]string, bool)`

GetSignInScopesOk returns a tuple with the SignInScopes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSignInScopes

`func (o *ConnectorAuthorizationUrl) SetSignInScopes(v []string)`

SetSignInScopes sets SignInScopes field to given value.

### HasSignInScopes

`func (o *ConnectorAuthorizationUrl) HasSignInScopes() bool`

HasSignInScopes returns a boolean if a field has been set.

### GetFixtureBacked

`func (o *ConnectorAuthorizationUrl) GetFixtureBacked() bool`

GetFixtureBacked returns the FixtureBacked field if non-nil, zero value otherwise.

### GetFixtureBackedOk

`func (o *ConnectorAuthorizationUrl) GetFixtureBackedOk() (*bool, bool)`

GetFixtureBackedOk returns a tuple with the FixtureBacked field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFixtureBacked

`func (o *ConnectorAuthorizationUrl) SetFixtureBacked(v bool)`

SetFixtureBacked sets FixtureBacked field to given value.

### HasFixtureBacked

`func (o *ConnectorAuthorizationUrl) HasFixtureBacked() bool`

HasFixtureBacked returns a boolean if a field has been set.

### GetPrivateBeta

`func (o *ConnectorAuthorizationUrl) GetPrivateBeta() bool`

GetPrivateBeta returns the PrivateBeta field if non-nil, zero value otherwise.

### GetPrivateBetaOk

`func (o *ConnectorAuthorizationUrl) GetPrivateBetaOk() (*bool, bool)`

GetPrivateBetaOk returns a tuple with the PrivateBeta field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrivateBeta

`func (o *ConnectorAuthorizationUrl) SetPrivateBeta(v bool)`

SetPrivateBeta sets PrivateBeta field to given value.

### HasPrivateBeta

`func (o *ConnectorAuthorizationUrl) HasPrivateBeta() bool`

HasPrivateBeta returns a boolean if a field has been set.

### GetCredentialStatus

`func (o *ConnectorAuthorizationUrl) GetCredentialStatus() string`

GetCredentialStatus returns the CredentialStatus field if non-nil, zero value otherwise.

### GetCredentialStatusOk

`func (o *ConnectorAuthorizationUrl) GetCredentialStatusOk() (*string, bool)`

GetCredentialStatusOk returns a tuple with the CredentialStatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCredentialStatus

`func (o *ConnectorAuthorizationUrl) SetCredentialStatus(v string)`

SetCredentialStatus sets CredentialStatus field to given value.

### HasCredentialStatus

`func (o *ConnectorAuthorizationUrl) HasCredentialStatus() bool`

HasCredentialStatus returns a boolean if a field has been set.

### GetCredentialEnv

`func (o *ConnectorAuthorizationUrl) GetCredentialEnv() []string`

GetCredentialEnv returns the CredentialEnv field if non-nil, zero value otherwise.

### GetCredentialEnvOk

`func (o *ConnectorAuthorizationUrl) GetCredentialEnvOk() (*[]string, bool)`

GetCredentialEnvOk returns a tuple with the CredentialEnv field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCredentialEnv

`func (o *ConnectorAuthorizationUrl) SetCredentialEnv(v []string)`

SetCredentialEnv sets CredentialEnv field to given value.

### HasCredentialEnv

`func (o *ConnectorAuthorizationUrl) HasCredentialEnv() bool`

HasCredentialEnv returns a boolean if a field has been set.

### GetMissingCredentialEnv

`func (o *ConnectorAuthorizationUrl) GetMissingCredentialEnv() []string`

GetMissingCredentialEnv returns the MissingCredentialEnv field if non-nil, zero value otherwise.

### GetMissingCredentialEnvOk

`func (o *ConnectorAuthorizationUrl) GetMissingCredentialEnvOk() (*[]string, bool)`

GetMissingCredentialEnvOk returns a tuple with the MissingCredentialEnv field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMissingCredentialEnv

`func (o *ConnectorAuthorizationUrl) SetMissingCredentialEnv(v []string)`

SetMissingCredentialEnv sets MissingCredentialEnv field to given value.

### HasMissingCredentialEnv

`func (o *ConnectorAuthorizationUrl) HasMissingCredentialEnv() bool`

HasMissingCredentialEnv returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
