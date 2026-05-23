# MemoryHitStreams

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Dense** | Pointer to [**MemoryHitStreamsDense**](MemoryHitStreamsDense.md) |  | [optional]
**Sparse** | Pointer to [**MemoryHitStreamsSparse**](MemoryHitStreamsSparse.md) |  | [optional]
**Graph** | Pointer to [**MemoryHitStreamsGraph**](MemoryHitStreamsGraph.md) |  | [optional]

## Methods

### NewMemoryHitStreams

`func NewMemoryHitStreams() *MemoryHitStreams`

NewMemoryHitStreams instantiates a new MemoryHitStreams object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemoryHitStreamsWithDefaults

`func NewMemoryHitStreamsWithDefaults() *MemoryHitStreams`

NewMemoryHitStreamsWithDefaults instantiates a new MemoryHitStreams object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetDense

`func (o *MemoryHitStreams) GetDense() MemoryHitStreamsDense`

GetDense returns the Dense field if non-nil, zero value otherwise.

### GetDenseOk

`func (o *MemoryHitStreams) GetDenseOk() (*MemoryHitStreamsDense, bool)`

GetDenseOk returns a tuple with the Dense field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDense

`func (o *MemoryHitStreams) SetDense(v MemoryHitStreamsDense)`

SetDense sets Dense field to given value.

### HasDense

`func (o *MemoryHitStreams) HasDense() bool`

HasDense returns a boolean if a field has been set.

### GetSparse

`func (o *MemoryHitStreams) GetSparse() MemoryHitStreamsSparse`

GetSparse returns the Sparse field if non-nil, zero value otherwise.

### GetSparseOk

`func (o *MemoryHitStreams) GetSparseOk() (*MemoryHitStreamsSparse, bool)`

GetSparseOk returns a tuple with the Sparse field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSparse

`func (o *MemoryHitStreams) SetSparse(v MemoryHitStreamsSparse)`

SetSparse sets Sparse field to given value.

### HasSparse

`func (o *MemoryHitStreams) HasSparse() bool`

HasSparse returns a boolean if a field has been set.

### GetGraph

`func (o *MemoryHitStreams) GetGraph() MemoryHitStreamsGraph`

GetGraph returns the Graph field if non-nil, zero value otherwise.

### GetGraphOk

`func (o *MemoryHitStreams) GetGraphOk() (*MemoryHitStreamsGraph, bool)`

GetGraphOk returns a tuple with the Graph field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGraph

`func (o *MemoryHitStreams) SetGraph(v MemoryHitStreamsGraph)`

SetGraph sets Graph field to given value.

### HasGraph

`func (o *MemoryHitStreams) HasGraph() bool`

HasGraph returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
