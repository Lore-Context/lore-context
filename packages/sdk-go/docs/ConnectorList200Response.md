# ConnectorList200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Providers** | Pointer to [**[]ConnectorProvider**](ConnectorProvider.md) |  | [optional]
**Connections** | Pointer to [**[]ConnectorConnection**](ConnectorConnection.md) |  | [optional]

## Methods

### NewConnectorList200Response

`func NewConnectorList200Response() *ConnectorList200Response`

NewConnectorList200Response instantiates a new ConnectorList200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorList200ResponseWithDefaults

`func NewConnectorList200ResponseWithDefaults() *ConnectorList200Response`

NewConnectorList200ResponseWithDefaults instantiates a new ConnectorList200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetProviders

`func (o *ConnectorList200Response) GetProviders() []ConnectorProvider`

GetProviders returns the Providers field if non-nil, zero value otherwise.

### GetProvidersOk

`func (o *ConnectorList200Response) GetProvidersOk() (*[]ConnectorProvider, bool)`

GetProvidersOk returns a tuple with the Providers field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProviders

`func (o *ConnectorList200Response) SetProviders(v []ConnectorProvider)`

SetProviders sets Providers field to given value.

### HasProviders

`func (o *ConnectorList200Response) HasProviders() bool`

HasProviders returns a boolean if a field has been set.

### GetConnections

`func (o *ConnectorList200Response) GetConnections() []ConnectorConnection`

GetConnections returns the Connections field if non-nil, zero value otherwise.

### GetConnectionsOk

`func (o *ConnectorList200Response) GetConnectionsOk() (*[]ConnectorConnection, bool)`

GetConnectionsOk returns a tuple with the Connections field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConnections

`func (o *ConnectorList200Response) SetConnections(v []ConnectorConnection)`

SetConnections sets Connections field to given value.

### HasConnections

`func (o *ConnectorList200Response) HasConnections() bool`

HasConnections returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
