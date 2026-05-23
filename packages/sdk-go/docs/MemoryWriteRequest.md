# MemoryWriteRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Content** | **string** |  |
**MemoryType** | Pointer to **string** |  | [optional]
**ProjectId** | Pointer to **string** |  | [optional]
**AgentId** | Pointer to **string** |  | [optional]
**Scope** | Pointer to **string** |  | [optional]
**Confidence** | Pointer to **float32** |  | [optional]

## Methods

### NewMemoryWriteRequest

`func NewMemoryWriteRequest(content string, ) *MemoryWriteRequest`

NewMemoryWriteRequest instantiates a new MemoryWriteRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryWriteRequestWithDefaults

`func NewMemoryWriteRequestWithDefaults() *MemoryWriteRequest`

NewMemoryWriteRequestWithDefaults instantiates a new MemoryWriteRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContent

`func (o *MemoryWriteRequest) GetContent() string`

GetContent returns the Content field if non-nil, zero value otherwise.

### GetContentOk

`func (o *MemoryWriteRequest) GetContentOk() (*string, bool)`

GetContentOk returns a tuple with the Content field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContent

`func (o *MemoryWriteRequest) SetContent(v string)`

SetContent sets Content field to given value.


### GetMemoryType

`func (o *MemoryWriteRequest) GetMemoryType() string`

GetMemoryType returns the MemoryType field if non-nil, zero value otherwise.

### GetMemoryTypeOk

`func (o *MemoryWriteRequest) GetMemoryTypeOk() (*string, bool)`

GetMemoryTypeOk returns a tuple with the MemoryType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemoryType

`func (o *MemoryWriteRequest) SetMemoryType(v string)`

SetMemoryType sets MemoryType field to given value.

### HasMemoryType

`func (o *MemoryWriteRequest) HasMemoryType() bool`

HasMemoryType returns a boolean if a field has been set.

### GetProjectId

`func (o *MemoryWriteRequest) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *MemoryWriteRequest) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *MemoryWriteRequest) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.

### HasProjectId

`func (o *MemoryWriteRequest) HasProjectId() bool`

HasProjectId returns a boolean if a field has been set.

### GetAgentId

`func (o *MemoryWriteRequest) GetAgentId() string`

GetAgentId returns the AgentId field if non-nil, zero value otherwise.

### GetAgentIdOk

`func (o *MemoryWriteRequest) GetAgentIdOk() (*string, bool)`

GetAgentIdOk returns a tuple with the AgentId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAgentId

`func (o *MemoryWriteRequest) SetAgentId(v string)`

SetAgentId sets AgentId field to given value.

### HasAgentId

`func (o *MemoryWriteRequest) HasAgentId() bool`

HasAgentId returns a boolean if a field has been set.

### GetScope

`func (o *MemoryWriteRequest) GetScope() string`

GetScope returns the Scope field if non-nil, zero value otherwise.

### GetScopeOk

`func (o *MemoryWriteRequest) GetScopeOk() (*string, bool)`

GetScopeOk returns a tuple with the Scope field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScope

`func (o *MemoryWriteRequest) SetScope(v string)`

SetScope sets Scope field to given value.

### HasScope

`func (o *MemoryWriteRequest) HasScope() bool`

HasScope returns a boolean if a field has been set.

### GetConfidence

`func (o *MemoryWriteRequest) GetConfidence() float32`

GetConfidence returns the Confidence field if non-nil, zero value otherwise.

### GetConfidenceOk

`func (o *MemoryWriteRequest) GetConfidenceOk() (*float32, bool)`

GetConfidenceOk returns a tuple with the Confidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfidence

`func (o *MemoryWriteRequest) SetConfidence(v float32)`

SetConfidence sets Confidence field to given value.

### HasConfidence

`func (o *MemoryWriteRequest) HasConfidence() bool`

HasConfidence returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
