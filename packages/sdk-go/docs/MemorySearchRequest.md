# MemorySearchRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Query** | **string** |  |
**ProjectId** | Pointer to **string** |  | [optional]
**TopK** | Pointer to **int32** |  | [optional]
**AsOf** | Pointer to **time.Time** | v1.4 bi-temporal: ISO 8601 datetime that sets BOTH asOfSystemTime and asOfValidTime to the same value. Use this for unified point-in-time queries (\&quot;what would Lore have answered at this moment?\&quot;). Mutually exclusive with asOfSystemTime and asOfValidTime. | [optional]
**AsOfSystemTime** | Pointer to **time.Time** | v1.4 bi-temporal: ISO 8601 datetime for the system-knowledge axis. Filters to facts that Lore had recorded by this timestamp (t_created &lt;&#x3D; asOfSystemTime) and had not yet expired (t_expired IS NULL OR t_expired &gt; asOfSystemTime). Must not be in the future beyond 5 minutes. Mutually exclusive with asOf. | [optional]
**AsOfValidTime** | Pointer to **time.Time** | v1.4 bi-temporal: ISO 8601 datetime for the business-validity axis. Filters to facts whose validity window covers this timestamp (valid_from &lt;&#x3D; asOfValidTime AND (valid_until IS NULL OR valid_until &gt; asOfValidTime)). Future values are allowed for forward-looking domain queries. Mutually exclusive with asOf. | [optional]

## Methods

### NewMemorySearchRequest

`func NewMemorySearchRequest(query string, ) *MemorySearchRequest`

NewMemorySearchRequest instantiates a new MemorySearchRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemorySearchRequestWithDefaults

`func NewMemorySearchRequestWithDefaults() *MemorySearchRequest`

NewMemorySearchRequestWithDefaults instantiates a new MemorySearchRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetQuery

`func (o *MemorySearchRequest) GetQuery() string`

GetQuery returns the Query field if non-nil, zero value otherwise.

### GetQueryOk

`func (o *MemorySearchRequest) GetQueryOk() (*string, bool)`

GetQueryOk returns a tuple with the Query field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQuery

`func (o *MemorySearchRequest) SetQuery(v string)`

SetQuery sets Query field to given value.


### GetProjectId

`func (o *MemorySearchRequest) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *MemorySearchRequest) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *MemorySearchRequest) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.

### HasProjectId

`func (o *MemorySearchRequest) HasProjectId() bool`

HasProjectId returns a boolean if a field has been set.

### GetTopK

`func (o *MemorySearchRequest) GetTopK() int32`

GetTopK returns the TopK field if non-nil, zero value otherwise.

### GetTopKOk

`func (o *MemorySearchRequest) GetTopKOk() (*int32, bool)`

GetTopKOk returns a tuple with the TopK field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopK

`func (o *MemorySearchRequest) SetTopK(v int32)`

SetTopK sets TopK field to given value.

### HasTopK

`func (o *MemorySearchRequest) HasTopK() bool`

HasTopK returns a boolean if a field has been set.

### GetAsOf

`func (o *MemorySearchRequest) GetAsOf() time.Time`

GetAsOf returns the AsOf field if non-nil, zero value otherwise.

### GetAsOfOk

`func (o *MemorySearchRequest) GetAsOfOk() (*time.Time, bool)`

GetAsOfOk returns a tuple with the AsOf field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAsOf

`func (o *MemorySearchRequest) SetAsOf(v time.Time)`

SetAsOf sets AsOf field to given value.

### HasAsOf

`func (o *MemorySearchRequest) HasAsOf() bool`

HasAsOf returns a boolean if a field has been set.

### GetAsOfSystemTime

`func (o *MemorySearchRequest) GetAsOfSystemTime() time.Time`

GetAsOfSystemTime returns the AsOfSystemTime field if non-nil, zero value otherwise.

### GetAsOfSystemTimeOk

`func (o *MemorySearchRequest) GetAsOfSystemTimeOk() (*time.Time, bool)`

GetAsOfSystemTimeOk returns a tuple with the AsOfSystemTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAsOfSystemTime

`func (o *MemorySearchRequest) SetAsOfSystemTime(v time.Time)`

SetAsOfSystemTime sets AsOfSystemTime field to given value.

### HasAsOfSystemTime

`func (o *MemorySearchRequest) HasAsOfSystemTime() bool`

HasAsOfSystemTime returns a boolean if a field has been set.

### GetAsOfValidTime

`func (o *MemorySearchRequest) GetAsOfValidTime() time.Time`

GetAsOfValidTime returns the AsOfValidTime field if non-nil, zero value otherwise.

### GetAsOfValidTimeOk

`func (o *MemorySearchRequest) GetAsOfValidTimeOk() (*time.Time, bool)`

GetAsOfValidTimeOk returns a tuple with the AsOfValidTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAsOfValidTime

`func (o *MemorySearchRequest) SetAsOfValidTime(v time.Time)`

SetAsOfValidTime sets AsOfValidTime field to given value.

### HasAsOfValidTime

`func (o *MemorySearchRequest) HasAsOfValidTime() bool`

HasAsOfValidTime returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
