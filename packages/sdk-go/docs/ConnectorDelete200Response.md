# ConnectorDelete200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Connection** | Pointer to [**ConnectorConnection**](ConnectorConnection.md) |  | [optional]
**DeletedDocuments** | Pointer to **int32** |  | [optional]

## Methods

### NewConnectorDelete200Response

`func NewConnectorDelete200Response() *ConnectorDelete200Response`

NewConnectorDelete200Response instantiates a new ConnectorDelete200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorDelete200ResponseWithDefaults

`func NewConnectorDelete200ResponseWithDefaults() *ConnectorDelete200Response`

NewConnectorDelete200ResponseWithDefaults instantiates a new ConnectorDelete200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetConnection

`func (o *ConnectorDelete200Response) GetConnection() ConnectorConnection`

GetConnection returns the Connection field if non-nil, zero value otherwise.

### GetConnectionOk

`func (o *ConnectorDelete200Response) GetConnectionOk() (*ConnectorConnection, bool)`

GetConnectionOk returns a tuple with the Connection field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConnection

`func (o *ConnectorDelete200Response) SetConnection(v ConnectorConnection)`

SetConnection sets Connection field to given value.

### HasConnection

`func (o *ConnectorDelete200Response) HasConnection() bool`

HasConnection returns a boolean if a field has been set.

### GetDeletedDocuments

`func (o *ConnectorDelete200Response) GetDeletedDocuments() int32`

GetDeletedDocuments returns the DeletedDocuments field if non-nil, zero value otherwise.

### GetDeletedDocumentsOk

`func (o *ConnectorDelete200Response) GetDeletedDocumentsOk() (*int32, bool)`

GetDeletedDocumentsOk returns a tuple with the DeletedDocuments field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeletedDocuments

`func (o *ConnectorDelete200Response) SetDeletedDocuments(v int32)`

SetDeletedDocuments sets DeletedDocuments field to given value.

### HasDeletedDocuments

`func (o *ConnectorDelete200Response) HasDeletedDocuments() bool`

HasDeletedDocuments returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
