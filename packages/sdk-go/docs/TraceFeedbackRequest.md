# TraceFeedbackRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Feedback** | **string** |  |
**Note** | Pointer to **string** |  | [optional]

## Methods

### NewTraceFeedbackRequest

`func NewTraceFeedbackRequest(feedback string, ) *TraceFeedbackRequest`

NewTraceFeedbackRequest instantiates a new TraceFeedbackRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTraceFeedbackRequestWithDefaults

`func NewTraceFeedbackRequestWithDefaults() *TraceFeedbackRequest`

NewTraceFeedbackRequestWithDefaults instantiates a new TraceFeedbackRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetFeedback

`func (o *TraceFeedbackRequest) GetFeedback() string`

GetFeedback returns the Feedback field if non-nil, zero value otherwise.

### GetFeedbackOk

`func (o *TraceFeedbackRequest) GetFeedbackOk() (*string, bool)`

GetFeedbackOk returns a tuple with the Feedback field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFeedback

`func (o *TraceFeedbackRequest) SetFeedback(v string)`

SetFeedback sets Feedback field to given value.


### GetNote

`func (o *TraceFeedbackRequest) GetNote() string`

GetNote returns the Note field if non-nil, zero value otherwise.

### GetNoteOk

`func (o *TraceFeedbackRequest) GetNoteOk() (*string, bool)`

GetNoteOk returns a tuple with the Note field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNote

`func (o *TraceFeedbackRequest) SetNote(v string)`

SetNote sets Note field to given value.

### HasNote

`func (o *TraceFeedbackRequest) HasNote() bool`

HasNote returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
