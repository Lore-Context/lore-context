# EvalRunRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Provider** | Pointer to **string** |  | [optional] [default to "lore-local"]
**ProjectId** | Pointer to **string** |  | [optional]
**Dataset** | **map[string]interface{}** |  |

## Methods

### NewEvalRunRequest

`func NewEvalRunRequest(dataset map[string]interface{}, ) *EvalRunRequest`

NewEvalRunRequest instantiates a new EvalRunRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEvalRunRequestWithDefaults

`func NewEvalRunRequestWithDefaults() *EvalRunRequest`

NewEvalRunRequestWithDefaults instantiates a new EvalRunRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetProvider

`func (o *EvalRunRequest) GetProvider() string`

GetProvider returns the Provider field if non-nil, zero value otherwise.

### GetProviderOk

`func (o *EvalRunRequest) GetProviderOk() (*string, bool)`

GetProviderOk returns a tuple with the Provider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProvider

`func (o *EvalRunRequest) SetProvider(v string)`

SetProvider sets Provider field to given value.

### HasProvider

`func (o *EvalRunRequest) HasProvider() bool`

HasProvider returns a boolean if a field has been set.

### GetProjectId

`func (o *EvalRunRequest) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *EvalRunRequest) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *EvalRunRequest) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.

### HasProjectId

`func (o *EvalRunRequest) HasProjectId() bool`

HasProjectId returns a boolean if a field has been set.

### GetDataset

`func (o *EvalRunRequest) GetDataset() map[string]interface{}`

GetDataset returns the Dataset field if non-nil, zero value otherwise.

### GetDatasetOk

`func (o *EvalRunRequest) GetDatasetOk() (*map[string]interface{}, bool)`

GetDatasetOk returns a tuple with the Dataset field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDataset

`func (o *EvalRunRequest) SetDataset(v map[string]interface{})`

SetDataset sets Dataset field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
