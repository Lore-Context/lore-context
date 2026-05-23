# V10GoogleAuthStartResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AuthorizationUrl** | Pointer to **string** |  | [optional]
**State** | Pointer to **string** |  | [optional]
**Scopes** | Pointer to **[]string** |  | [optional]

## Methods

### NewV10GoogleAuthStartResponse

`func NewV10GoogleAuthStartResponse() *V10GoogleAuthStartResponse`

NewV10GoogleAuthStartResponse instantiates a new V10GoogleAuthStartResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV10GoogleAuthStartResponseWithDefaults

`func NewV10GoogleAuthStartResponseWithDefaults() *V10GoogleAuthStartResponse`

NewV10GoogleAuthStartResponseWithDefaults instantiates a new V10GoogleAuthStartResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAuthorizationUrl

`func (o *V10GoogleAuthStartResponse) GetAuthorizationUrl() string`

GetAuthorizationUrl returns the AuthorizationUrl field if non-nil, zero value otherwise.

### GetAuthorizationUrlOk

`func (o *V10GoogleAuthStartResponse) GetAuthorizationUrlOk() (*string, bool)`

GetAuthorizationUrlOk returns a tuple with the AuthorizationUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuthorizationUrl

`func (o *V10GoogleAuthStartResponse) SetAuthorizationUrl(v string)`

SetAuthorizationUrl sets AuthorizationUrl field to given value.

### HasAuthorizationUrl

`func (o *V10GoogleAuthStartResponse) HasAuthorizationUrl() bool`

HasAuthorizationUrl returns a boolean if a field has been set.

### GetState

`func (o *V10GoogleAuthStartResponse) GetState() string`

GetState returns the State field if non-nil, zero value otherwise.

### GetStateOk

`func (o *V10GoogleAuthStartResponse) GetStateOk() (*string, bool)`

GetStateOk returns a tuple with the State field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetState

`func (o *V10GoogleAuthStartResponse) SetState(v string)`

SetState sets State field to given value.

### HasState

`func (o *V10GoogleAuthStartResponse) HasState() bool`

HasState returns a boolean if a field has been set.

### GetScopes

`func (o *V10GoogleAuthStartResponse) GetScopes() []string`

GetScopes returns the Scopes field if non-nil, zero value otherwise.

### GetScopesOk

`func (o *V10GoogleAuthStartResponse) GetScopesOk() (*[]string, bool)`

GetScopesOk returns a tuple with the Scopes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScopes

`func (o *V10GoogleAuthStartResponse) SetScopes(v []string)`

SetScopes sets Scopes field to given value.

### HasScopes

`func (o *V10GoogleAuthStartResponse) HasScopes() bool`

HasScopes returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
