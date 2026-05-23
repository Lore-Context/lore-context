# EvalMetrics

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**RecallAt5** | Pointer to **float32** |  | [optional]
**PrecisionAt5** | Pointer to **float32** |  | [optional]
**Mrr** | Pointer to **float32** |  | [optional]
**StaleHitRate** | Pointer to **float32** |  | [optional]
**P95LatencyMs** | Pointer to **float32** |  | [optional]

## Methods

### NewEvalMetrics

`func NewEvalMetrics() *EvalMetrics`

NewEvalMetrics instantiates a new EvalMetrics object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEvalMetricsWithDefaults

`func NewEvalMetricsWithDefaults() *EvalMetrics`

NewEvalMetricsWithDefaults instantiates a new EvalMetrics object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetRecallAt5

`func (o *EvalMetrics) GetRecallAt5() float32`

GetRecallAt5 returns the RecallAt5 field if non-nil, zero value otherwise.

### GetRecallAt5Ok

`func (o *EvalMetrics) GetRecallAt5Ok() (*float32, bool)`

GetRecallAt5Ok returns a tuple with the RecallAt5 field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRecallAt5

`func (o *EvalMetrics) SetRecallAt5(v float32)`

SetRecallAt5 sets RecallAt5 field to given value.

### HasRecallAt5

`func (o *EvalMetrics) HasRecallAt5() bool`

HasRecallAt5 returns a boolean if a field has been set.

### GetPrecisionAt5

`func (o *EvalMetrics) GetPrecisionAt5() float32`

GetPrecisionAt5 returns the PrecisionAt5 field if non-nil, zero value otherwise.

### GetPrecisionAt5Ok

`func (o *EvalMetrics) GetPrecisionAt5Ok() (*float32, bool)`

GetPrecisionAt5Ok returns a tuple with the PrecisionAt5 field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrecisionAt5

`func (o *EvalMetrics) SetPrecisionAt5(v float32)`

SetPrecisionAt5 sets PrecisionAt5 field to given value.

### HasPrecisionAt5

`func (o *EvalMetrics) HasPrecisionAt5() bool`

HasPrecisionAt5 returns a boolean if a field has been set.

### GetMrr

`func (o *EvalMetrics) GetMrr() float32`

GetMrr returns the Mrr field if non-nil, zero value otherwise.

### GetMrrOk

`func (o *EvalMetrics) GetMrrOk() (*float32, bool)`

GetMrrOk returns a tuple with the Mrr field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMrr

`func (o *EvalMetrics) SetMrr(v float32)`

SetMrr sets Mrr field to given value.

### HasMrr

`func (o *EvalMetrics) HasMrr() bool`

HasMrr returns a boolean if a field has been set.

### GetStaleHitRate

`func (o *EvalMetrics) GetStaleHitRate() float32`

GetStaleHitRate returns the StaleHitRate field if non-nil, zero value otherwise.

### GetStaleHitRateOk

`func (o *EvalMetrics) GetStaleHitRateOk() (*float32, bool)`

GetStaleHitRateOk returns a tuple with the StaleHitRate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStaleHitRate

`func (o *EvalMetrics) SetStaleHitRate(v float32)`

SetStaleHitRate sets StaleHitRate field to given value.

### HasStaleHitRate

`func (o *EvalMetrics) HasStaleHitRate() bool`

HasStaleHitRate returns a boolean if a field has been set.

### GetP95LatencyMs

`func (o *EvalMetrics) GetP95LatencyMs() float32`

GetP95LatencyMs returns the P95LatencyMs field if non-nil, zero value otherwise.

### GetP95LatencyMsOk

`func (o *EvalMetrics) GetP95LatencyMsOk() (*float32, bool)`

GetP95LatencyMsOk returns a tuple with the P95LatencyMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetP95LatencyMs

`func (o *EvalMetrics) SetP95LatencyMs(v float32)`

SetP95LatencyMs sets P95LatencyMs field to given value.

### HasP95LatencyMs

`func (o *EvalMetrics) HasP95LatencyMs() bool`

HasP95LatencyMs returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
