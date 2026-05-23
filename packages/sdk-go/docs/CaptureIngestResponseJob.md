# CaptureIngestResponseJob

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**Type** | Pointer to **string** |  | [optional]
**Status** | Pointer to **string** |  | [optional]
**Attempts** | Pointer to **int32** |  | [optional]
**NextRunAt** | Pointer to **NullableTime** |  | [optional]

## Methods

### NewCaptureIngestResponseJob

`func NewCaptureIngestResponseJob() *CaptureIngestResponseJob`

NewCaptureIngestResponseJob instantiates a new CaptureIngestResponseJob object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCaptureIngestResponseJobWithDefaults

`func NewCaptureIngestResponseJobWithDefaults() *CaptureIngestResponseJob`

NewCaptureIngestResponseJobWithDefaults instantiates a new CaptureIngestResponseJob object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *CaptureIngestResponseJob) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *CaptureIngestResponseJob) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *CaptureIngestResponseJob) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *CaptureIngestResponseJob) HasId() bool`

HasId returns a boolean if a field has been set.

### GetType

`func (o *CaptureIngestResponseJob) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *CaptureIngestResponseJob) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *CaptureIngestResponseJob) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *CaptureIngestResponseJob) HasType() bool`

HasType returns a boolean if a field has been set.

### GetStatus

`func (o *CaptureIngestResponseJob) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *CaptureIngestResponseJob) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *CaptureIngestResponseJob) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *CaptureIngestResponseJob) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetAttempts

`func (o *CaptureIngestResponseJob) GetAttempts() int32`

GetAttempts returns the Attempts field if non-nil, zero value otherwise.

### GetAttemptsOk

`func (o *CaptureIngestResponseJob) GetAttemptsOk() (*int32, bool)`

GetAttemptsOk returns a tuple with the Attempts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttempts

`func (o *CaptureIngestResponseJob) SetAttempts(v int32)`

SetAttempts sets Attempts field to given value.

### HasAttempts

`func (o *CaptureIngestResponseJob) HasAttempts() bool`

HasAttempts returns a boolean if a field has been set.

### GetNextRunAt

`func (o *CaptureIngestResponseJob) GetNextRunAt() time.Time`

GetNextRunAt returns the NextRunAt field if non-nil, zero value otherwise.

### GetNextRunAtOk

`func (o *CaptureIngestResponseJob) GetNextRunAtOk() (*time.Time, bool)`

GetNextRunAtOk returns a tuple with the NextRunAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNextRunAt

`func (o *CaptureIngestResponseJob) SetNextRunAt(v time.Time)`

SetNextRunAt sets NextRunAt field to given value.

### HasNextRunAt

`func (o *CaptureIngestResponseJob) HasNextRunAt() bool`

HasNextRunAt returns a boolean if a field has been set.

### SetNextRunAtNil

`func (o *CaptureIngestResponseJob) SetNextRunAtNil(b bool)`

 SetNextRunAtNil sets the value for NextRunAt to be an explicit nil

### UnsetNextRunAt
`func (o *CaptureIngestResponseJob) UnsetNextRunAt()`

UnsetNextRunAt ensures that no value is present for NextRunAt, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
