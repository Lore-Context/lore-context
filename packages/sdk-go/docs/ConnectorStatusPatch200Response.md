# ConnectorStatusPatch200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Connection** | Pointer to [**ConnectorConnection**](ConnectorConnection.md) |  | [optional]

## Methods

### NewConnectorStatusPatch200Response

`func NewConnectorStatusPatch200Response() *ConnectorStatusPatch200Response`

NewConnectorStatusPatch200Response instantiates a new ConnectorStatusPatch200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorStatusPatch200ResponseWithDefaults

`func NewConnectorStatusPatch200ResponseWithDefaults() *ConnectorStatusPatch200Response`

NewConnectorStatusPatch200ResponseWithDefaults instantiates a new ConnectorStatusPatch200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetConnection

`func (o *ConnectorStatusPatch200Response) GetConnection() ConnectorConnection`

GetConnection returns the Connection field if non-nil, zero value otherwise.

### GetConnectionOk

`func (o *ConnectorStatusPatch200Response) GetConnectionOk() (*ConnectorConnection, bool)`

GetConnectionOk returns a tuple with the Connection field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConnection

`func (o *ConnectorStatusPatch200Response) SetConnection(v ConnectorConnection)`

SetConnection sets Connection field to given value.

### HasConnection

`func (o *ConnectorStatusPatch200Response) HasConnection() bool`

HasConnection returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
