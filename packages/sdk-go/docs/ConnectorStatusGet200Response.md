# ConnectorStatusGet200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Connection** | Pointer to [**ConnectorConnection**](ConnectorConnection.md) |  | [optional]
**Checkpoint** | Pointer to **map[string]interface{}** |  | [optional]
**Documents** | Pointer to **[]map[string]interface{}** |  | [optional]

## Methods

### NewConnectorStatusGet200Response

`func NewConnectorStatusGet200Response() *ConnectorStatusGet200Response`

NewConnectorStatusGet200Response instantiates a new ConnectorStatusGet200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorStatusGet200ResponseWithDefaults

`func NewConnectorStatusGet200ResponseWithDefaults() *ConnectorStatusGet200Response`

NewConnectorStatusGet200ResponseWithDefaults instantiates a new ConnectorStatusGet200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetConnection

`func (o *ConnectorStatusGet200Response) GetConnection() ConnectorConnection`

GetConnection returns the Connection field if non-nil, zero value otherwise.

### GetConnectionOk

`func (o *ConnectorStatusGet200Response) GetConnectionOk() (*ConnectorConnection, bool)`

GetConnectionOk returns a tuple with the Connection field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConnection

`func (o *ConnectorStatusGet200Response) SetConnection(v ConnectorConnection)`

SetConnection sets Connection field to given value.

### HasConnection

`func (o *ConnectorStatusGet200Response) HasConnection() bool`

HasConnection returns a boolean if a field has been set.

### GetCheckpoint

`func (o *ConnectorStatusGet200Response) GetCheckpoint() map[string]interface{}`

GetCheckpoint returns the Checkpoint field if non-nil, zero value otherwise.

### GetCheckpointOk

`func (o *ConnectorStatusGet200Response) GetCheckpointOk() (*map[string]interface{}, bool)`

GetCheckpointOk returns a tuple with the Checkpoint field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCheckpoint

`func (o *ConnectorStatusGet200Response) SetCheckpoint(v map[string]interface{})`

SetCheckpoint sets Checkpoint field to given value.

### HasCheckpoint

`func (o *ConnectorStatusGet200Response) HasCheckpoint() bool`

HasCheckpoint returns a boolean if a field has been set.

### GetDocuments

`func (o *ConnectorStatusGet200Response) GetDocuments() []map[string]interface{}`

GetDocuments returns the Documents field if non-nil, zero value otherwise.

### GetDocumentsOk

`func (o *ConnectorStatusGet200Response) GetDocumentsOk() (*[]map[string]interface{}, bool)`

GetDocumentsOk returns a tuple with the Documents field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDocuments

`func (o *ConnectorStatusGet200Response) SetDocuments(v []map[string]interface{})`

SetDocuments sets Documents field to given value.

### HasDocuments

`func (o *ConnectorStatusGet200Response) HasDocuments() bool`

HasDocuments returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
