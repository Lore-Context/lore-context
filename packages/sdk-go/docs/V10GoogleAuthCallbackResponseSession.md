# V10GoogleAuthCallbackResponseSession

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TokenId** | Pointer to **string** |  | [optional]
**ExpiresAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewV10GoogleAuthCallbackResponseSession

`func NewV10GoogleAuthCallbackResponseSession() *V10GoogleAuthCallbackResponseSession`

NewV10GoogleAuthCallbackResponseSession instantiates a new V10GoogleAuthCallbackResponseSession object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV10GoogleAuthCallbackResponseSessionWithDefaults

`func NewV10GoogleAuthCallbackResponseSessionWithDefaults() *V10GoogleAuthCallbackResponseSession`

NewV10GoogleAuthCallbackResponseSessionWithDefaults instantiates a new V10GoogleAuthCallbackResponseSession object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTokenId

`func (o *V10GoogleAuthCallbackResponseSession) GetTokenId() string`

GetTokenId returns the TokenId field if non-nil, zero value otherwise.

### GetTokenIdOk

`func (o *V10GoogleAuthCallbackResponseSession) GetTokenIdOk() (*string, bool)`

GetTokenIdOk returns a tuple with the TokenId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokenId

`func (o *V10GoogleAuthCallbackResponseSession) SetTokenId(v string)`

SetTokenId sets TokenId field to given value.

### HasTokenId

`func (o *V10GoogleAuthCallbackResponseSession) HasTokenId() bool`

HasTokenId returns a boolean if a field has been set.

### GetExpiresAt

`func (o *V10GoogleAuthCallbackResponseSession) GetExpiresAt() time.Time`

GetExpiresAt returns the ExpiresAt field if non-nil, zero value otherwise.

### GetExpiresAtOk

`func (o *V10GoogleAuthCallbackResponseSession) GetExpiresAtOk() (*time.Time, bool)`

GetExpiresAtOk returns a tuple with the ExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresAt

`func (o *V10GoogleAuthCallbackResponseSession) SetExpiresAt(v time.Time)`

SetExpiresAt sets ExpiresAt field to given value.

### HasExpiresAt

`func (o *V10GoogleAuthCallbackResponseSession) HasExpiresAt() bool`

HasExpiresAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
