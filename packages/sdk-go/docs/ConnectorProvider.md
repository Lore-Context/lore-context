# ConnectorProvider

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Provider** | Pointer to **string** |  | [optional]
**Label** | Pointer to **string** |  | [optional]
**Auth** | Pointer to **interface{}** |  | [optional]
**LiveCredentials** | Pointer to **bool** |  | [optional]
**PrivateBeta** | Pointer to **bool** |  | [optional]
**CredentialStatus** | Pointer to **string** |  | [optional]
**CredentialEnv** | Pointer to **[]string** |  | [optional]
**MissingCredentialEnv** | Pointer to **[]string** |  | [optional]
**SignInScopes** | Pointer to **[]string** |  | [optional]
**Scopes** | Pointer to **[]string** |  | [optional]
**FixtureBacked** | Pointer to **bool** |  | [optional]

## Methods

### NewConnectorProvider

`func NewConnectorProvider() *ConnectorProvider`

NewConnectorProvider instantiates a new ConnectorProvider object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorProviderWithDefaults

`func NewConnectorProviderWithDefaults() *ConnectorProvider`

NewConnectorProviderWithDefaults instantiates a new ConnectorProvider object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetProvider

`func (o *ConnectorProvider) GetProvider() string`

GetProvider returns the Provider field if non-nil, zero value otherwise.

### GetProviderOk

`func (o *ConnectorProvider) GetProviderOk() (*string, bool)`

GetProviderOk returns a tuple with the Provider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProvider

`func (o *ConnectorProvider) SetProvider(v string)`

SetProvider sets Provider field to given value.

### HasProvider

`func (o *ConnectorProvider) HasProvider() bool`

HasProvider returns a boolean if a field has been set.

### GetLabel

`func (o *ConnectorProvider) GetLabel() string`

GetLabel returns the Label field if non-nil, zero value otherwise.

### GetLabelOk

`func (o *ConnectorProvider) GetLabelOk() (*string, bool)`

GetLabelOk returns a tuple with the Label field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLabel

`func (o *ConnectorProvider) SetLabel(v string)`

SetLabel sets Label field to given value.

### HasLabel

`func (o *ConnectorProvider) HasLabel() bool`

HasLabel returns a boolean if a field has been set.

### GetAuth

`func (o *ConnectorProvider) GetAuth() interface{}`

GetAuth returns the Auth field if non-nil, zero value otherwise.

### GetAuthOk

`func (o *ConnectorProvider) GetAuthOk() (*interface{}, bool)`

GetAuthOk returns a tuple with the Auth field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuth

`func (o *ConnectorProvider) SetAuth(v interface{})`

SetAuth sets Auth field to given value.

### HasAuth

`func (o *ConnectorProvider) HasAuth() bool`

HasAuth returns a boolean if a field has been set.

### SetAuthNil

`func (o *ConnectorProvider) SetAuthNil(b bool)`

 SetAuthNil sets the value for Auth to be an explicit nil

### UnsetAuth
`func (o *ConnectorProvider) UnsetAuth()`

UnsetAuth ensures that no value is present for Auth, not even an explicit nil
### GetLiveCredentials

`func (o *ConnectorProvider) GetLiveCredentials() bool`

GetLiveCredentials returns the LiveCredentials field if non-nil, zero value otherwise.

### GetLiveCredentialsOk

`func (o *ConnectorProvider) GetLiveCredentialsOk() (*bool, bool)`

GetLiveCredentialsOk returns a tuple with the LiveCredentials field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLiveCredentials

`func (o *ConnectorProvider) SetLiveCredentials(v bool)`

SetLiveCredentials sets LiveCredentials field to given value.

### HasLiveCredentials

`func (o *ConnectorProvider) HasLiveCredentials() bool`

HasLiveCredentials returns a boolean if a field has been set.

### GetPrivateBeta

`func (o *ConnectorProvider) GetPrivateBeta() bool`

GetPrivateBeta returns the PrivateBeta field if non-nil, zero value otherwise.

### GetPrivateBetaOk

`func (o *ConnectorProvider) GetPrivateBetaOk() (*bool, bool)`

GetPrivateBetaOk returns a tuple with the PrivateBeta field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrivateBeta

`func (o *ConnectorProvider) SetPrivateBeta(v bool)`

SetPrivateBeta sets PrivateBeta field to given value.

### HasPrivateBeta

`func (o *ConnectorProvider) HasPrivateBeta() bool`

HasPrivateBeta returns a boolean if a field has been set.

### GetCredentialStatus

`func (o *ConnectorProvider) GetCredentialStatus() string`

GetCredentialStatus returns the CredentialStatus field if non-nil, zero value otherwise.

### GetCredentialStatusOk

`func (o *ConnectorProvider) GetCredentialStatusOk() (*string, bool)`

GetCredentialStatusOk returns a tuple with the CredentialStatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCredentialStatus

`func (o *ConnectorProvider) SetCredentialStatus(v string)`

SetCredentialStatus sets CredentialStatus field to given value.

### HasCredentialStatus

`func (o *ConnectorProvider) HasCredentialStatus() bool`

HasCredentialStatus returns a boolean if a field has been set.

### GetCredentialEnv

`func (o *ConnectorProvider) GetCredentialEnv() []string`

GetCredentialEnv returns the CredentialEnv field if non-nil, zero value otherwise.

### GetCredentialEnvOk

`func (o *ConnectorProvider) GetCredentialEnvOk() (*[]string, bool)`

GetCredentialEnvOk returns a tuple with the CredentialEnv field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCredentialEnv

`func (o *ConnectorProvider) SetCredentialEnv(v []string)`

SetCredentialEnv sets CredentialEnv field to given value.

### HasCredentialEnv

`func (o *ConnectorProvider) HasCredentialEnv() bool`

HasCredentialEnv returns a boolean if a field has been set.

### GetMissingCredentialEnv

`func (o *ConnectorProvider) GetMissingCredentialEnv() []string`

GetMissingCredentialEnv returns the MissingCredentialEnv field if non-nil, zero value otherwise.

### GetMissingCredentialEnvOk

`func (o *ConnectorProvider) GetMissingCredentialEnvOk() (*[]string, bool)`

GetMissingCredentialEnvOk returns a tuple with the MissingCredentialEnv field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMissingCredentialEnv

`func (o *ConnectorProvider) SetMissingCredentialEnv(v []string)`

SetMissingCredentialEnv sets MissingCredentialEnv field to given value.

### HasMissingCredentialEnv

`func (o *ConnectorProvider) HasMissingCredentialEnv() bool`

HasMissingCredentialEnv returns a boolean if a field has been set.

### GetSignInScopes

`func (o *ConnectorProvider) GetSignInScopes() []string`

GetSignInScopes returns the SignInScopes field if non-nil, zero value otherwise.

### GetSignInScopesOk

`func (o *ConnectorProvider) GetSignInScopesOk() (*[]string, bool)`

GetSignInScopesOk returns a tuple with the SignInScopes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSignInScopes

`func (o *ConnectorProvider) SetSignInScopes(v []string)`

SetSignInScopes sets SignInScopes field to given value.

### HasSignInScopes

`func (o *ConnectorProvider) HasSignInScopes() bool`

HasSignInScopes returns a boolean if a field has been set.

### GetScopes

`func (o *ConnectorProvider) GetScopes() []string`

GetScopes returns the Scopes field if non-nil, zero value otherwise.

### GetScopesOk

`func (o *ConnectorProvider) GetScopesOk() (*[]string, bool)`

GetScopesOk returns a tuple with the Scopes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScopes

`func (o *ConnectorProvider) SetScopes(v []string)`

SetScopes sets Scopes field to given value.

### HasScopes

`func (o *ConnectorProvider) HasScopes() bool`

HasScopes returns a boolean if a field has been set.

### GetFixtureBacked

`func (o *ConnectorProvider) GetFixtureBacked() bool`

GetFixtureBacked returns the FixtureBacked field if non-nil, zero value otherwise.

### GetFixtureBackedOk

`func (o *ConnectorProvider) GetFixtureBackedOk() (*bool, bool)`

GetFixtureBackedOk returns a tuple with the FixtureBacked field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFixtureBacked

`func (o *ConnectorProvider) SetFixtureBacked(v bool)`

SetFixtureBacked sets FixtureBacked field to given value.

### HasFixtureBacked

`func (o *ConnectorProvider) HasFixtureBacked() bool`

HasFixtureBacked returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
