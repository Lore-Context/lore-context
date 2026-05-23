# GovernanceMemoryRejectRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Reason** | **string** |  |
**Reviewer** | Pointer to **string** |  | [optional]

## Methods

### NewGovernanceMemoryRejectRequest

`func NewGovernanceMemoryRejectRequest(reason string, ) *GovernanceMemoryRejectRequest`

NewGovernanceMemoryRejectRequest instantiates a new GovernanceMemoryRejectRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewGovernanceMemoryRejectRequestWithDefaults

`func NewGovernanceMemoryRejectRequestWithDefaults() *GovernanceMemoryRejectRequest`

NewGovernanceMemoryRejectRequestWithDefaults instantiates a new GovernanceMemoryRejectRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetReason

`func (o *GovernanceMemoryRejectRequest) GetReason() string`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *GovernanceMemoryRejectRequest) GetReasonOk() (*string, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *GovernanceMemoryRejectRequest) SetReason(v string)`

SetReason sets Reason field to given value.


### GetReviewer

`func (o *GovernanceMemoryRejectRequest) GetReviewer() string`

GetReviewer returns the Reviewer field if non-nil, zero value otherwise.

### GetReviewerOk

`func (o *GovernanceMemoryRejectRequest) GetReviewerOk() (*string, bool)`

GetReviewerOk returns a tuple with the Reviewer field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReviewer

`func (o *GovernanceMemoryRejectRequest) SetReviewer(v string)`

SetReviewer sets Reviewer field to given value.

### HasReviewer

`func (o *GovernanceMemoryRejectRequest) HasReviewer() bool`

HasReviewer returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
