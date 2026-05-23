# ConnectorSyncResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Sync** | Pointer to [**ConnectorSyncResponseSync**](ConnectorSyncResponseSync.md) |  | [optional]

## Methods

### NewConnectorSyncResponse

`func NewConnectorSyncResponse() *ConnectorSyncResponse`

NewConnectorSyncResponse instantiates a new ConnectorSyncResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorSyncResponseWithDefaults

`func NewConnectorSyncResponseWithDefaults() *ConnectorSyncResponse`

NewConnectorSyncResponseWithDefaults instantiates a new ConnectorSyncResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSync

`func (o *ConnectorSyncResponse) GetSync() ConnectorSyncResponseSync`

GetSync returns the Sync field if non-nil, zero value otherwise.

### GetSyncOk

`func (o *ConnectorSyncResponse) GetSyncOk() (*ConnectorSyncResponseSync, bool)`

GetSyncOk returns a tuple with the Sync field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSync

`func (o *ConnectorSyncResponse) SetSync(v ConnectorSyncResponseSync)`

SetSync sets Sync field to given value.

### HasSync

`func (o *ConnectorSyncResponse) HasSync() bool`

HasSync returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
