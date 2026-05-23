# CaptureJob

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**SessionId** | Pointer to **string** |  | [optional]
**Type** | Pointer to **string** |  | [optional]
**Status** | Pointer to **string** |  | [optional]
**Attempts** | Pointer to **int32** |  | [optional]
**Payload** | Pointer to **map[string]interface{}** |  | [optional]
**Error** | Pointer to **NullableString** |  | [optional]
**CreatedAt** | Pointer to **time.Time** |  | [optional]
**UpdatedAt** | Pointer to **time.Time** |  | [optional]
**LockedBy** | Pointer to **NullableString** |  | [optional]
**LockedAt** | Pointer to **NullableTime** |  | [optional]
**NextRunAt** | Pointer to **NullableTime** |  | [optional]

## Methods

### NewCaptureJob

`func NewCaptureJob() *CaptureJob`

NewCaptureJob instantiates a new CaptureJob object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCaptureJobWithDefaults

`func NewCaptureJobWithDefaults() *CaptureJob`

NewCaptureJobWithDefaults instantiates a new CaptureJob object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *CaptureJob) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *CaptureJob) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *CaptureJob) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *CaptureJob) HasId() bool`

HasId returns a boolean if a field has been set.

### GetVaultId

`func (o *CaptureJob) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *CaptureJob) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *CaptureJob) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *CaptureJob) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetSessionId

`func (o *CaptureJob) GetSessionId() string`

GetSessionId returns the SessionId field if non-nil, zero value otherwise.

### GetSessionIdOk

`func (o *CaptureJob) GetSessionIdOk() (*string, bool)`

GetSessionIdOk returns a tuple with the SessionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionId

`func (o *CaptureJob) SetSessionId(v string)`

SetSessionId sets SessionId field to given value.

### HasSessionId

`func (o *CaptureJob) HasSessionId() bool`

HasSessionId returns a boolean if a field has been set.

### GetType

`func (o *CaptureJob) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *CaptureJob) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *CaptureJob) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *CaptureJob) HasType() bool`

HasType returns a boolean if a field has been set.

### GetStatus

`func (o *CaptureJob) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *CaptureJob) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *CaptureJob) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *CaptureJob) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetAttempts

`func (o *CaptureJob) GetAttempts() int32`

GetAttempts returns the Attempts field if non-nil, zero value otherwise.

### GetAttemptsOk

`func (o *CaptureJob) GetAttemptsOk() (*int32, bool)`

GetAttemptsOk returns a tuple with the Attempts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttempts

`func (o *CaptureJob) SetAttempts(v int32)`

SetAttempts sets Attempts field to given value.

### HasAttempts

`func (o *CaptureJob) HasAttempts() bool`

HasAttempts returns a boolean if a field has been set.

### GetPayload

`func (o *CaptureJob) GetPayload() map[string]interface{}`

GetPayload returns the Payload field if non-nil, zero value otherwise.

### GetPayloadOk

`func (o *CaptureJob) GetPayloadOk() (*map[string]interface{}, bool)`

GetPayloadOk returns a tuple with the Payload field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPayload

`func (o *CaptureJob) SetPayload(v map[string]interface{})`

SetPayload sets Payload field to given value.

### HasPayload

`func (o *CaptureJob) HasPayload() bool`

HasPayload returns a boolean if a field has been set.

### GetError

`func (o *CaptureJob) GetError() string`

GetError returns the Error field if non-nil, zero value otherwise.

### GetErrorOk

`func (o *CaptureJob) GetErrorOk() (*string, bool)`

GetErrorOk returns a tuple with the Error field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetError

`func (o *CaptureJob) SetError(v string)`

SetError sets Error field to given value.

### HasError

`func (o *CaptureJob) HasError() bool`

HasError returns a boolean if a field has been set.

### SetErrorNil

`func (o *CaptureJob) SetErrorNil(b bool)`

 SetErrorNil sets the value for Error to be an explicit nil

### UnsetError
`func (o *CaptureJob) UnsetError()`

UnsetError ensures that no value is present for Error, not even an explicit nil
### GetCreatedAt

`func (o *CaptureJob) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *CaptureJob) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *CaptureJob) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.

### HasCreatedAt

`func (o *CaptureJob) HasCreatedAt() bool`

HasCreatedAt returns a boolean if a field has been set.

### GetUpdatedAt

`func (o *CaptureJob) GetUpdatedAt() time.Time`

GetUpdatedAt returns the UpdatedAt field if non-nil, zero value otherwise.

### GetUpdatedAtOk

`func (o *CaptureJob) GetUpdatedAtOk() (*time.Time, bool)`

GetUpdatedAtOk returns a tuple with the UpdatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpdatedAt

`func (o *CaptureJob) SetUpdatedAt(v time.Time)`

SetUpdatedAt sets UpdatedAt field to given value.

### HasUpdatedAt

`func (o *CaptureJob) HasUpdatedAt() bool`

HasUpdatedAt returns a boolean if a field has been set.

### GetLockedBy

`func (o *CaptureJob) GetLockedBy() string`

GetLockedBy returns the LockedBy field if non-nil, zero value otherwise.

### GetLockedByOk

`func (o *CaptureJob) GetLockedByOk() (*string, bool)`

GetLockedByOk returns a tuple with the LockedBy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLockedBy

`func (o *CaptureJob) SetLockedBy(v string)`

SetLockedBy sets LockedBy field to given value.

### HasLockedBy

`func (o *CaptureJob) HasLockedBy() bool`

HasLockedBy returns a boolean if a field has been set.

### SetLockedByNil

`func (o *CaptureJob) SetLockedByNil(b bool)`

 SetLockedByNil sets the value for LockedBy to be an explicit nil

### UnsetLockedBy
`func (o *CaptureJob) UnsetLockedBy()`

UnsetLockedBy ensures that no value is present for LockedBy, not even an explicit nil
### GetLockedAt

`func (o *CaptureJob) GetLockedAt() time.Time`

GetLockedAt returns the LockedAt field if non-nil, zero value otherwise.

### GetLockedAtOk

`func (o *CaptureJob) GetLockedAtOk() (*time.Time, bool)`

GetLockedAtOk returns a tuple with the LockedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLockedAt

`func (o *CaptureJob) SetLockedAt(v time.Time)`

SetLockedAt sets LockedAt field to given value.

### HasLockedAt

`func (o *CaptureJob) HasLockedAt() bool`

HasLockedAt returns a boolean if a field has been set.

### SetLockedAtNil

`func (o *CaptureJob) SetLockedAtNil(b bool)`

 SetLockedAtNil sets the value for LockedAt to be an explicit nil

### UnsetLockedAt
`func (o *CaptureJob) UnsetLockedAt()`

UnsetLockedAt ensures that no value is present for LockedAt, not even an explicit nil
### GetNextRunAt

`func (o *CaptureJob) GetNextRunAt() time.Time`

GetNextRunAt returns the NextRunAt field if non-nil, zero value otherwise.

### GetNextRunAtOk

`func (o *CaptureJob) GetNextRunAtOk() (*time.Time, bool)`

GetNextRunAtOk returns a tuple with the NextRunAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNextRunAt

`func (o *CaptureJob) SetNextRunAt(v time.Time)`

SetNextRunAt sets NextRunAt field to given value.

### HasNextRunAt

`func (o *CaptureJob) HasNextRunAt() bool`

HasNextRunAt returns a boolean if a field has been set.

### SetNextRunAtNil

`func (o *CaptureJob) SetNextRunAtNil(b bool)`

 SetNextRunAtNil sets the value for NextRunAt to be an explicit nil

### UnsetNextRunAt
`func (o *CaptureJob) UnsetNextRunAt()`

UnsetNextRunAt ensures that no value is present for NextRunAt, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
