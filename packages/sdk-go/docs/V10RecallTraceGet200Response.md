# V10RecallTraceGet200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Trace** | Pointer to [**V10RecallTrace**](V10RecallTrace.md) |  | [optional]
**Items** | Pointer to [**[]V10RecallTraceItem**](V10RecallTraceItem.md) |  | [optional]

## Methods

### NewV10RecallTraceGet200Response

`func NewV10RecallTraceGet200Response() *V10RecallTraceGet200Response`

NewV10RecallTraceGet200Response instantiates a new V10RecallTraceGet200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV10RecallTraceGet200ResponseWithDefaults

`func NewV10RecallTraceGet200ResponseWithDefaults() *V10RecallTraceGet200Response`

NewV10RecallTraceGet200ResponseWithDefaults instantiates a new V10RecallTraceGet200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTrace

`func (o *V10RecallTraceGet200Response) GetTrace() V10RecallTrace`

GetTrace returns the Trace field if non-nil, zero value otherwise.

### GetTraceOk

`func (o *V10RecallTraceGet200Response) GetTraceOk() (*V10RecallTrace, bool)`

GetTraceOk returns a tuple with the Trace field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTrace

`func (o *V10RecallTraceGet200Response) SetTrace(v V10RecallTrace)`

SetTrace sets Trace field to given value.

### HasTrace

`func (o *V10RecallTraceGet200Response) HasTrace() bool`

HasTrace returns a boolean if a field has been set.

### GetItems

`func (o *V10RecallTraceGet200Response) GetItems() []V10RecallTraceItem`

GetItems returns the Items field if non-nil, zero value otherwise.

### GetItemsOk

`func (o *V10RecallTraceGet200Response) GetItemsOk() (*[]V10RecallTraceItem, bool)`

GetItemsOk returns a tuple with the Items field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItems

`func (o *V10RecallTraceGet200Response) SetItems(v []V10RecallTraceItem)`

SetItems sets Items field to given value.

### HasItems

`func (o *V10RecallTraceGet200Response) HasItems() bool`

HasItems returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
