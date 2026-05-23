# CaptureIngestResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Session** | Pointer to [**CapturedSession**](CapturedSession.md) |  | [optional]
**Job** | Pointer to [**CaptureIngestResponseJob**](CaptureIngestResponseJob.md) |  | [optional]
**Duplicate** | Pointer to **bool** |  | [optional]

## Methods

### NewCaptureIngestResponse

`func NewCaptureIngestResponse() *CaptureIngestResponse`

NewCaptureIngestResponse instantiates a new CaptureIngestResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCaptureIngestResponseWithDefaults

`func NewCaptureIngestResponseWithDefaults() *CaptureIngestResponse`

NewCaptureIngestResponseWithDefaults instantiates a new CaptureIngestResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSession

`func (o *CaptureIngestResponse) GetSession() CapturedSession`

GetSession returns the Session field if non-nil, zero value otherwise.

### GetSessionOk

`func (o *CaptureIngestResponse) GetSessionOk() (*CapturedSession, bool)`

GetSessionOk returns a tuple with the Session field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSession

`func (o *CaptureIngestResponse) SetSession(v CapturedSession)`

SetSession sets Session field to given value.

### HasSession

`func (o *CaptureIngestResponse) HasSession() bool`

HasSession returns a boolean if a field has been set.

### GetJob

`func (o *CaptureIngestResponse) GetJob() CaptureIngestResponseJob`

GetJob returns the Job field if non-nil, zero value otherwise.

### GetJobOk

`func (o *CaptureIngestResponse) GetJobOk() (*CaptureIngestResponseJob, bool)`

GetJobOk returns a tuple with the Job field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetJob

`func (o *CaptureIngestResponse) SetJob(v CaptureIngestResponseJob)`

SetJob sets Job field to given value.

### HasJob

`func (o *CaptureIngestResponse) HasJob() bool`

HasJob returns a boolean if a field has been set.

### GetDuplicate

`func (o *CaptureIngestResponse) GetDuplicate() bool`

GetDuplicate returns the Duplicate field if non-nil, zero value otherwise.

### GetDuplicateOk

`func (o *CaptureIngestResponse) GetDuplicateOk() (*bool, bool)`

GetDuplicateOk returns a tuple with the Duplicate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDuplicate

`func (o *CaptureIngestResponse) SetDuplicate(v bool)`

SetDuplicate sets Duplicate field to given value.

### HasDuplicate

`func (o *CaptureIngestResponse) HasDuplicate() bool`

HasDuplicate returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
