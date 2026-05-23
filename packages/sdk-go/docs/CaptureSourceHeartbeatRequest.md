# CaptureSourceHeartbeatRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SourceType** | Pointer to **string** |  | [optional]
**SourceProvider** | Pointer to **string** |  | [optional]
**SourceRef** | Pointer to **string** |  | [optional]
**Status** | Pointer to **string** |  | [optional]
**Error** | Pointer to **NullableString** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewCaptureSourceHeartbeatRequest

`func NewCaptureSourceHeartbeatRequest() *CaptureSourceHeartbeatRequest`

NewCaptureSourceHeartbeatRequest instantiates a new CaptureSourceHeartbeatRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCaptureSourceHeartbeatRequestWithDefaults

`func NewCaptureSourceHeartbeatRequestWithDefaults() *CaptureSourceHeartbeatRequest`

NewCaptureSourceHeartbeatRequestWithDefaults instantiates a new CaptureSourceHeartbeatRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSourceType

`func (o *CaptureSourceHeartbeatRequest) GetSourceType() string`

GetSourceType returns the SourceType field if non-nil, zero value otherwise.

### GetSourceTypeOk

`func (o *CaptureSourceHeartbeatRequest) GetSourceTypeOk() (*string, bool)`

GetSourceTypeOk returns a tuple with the SourceType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceType

`func (o *CaptureSourceHeartbeatRequest) SetSourceType(v string)`

SetSourceType sets SourceType field to given value.

### HasSourceType

`func (o *CaptureSourceHeartbeatRequest) HasSourceType() bool`

HasSourceType returns a boolean if a field has been set.

### GetSourceProvider

`func (o *CaptureSourceHeartbeatRequest) GetSourceProvider() string`

GetSourceProvider returns the SourceProvider field if non-nil, zero value otherwise.

### GetSourceProviderOk

`func (o *CaptureSourceHeartbeatRequest) GetSourceProviderOk() (*string, bool)`

GetSourceProviderOk returns a tuple with the SourceProvider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceProvider

`func (o *CaptureSourceHeartbeatRequest) SetSourceProvider(v string)`

SetSourceProvider sets SourceProvider field to given value.

### HasSourceProvider

`func (o *CaptureSourceHeartbeatRequest) HasSourceProvider() bool`

HasSourceProvider returns a boolean if a field has been set.

### GetSourceRef

`func (o *CaptureSourceHeartbeatRequest) GetSourceRef() string`

GetSourceRef returns the SourceRef field if non-nil, zero value otherwise.

### GetSourceRefOk

`func (o *CaptureSourceHeartbeatRequest) GetSourceRefOk() (*string, bool)`

GetSourceRefOk returns a tuple with the SourceRef field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceRef

`func (o *CaptureSourceHeartbeatRequest) SetSourceRef(v string)`

SetSourceRef sets SourceRef field to given value.

### HasSourceRef

`func (o *CaptureSourceHeartbeatRequest) HasSourceRef() bool`

HasSourceRef returns a boolean if a field has been set.

### GetStatus

`func (o *CaptureSourceHeartbeatRequest) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *CaptureSourceHeartbeatRequest) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *CaptureSourceHeartbeatRequest) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *CaptureSourceHeartbeatRequest) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetError

`func (o *CaptureSourceHeartbeatRequest) GetError() string`

GetError returns the Error field if non-nil, zero value otherwise.

### GetErrorOk

`func (o *CaptureSourceHeartbeatRequest) GetErrorOk() (*string, bool)`

GetErrorOk returns a tuple with the Error field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetError

`func (o *CaptureSourceHeartbeatRequest) SetError(v string)`

SetError sets Error field to given value.

### HasError

`func (o *CaptureSourceHeartbeatRequest) HasError() bool`

HasError returns a boolean if a field has been set.

### SetErrorNil

`func (o *CaptureSourceHeartbeatRequest) SetErrorNil(b bool)`

 SetErrorNil sets the value for Error to be an explicit nil

### UnsetError
`func (o *CaptureSourceHeartbeatRequest) UnsetError()`

UnsetError ensures that no value is present for Error, not even an explicit nil
### GetMetadata

`func (o *CaptureSourceHeartbeatRequest) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *CaptureSourceHeartbeatRequest) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *CaptureSourceHeartbeatRequest) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *CaptureSourceHeartbeatRequest) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
