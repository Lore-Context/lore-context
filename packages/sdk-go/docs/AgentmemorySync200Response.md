# AgentmemorySync200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Status** | Pointer to **string** |  | [optional]
**ImportedMemories** | Pointer to **int32** |  | [optional]
**Warnings** | Pointer to **[]string** |  | [optional]

## Methods

### NewAgentmemorySync200Response

`func NewAgentmemorySync200Response() *AgentmemorySync200Response`

NewAgentmemorySync200Response instantiates a new AgentmemorySync200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAgentmemorySync200ResponseWithDefaults

`func NewAgentmemorySync200ResponseWithDefaults() *AgentmemorySync200Response`

NewAgentmemorySync200ResponseWithDefaults instantiates a new AgentmemorySync200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetStatus

`func (o *AgentmemorySync200Response) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *AgentmemorySync200Response) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *AgentmemorySync200Response) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *AgentmemorySync200Response) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetImportedMemories

`func (o *AgentmemorySync200Response) GetImportedMemories() int32`

GetImportedMemories returns the ImportedMemories field if non-nil, zero value otherwise.

### GetImportedMemoriesOk

`func (o *AgentmemorySync200Response) GetImportedMemoriesOk() (*int32, bool)`

GetImportedMemoriesOk returns a tuple with the ImportedMemories field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetImportedMemories

`func (o *AgentmemorySync200Response) SetImportedMemories(v int32)`

SetImportedMemories sets ImportedMemories field to given value.

### HasImportedMemories

`func (o *AgentmemorySync200Response) HasImportedMemories() bool`

HasImportedMemories returns a boolean if a field has been set.

### GetWarnings

`func (o *AgentmemorySync200Response) GetWarnings() []string`

GetWarnings returns the Warnings field if non-nil, zero value otherwise.

### GetWarningsOk

`func (o *AgentmemorySync200Response) GetWarningsOk() (*[]string, bool)`

GetWarningsOk returns a tuple with the Warnings field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWarnings

`func (o *AgentmemorySync200Response) SetWarnings(v []string)`

SetWarnings sets Warnings field to given value.

### HasWarnings

`func (o *AgentmemorySync200Response) HasWarnings() bool`

HasWarnings returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
