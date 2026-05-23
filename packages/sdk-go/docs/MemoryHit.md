# MemoryHit

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Memory** | [**MemoryRecord**](MemoryRecord.md) |  |
**Score** | **float32** |  |
**Highlights** | **[]string** |  |
**Backend** | Pointer to **string** |  | [optional]
**Streams** | Pointer to [**MemoryHitStreams**](MemoryHitStreams.md) |  | [optional]
**Lifecycle** | Pointer to [**MemoryHitLifecycle**](MemoryHitLifecycle.md) |  | [optional]
**Provenance** | Pointer to [**MemoryHitProvenance**](MemoryHitProvenance.md) |  | [optional]
**Explanation** | Pointer to **string** |  | [optional]

## Methods

### NewMemoryHit

`func NewMemoryHit(memory MemoryRecord, score float32, highlights []string, ) *MemoryHit`

NewMemoryHit instantiates a new MemoryHit object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryHitWithDefaults

`func NewMemoryHitWithDefaults() *MemoryHit`

NewMemoryHitWithDefaults instantiates a new MemoryHit object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMemory

`func (o *MemoryHit) GetMemory() MemoryRecord`

GetMemory returns the Memory field if non-nil, zero value otherwise.

### GetMemoryOk

`func (o *MemoryHit) GetMemoryOk() (*MemoryRecord, bool)`

GetMemoryOk returns a tuple with the Memory field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemory

`func (o *MemoryHit) SetMemory(v MemoryRecord)`

SetMemory sets Memory field to given value.


### GetScore

`func (o *MemoryHit) GetScore() float32`

GetScore returns the Score field if non-nil, zero value otherwise.

### GetScoreOk

`func (o *MemoryHit) GetScoreOk() (*float32, bool)`

GetScoreOk returns a tuple with the Score field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScore

`func (o *MemoryHit) SetScore(v float32)`

SetScore sets Score field to given value.


### GetHighlights

`func (o *MemoryHit) GetHighlights() []string`

GetHighlights returns the Highlights field if non-nil, zero value otherwise.

### GetHighlightsOk

`func (o *MemoryHit) GetHighlightsOk() (*[]string, bool)`

GetHighlightsOk returns a tuple with the Highlights field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHighlights

`func (o *MemoryHit) SetHighlights(v []string)`

SetHighlights sets Highlights field to given value.


### GetBackend

`func (o *MemoryHit) GetBackend() string`

GetBackend returns the Backend field if non-nil, zero value otherwise.

### GetBackendOk

`func (o *MemoryHit) GetBackendOk() (*string, bool)`

GetBackendOk returns a tuple with the Backend field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBackend

`func (o *MemoryHit) SetBackend(v string)`

SetBackend sets Backend field to given value.

### HasBackend

`func (o *MemoryHit) HasBackend() bool`

HasBackend returns a boolean if a field has been set.

### GetStreams

`func (o *MemoryHit) GetStreams() MemoryHitStreams`

GetStreams returns the Streams field if non-nil, zero value otherwise.

### GetStreamsOk

`func (o *MemoryHit) GetStreamsOk() (*MemoryHitStreams, bool)`

GetStreamsOk returns a tuple with the Streams field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStreams

`func (o *MemoryHit) SetStreams(v MemoryHitStreams)`

SetStreams sets Streams field to given value.

### HasStreams

`func (o *MemoryHit) HasStreams() bool`

HasStreams returns a boolean if a field has been set.

### GetLifecycle

`func (o *MemoryHit) GetLifecycle() MemoryHitLifecycle`

GetLifecycle returns the Lifecycle field if non-nil, zero value otherwise.

### GetLifecycleOk

`func (o *MemoryHit) GetLifecycleOk() (*MemoryHitLifecycle, bool)`

GetLifecycleOk returns a tuple with the Lifecycle field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLifecycle

`func (o *MemoryHit) SetLifecycle(v MemoryHitLifecycle)`

SetLifecycle sets Lifecycle field to given value.

### HasLifecycle

`func (o *MemoryHit) HasLifecycle() bool`

HasLifecycle returns a boolean if a field has been set.

### GetProvenance

`func (o *MemoryHit) GetProvenance() MemoryHitProvenance`

GetProvenance returns the Provenance field if non-nil, zero value otherwise.

### GetProvenanceOk

`func (o *MemoryHit) GetProvenanceOk() (*MemoryHitProvenance, bool)`

GetProvenanceOk returns a tuple with the Provenance field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProvenance

`func (o *MemoryHit) SetProvenance(v MemoryHitProvenance)`

SetProvenance sets Provenance field to given value.

### HasProvenance

`func (o *MemoryHit) HasProvenance() bool`

HasProvenance returns a boolean if a field has been set.

### GetExplanation

`func (o *MemoryHit) GetExplanation() string`

GetExplanation returns the Explanation field if non-nil, zero value otherwise.

### GetExplanationOk

`func (o *MemoryHit) GetExplanationOk() (*string, bool)`

GetExplanationOk returns a tuple with the Explanation field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExplanation

`func (o *MemoryHit) SetExplanation(v string)`

SetExplanation sets Explanation field to given value.

### HasExplanation

`func (o *MemoryHit) HasExplanation() bool`

HasExplanation returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
