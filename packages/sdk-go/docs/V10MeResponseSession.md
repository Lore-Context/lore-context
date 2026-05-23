# V10MeResponseSession

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TokenKind** | Pointer to **string** |  | [optional]
**Scopes** | Pointer to **[]string** |  | [optional]

## Methods

### NewV10MeResponseSession

`func NewV10MeResponseSession() *V10MeResponseSession`

NewV10MeResponseSession instantiates a new V10MeResponseSession object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV10MeResponseSessionWithDefaults

`func NewV10MeResponseSessionWithDefaults() *V10MeResponseSession`

NewV10MeResponseSessionWithDefaults instantiates a new V10MeResponseSession object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTokenKind

`func (o *V10MeResponseSession) GetTokenKind() string`

GetTokenKind returns the TokenKind field if non-nil, zero value otherwise.

### GetTokenKindOk

`func (o *V10MeResponseSession) GetTokenKindOk() (*string, bool)`

GetTokenKindOk returns a tuple with the TokenKind field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokenKind

`func (o *V10MeResponseSession) SetTokenKind(v string)`

SetTokenKind sets TokenKind field to given value.

### HasTokenKind

`func (o *V10MeResponseSession) HasTokenKind() bool`

HasTokenKind returns a boolean if a field has been set.

### GetScopes

`func (o *V10MeResponseSession) GetScopes() []string`

GetScopes returns the Scopes field if non-nil, zero value otherwise.

### GetScopesOk

`func (o *V10MeResponseSession) GetScopesOk() (*[]string, bool)`

GetScopesOk returns a tuple with the Scopes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScopes

`func (o *V10MeResponseSession) SetScopes(v []string)`

SetScopes sets Scopes field to given value.

### HasScopes

`func (o *V10MeResponseSession) HasScopes() bool`

HasScopes returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
