# ConnectorWebhookResult

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Accepted** | Pointer to **bool** |  | [optional]
**Reason** | Pointer to **string** |  | [optional]
**Event** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewConnectorWebhookResult

`func NewConnectorWebhookResult() *ConnectorWebhookResult`

NewConnectorWebhookResult instantiates a new ConnectorWebhookResult object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorWebhookResultWithDefaults

`func NewConnectorWebhookResultWithDefaults() *ConnectorWebhookResult`

NewConnectorWebhookResultWithDefaults instantiates a new ConnectorWebhookResult object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAccepted

`func (o *ConnectorWebhookResult) GetAccepted() bool`

GetAccepted returns the Accepted field if non-nil, zero value otherwise.

### GetAcceptedOk

`func (o *ConnectorWebhookResult) GetAcceptedOk() (*bool, bool)`

GetAcceptedOk returns a tuple with the Accepted field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccepted

`func (o *ConnectorWebhookResult) SetAccepted(v bool)`

SetAccepted sets Accepted field to given value.

### HasAccepted

`func (o *ConnectorWebhookResult) HasAccepted() bool`

HasAccepted returns a boolean if a field has been set.

### GetReason

`func (o *ConnectorWebhookResult) GetReason() string`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *ConnectorWebhookResult) GetReasonOk() (*string, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *ConnectorWebhookResult) SetReason(v string)`

SetReason sets Reason field to given value.

### HasReason

`func (o *ConnectorWebhookResult) HasReason() bool`

HasReason returns a boolean if a field has been set.

### GetEvent

`func (o *ConnectorWebhookResult) GetEvent() map[string]interface{}`

GetEvent returns the Event field if non-nil, zero value otherwise.

### GetEventOk

`func (o *ConnectorWebhookResult) GetEventOk() (*map[string]interface{}, bool)`

GetEventOk returns a tuple with the Event field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvent

`func (o *ConnectorWebhookResult) SetEvent(v map[string]interface{})`

SetEvent sets Event field to given value.

### HasEvent

`func (o *ConnectorWebhookResult) HasEvent() bool`

HasEvent returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
