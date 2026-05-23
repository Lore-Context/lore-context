# V09SourceCheckpointSaveRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CheckpointKey** | **string** |  |
**OffsetValue** | Pointer to **string** |  | [optional]
**ContentHash** | Pointer to **string** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewV09SourceCheckpointSaveRequest

`func NewV09SourceCheckpointSaveRequest(checkpointKey string, ) *V09SourceCheckpointSaveRequest`

NewV09SourceCheckpointSaveRequest instantiates a new V09SourceCheckpointSaveRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV09SourceCheckpointSaveRequestWithDefaults

`func NewV09SourceCheckpointSaveRequestWithDefaults() *V09SourceCheckpointSaveRequest`

NewV09SourceCheckpointSaveRequestWithDefaults instantiates a new V09SourceCheckpointSaveRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCheckpointKey

`func (o *V09SourceCheckpointSaveRequest) GetCheckpointKey() string`

GetCheckpointKey returns the CheckpointKey field if non-nil, zero value otherwise.

### GetCheckpointKeyOk

`func (o *V09SourceCheckpointSaveRequest) GetCheckpointKeyOk() (*string, bool)`

GetCheckpointKeyOk returns a tuple with the CheckpointKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCheckpointKey

`func (o *V09SourceCheckpointSaveRequest) SetCheckpointKey(v string)`

SetCheckpointKey sets CheckpointKey field to given value.


### GetOffsetValue

`func (o *V09SourceCheckpointSaveRequest) GetOffsetValue() string`

GetOffsetValue returns the OffsetValue field if non-nil, zero value otherwise.

### GetOffsetValueOk

`func (o *V09SourceCheckpointSaveRequest) GetOffsetValueOk() (*string, bool)`

GetOffsetValueOk returns a tuple with the OffsetValue field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOffsetValue

`func (o *V09SourceCheckpointSaveRequest) SetOffsetValue(v string)`

SetOffsetValue sets OffsetValue field to given value.

### HasOffsetValue

`func (o *V09SourceCheckpointSaveRequest) HasOffsetValue() bool`

HasOffsetValue returns a boolean if a field has been set.

### GetContentHash

`func (o *V09SourceCheckpointSaveRequest) GetContentHash() string`

GetContentHash returns the ContentHash field if non-nil, zero value otherwise.

### GetContentHashOk

`func (o *V09SourceCheckpointSaveRequest) GetContentHashOk() (*string, bool)`

GetContentHashOk returns a tuple with the ContentHash field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContentHash

`func (o *V09SourceCheckpointSaveRequest) SetContentHash(v string)`

SetContentHash sets ContentHash field to given value.

### HasContentHash

`func (o *V09SourceCheckpointSaveRequest) HasContentHash() bool`

HasContentHash returns a boolean if a field has been set.

### GetMetadata

`func (o *V09SourceCheckpointSaveRequest) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *V09SourceCheckpointSaveRequest) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *V09SourceCheckpointSaveRequest) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *V09SourceCheckpointSaveRequest) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
