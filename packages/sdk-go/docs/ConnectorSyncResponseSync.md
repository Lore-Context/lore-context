# ConnectorSyncResponseSync

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ConnectionId** | Pointer to **string** |  | [optional]
**Provider** | Pointer to **string** |  | [optional]
**Mode** | Pointer to **string** |  | [optional]
**Job** | Pointer to **map[string]interface{}** |  | [optional]
**Checkpoint** | Pointer to **map[string]interface{}** |  | [optional]
**Inbox** | Pointer to [**V09CaptureSessionDeltas202Response**](V09CaptureSessionDeltas202Response.md) |  | [optional]
**Documents** | Pointer to [**[]ConnectorSyncResponseSyncDocumentsInner**](ConnectorSyncResponseSyncDocumentsInner.md) |  | [optional]

## Methods

### NewConnectorSyncResponseSync

`func NewConnectorSyncResponseSync() *ConnectorSyncResponseSync`

NewConnectorSyncResponseSync instantiates a new ConnectorSyncResponseSync object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorSyncResponseSyncWithDefaults

`func NewConnectorSyncResponseSyncWithDefaults() *ConnectorSyncResponseSync`

NewConnectorSyncResponseSyncWithDefaults instantiates a new ConnectorSyncResponseSync object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetConnectionId

`func (o *ConnectorSyncResponseSync) GetConnectionId() string`

GetConnectionId returns the ConnectionId field if non-nil, zero value otherwise.

### GetConnectionIdOk

`func (o *ConnectorSyncResponseSync) GetConnectionIdOk() (*string, bool)`

GetConnectionIdOk returns a tuple with the ConnectionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConnectionId

`func (o *ConnectorSyncResponseSync) SetConnectionId(v string)`

SetConnectionId sets ConnectionId field to given value.

### HasConnectionId

`func (o *ConnectorSyncResponseSync) HasConnectionId() bool`

HasConnectionId returns a boolean if a field has been set.

### GetProvider

`func (o *ConnectorSyncResponseSync) GetProvider() string`

GetProvider returns the Provider field if non-nil, zero value otherwise.

### GetProviderOk

`func (o *ConnectorSyncResponseSync) GetProviderOk() (*string, bool)`

GetProviderOk returns a tuple with the Provider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProvider

`func (o *ConnectorSyncResponseSync) SetProvider(v string)`

SetProvider sets Provider field to given value.

### HasProvider

`func (o *ConnectorSyncResponseSync) HasProvider() bool`

HasProvider returns a boolean if a field has been set.

### GetMode

`func (o *ConnectorSyncResponseSync) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *ConnectorSyncResponseSync) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *ConnectorSyncResponseSync) SetMode(v string)`

SetMode sets Mode field to given value.

### HasMode

`func (o *ConnectorSyncResponseSync) HasMode() bool`

HasMode returns a boolean if a field has been set.

### GetJob

`func (o *ConnectorSyncResponseSync) GetJob() map[string]interface{}`

GetJob returns the Job field if non-nil, zero value otherwise.

### GetJobOk

`func (o *ConnectorSyncResponseSync) GetJobOk() (*map[string]interface{}, bool)`

GetJobOk returns a tuple with the Job field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetJob

`func (o *ConnectorSyncResponseSync) SetJob(v map[string]interface{})`

SetJob sets Job field to given value.

### HasJob

`func (o *ConnectorSyncResponseSync) HasJob() bool`

HasJob returns a boolean if a field has been set.

### GetCheckpoint

`func (o *ConnectorSyncResponseSync) GetCheckpoint() map[string]interface{}`

GetCheckpoint returns the Checkpoint field if non-nil, zero value otherwise.

### GetCheckpointOk

`func (o *ConnectorSyncResponseSync) GetCheckpointOk() (*map[string]interface{}, bool)`

GetCheckpointOk returns a tuple with the Checkpoint field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCheckpoint

`func (o *ConnectorSyncResponseSync) SetCheckpoint(v map[string]interface{})`

SetCheckpoint sets Checkpoint field to given value.

### HasCheckpoint

`func (o *ConnectorSyncResponseSync) HasCheckpoint() bool`

HasCheckpoint returns a boolean if a field has been set.

### GetInbox

`func (o *ConnectorSyncResponseSync) GetInbox() V09CaptureSessionDeltas202Response`

GetInbox returns the Inbox field if non-nil, zero value otherwise.

### GetInboxOk

`func (o *ConnectorSyncResponseSync) GetInboxOk() (*V09CaptureSessionDeltas202Response, bool)`

GetInboxOk returns a tuple with the Inbox field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInbox

`func (o *ConnectorSyncResponseSync) SetInbox(v V09CaptureSessionDeltas202Response)`

SetInbox sets Inbox field to given value.

### HasInbox

`func (o *ConnectorSyncResponseSync) HasInbox() bool`

HasInbox returns a boolean if a field has been set.

### GetDocuments

`func (o *ConnectorSyncResponseSync) GetDocuments() []ConnectorSyncResponseSyncDocumentsInner`

GetDocuments returns the Documents field if non-nil, zero value otherwise.

### GetDocumentsOk

`func (o *ConnectorSyncResponseSync) GetDocumentsOk() (*[]ConnectorSyncResponseSyncDocumentsInner, bool)`

GetDocumentsOk returns a tuple with the Documents field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDocuments

`func (o *ConnectorSyncResponseSync) SetDocuments(v []ConnectorSyncResponseSyncDocumentsInner)`

SetDocuments sets Documents field to given value.

### HasDocuments

`func (o *ConnectorSyncResponseSync) HasDocuments() bool`

HasDocuments returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
