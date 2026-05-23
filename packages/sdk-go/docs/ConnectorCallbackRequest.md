# ConnectorCallbackRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Code** | **string** |  |
**State** | Pointer to **string** |  | [optional]
**RedirectUri** | Pointer to **string** |  | [optional]
**DisplayName** | Pointer to **string** |  | [optional]
**FolderId** | Pointer to **string** |  | [optional]
**Scope** | Pointer to [**ConnectorScope**](ConnectorScope.md) |  | [optional]

## Methods

### NewConnectorCallbackRequest

`func NewConnectorCallbackRequest(code string, ) *ConnectorCallbackRequest`

NewConnectorCallbackRequest instantiates a new ConnectorCallbackRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorCallbackRequestWithDefaults

`func NewConnectorCallbackRequestWithDefaults() *ConnectorCallbackRequest`

NewConnectorCallbackRequestWithDefaults instantiates a new ConnectorCallbackRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCode

`func (o *ConnectorCallbackRequest) GetCode() string`

GetCode returns the Code field if non-nil, zero value otherwise.

### GetCodeOk

`func (o *ConnectorCallbackRequest) GetCodeOk() (*string, bool)`

GetCodeOk returns a tuple with the Code field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCode

`func (o *ConnectorCallbackRequest) SetCode(v string)`

SetCode sets Code field to given value.


### GetState

`func (o *ConnectorCallbackRequest) GetState() string`

GetState returns the State field if non-nil, zero value otherwise.

### GetStateOk

`func (o *ConnectorCallbackRequest) GetStateOk() (*string, bool)`

GetStateOk returns a tuple with the State field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetState

`func (o *ConnectorCallbackRequest) SetState(v string)`

SetState sets State field to given value.

### HasState

`func (o *ConnectorCallbackRequest) HasState() bool`

HasState returns a boolean if a field has been set.

### GetRedirectUri

`func (o *ConnectorCallbackRequest) GetRedirectUri() string`

GetRedirectUri returns the RedirectUri field if non-nil, zero value otherwise.

### GetRedirectUriOk

`func (o *ConnectorCallbackRequest) GetRedirectUriOk() (*string, bool)`

GetRedirectUriOk returns a tuple with the RedirectUri field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRedirectUri

`func (o *ConnectorCallbackRequest) SetRedirectUri(v string)`

SetRedirectUri sets RedirectUri field to given value.

### HasRedirectUri

`func (o *ConnectorCallbackRequest) HasRedirectUri() bool`

HasRedirectUri returns a boolean if a field has been set.

### GetDisplayName

`func (o *ConnectorCallbackRequest) GetDisplayName() string`

GetDisplayName returns the DisplayName field if non-nil, zero value otherwise.

### GetDisplayNameOk

`func (o *ConnectorCallbackRequest) GetDisplayNameOk() (*string, bool)`

GetDisplayNameOk returns a tuple with the DisplayName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisplayName

`func (o *ConnectorCallbackRequest) SetDisplayName(v string)`

SetDisplayName sets DisplayName field to given value.

### HasDisplayName

`func (o *ConnectorCallbackRequest) HasDisplayName() bool`

HasDisplayName returns a boolean if a field has been set.

### GetFolderId

`func (o *ConnectorCallbackRequest) GetFolderId() string`

GetFolderId returns the FolderId field if non-nil, zero value otherwise.

### GetFolderIdOk

`func (o *ConnectorCallbackRequest) GetFolderIdOk() (*string, bool)`

GetFolderIdOk returns a tuple with the FolderId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFolderId

`func (o *ConnectorCallbackRequest) SetFolderId(v string)`

SetFolderId sets FolderId field to given value.

### HasFolderId

`func (o *ConnectorCallbackRequest) HasFolderId() bool`

HasFolderId returns a boolean if a field has been set.

### GetScope

`func (o *ConnectorCallbackRequest) GetScope() ConnectorScope`

GetScope returns the Scope field if non-nil, zero value otherwise.

### GetScopeOk

`func (o *ConnectorCallbackRequest) GetScopeOk() (*ConnectorScope, bool)`

GetScopeOk returns a tuple with the Scope field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScope

`func (o *ConnectorCallbackRequest) SetScope(v ConnectorScope)`

SetScope sets Scope field to given value.

### HasScope

`func (o *ConnectorCallbackRequest) HasScope() bool`

HasScope returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
