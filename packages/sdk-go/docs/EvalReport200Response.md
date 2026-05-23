# EvalReport200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**EvalRun** | Pointer to [**EvalRunRecord**](EvalRunRecord.md) |  | [optional]
**PublicSafe** | Pointer to **bool** |  | [optional]

## Methods

### NewEvalReport200Response

`func NewEvalReport200Response() *EvalReport200Response`

NewEvalReport200Response instantiates a new EvalReport200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEvalReport200ResponseWithDefaults

`func NewEvalReport200ResponseWithDefaults() *EvalReport200Response`

NewEvalReport200ResponseWithDefaults instantiates a new EvalReport200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEvalRun

`func (o *EvalReport200Response) GetEvalRun() EvalRunRecord`

GetEvalRun returns the EvalRun field if non-nil, zero value otherwise.

### GetEvalRunOk

`func (o *EvalReport200Response) GetEvalRunOk() (*EvalRunRecord, bool)`

GetEvalRunOk returns a tuple with the EvalRun field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvalRun

`func (o *EvalReport200Response) SetEvalRun(v EvalRunRecord)`

SetEvalRun sets EvalRun field to given value.

### HasEvalRun

`func (o *EvalReport200Response) HasEvalRun() bool`

HasEvalRun returns a boolean if a field has been set.

### GetPublicSafe

`func (o *EvalReport200Response) GetPublicSafe() bool`

GetPublicSafe returns the PublicSafe field if non-nil, zero value otherwise.

### GetPublicSafeOk

`func (o *EvalReport200Response) GetPublicSafeOk() (*bool, bool)`

GetPublicSafeOk returns a tuple with the PublicSafe field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPublicSafe

`func (o *EvalReport200Response) SetPublicSafe(v bool)`

SetPublicSafe sets PublicSafe field to given value.

### HasPublicSafe

`func (o *EvalReport200Response) HasPublicSafe() bool`

HasPublicSafe returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
