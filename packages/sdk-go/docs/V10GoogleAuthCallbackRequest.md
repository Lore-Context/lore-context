# V10GoogleAuthCallbackRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**IdToken** | **string** | Google OIDC id_token (JWT). In production the JWT signature is verified against Google&#39;s JWKS. In mock mode, accepts a base64url JSON claims blob. |
**State** | **string** | Opaque OAuth state that must match the state cookie. |

## Methods

### NewV10GoogleAuthCallbackRequest

`func NewV10GoogleAuthCallbackRequest(idToken string, state string, ) *V10GoogleAuthCallbackRequest`

NewV10GoogleAuthCallbackRequest instantiates a new V10GoogleAuthCallbackRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV10GoogleAuthCallbackRequestWithDefaults

`func NewV10GoogleAuthCallbackRequestWithDefaults() *V10GoogleAuthCallbackRequest`

NewV10GoogleAuthCallbackRequestWithDefaults instantiates a new V10GoogleAuthCallbackRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetIdToken

`func (o *V10GoogleAuthCallbackRequest) GetIdToken() string`

GetIdToken returns the IdToken field if non-nil, zero value otherwise.

### GetIdTokenOk

`func (o *V10GoogleAuthCallbackRequest) GetIdTokenOk() (*string, bool)`

GetIdTokenOk returns a tuple with the IdToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIdToken

`func (o *V10GoogleAuthCallbackRequest) SetIdToken(v string)`

SetIdToken sets IdToken field to given value.


### GetState

`func (o *V10GoogleAuthCallbackRequest) GetState() string`

GetState returns the State field if non-nil, zero value otherwise.

### GetStateOk

`func (o *V10GoogleAuthCallbackRequest) GetStateOk() (*string, bool)`

GetStateOk returns a tuple with the State field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetState

`func (o *V10GoogleAuthCallbackRequest) SetState(v string)`

SetState sets State field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
