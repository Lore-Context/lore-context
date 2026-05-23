# ConnectorAuthorizeRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**RedirectUri** | Pointer to **string** |  | [optional]
**State** | Pointer to **string** |  | [optional]
**FolderId** | Pointer to **string** |  | [optional]
**Scope** | Pointer to [**ConnectorScope**](ConnectorScope.md) |  | [optional]

## Methods

### NewConnectorAuthorizeRequest

`func NewConnectorAuthorizeRequest() *ConnectorAuthorizeRequest`

NewConnectorAuthorizeRequest instantiates a new ConnectorAuthorizeRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorAuthorizeRequestWithDefaults

`func NewConnectorAuthorizeRequestWithDefaults() *ConnectorAuthorizeRequest`

NewConnectorAuthorizeRequestWithDefaults instantiates a new ConnectorAuthorizeRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetRedirectUri

`func (o *ConnectorAuthorizeRequest) GetRedirectUri() string`

GetRedirectUri returns the RedirectUri field if non-nil, zero value otherwise.

### GetRedirectUriOk

`func (o *ConnectorAuthorizeRequest) GetRedirectUriOk() (*string, bool)`

GetRedirectUriOk returns a tuple with the RedirectUri field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRedirectUri

`func (o *ConnectorAuthorizeRequest) SetRedirectUri(v string)`

SetRedirectUri sets RedirectUri field to given value.

### HasRedirectUri

`func (o *ConnectorAuthorizeRequest) HasRedirectUri() bool`

HasRedirectUri returns a boolean if a field has been set.

### GetState

`func (o *ConnectorAuthorizeRequest) GetState() string`

GetState returns the State field if non-nil, zero value otherwise.

### GetStateOk

`func (o *ConnectorAuthorizeRequest) GetStateOk() (*string, bool)`

GetStateOk returns a tuple with the State field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetState

`func (o *ConnectorAuthorizeRequest) SetState(v string)`

SetState sets State field to given value.

### HasState

`func (o *ConnectorAuthorizeRequest) HasState() bool`

HasState returns a boolean if a field has been set.

### GetFolderId

`func (o *ConnectorAuthorizeRequest) GetFolderId() string`

GetFolderId returns the FolderId field if non-nil, zero value otherwise.

### GetFolderIdOk

`func (o *ConnectorAuthorizeRequest) GetFolderIdOk() (*string, bool)`

GetFolderIdOk returns a tuple with the FolderId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFolderId

`func (o *ConnectorAuthorizeRequest) SetFolderId(v string)`

SetFolderId sets FolderId field to given value.

### HasFolderId

`func (o *ConnectorAuthorizeRequest) HasFolderId() bool`

HasFolderId returns a boolean if a field has been set.

### GetScope

`func (o *ConnectorAuthorizeRequest) GetScope() ConnectorScope`

GetScope returns the Scope field if non-nil, zero value otherwise.

### GetScopeOk

`func (o *ConnectorAuthorizeRequest) GetScopeOk() (*ConnectorScope, bool)`

GetScopeOk returns a tuple with the Scope field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScope

`func (o *ConnectorAuthorizeRequest) SetScope(v ConnectorScope)`

SetScope sets Scope field to given value.

### HasScope

`func (o *ConnectorAuthorizeRequest) HasScope() bool`

HasScope returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
