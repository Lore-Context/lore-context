# ConnectorSyncResponseSyncDocumentsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**ExternalId** | Pointer to **string** |  | [optional]
**Title** | Pointer to **string** |  | [optional]
**MimeType** | Pointer to **string** |  | [optional]
**ModifiedAt** | Pointer to **time.Time** |  | [optional]
**Summary** | Pointer to [**ConnectorDocumentSummary**](ConnectorDocumentSummary.md) |  | [optional]
**Candidate** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewConnectorSyncResponseSyncDocumentsInner

`func NewConnectorSyncResponseSyncDocumentsInner() *ConnectorSyncResponseSyncDocumentsInner`

NewConnectorSyncResponseSyncDocumentsInner instantiates a new ConnectorSyncResponseSyncDocumentsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorSyncResponseSyncDocumentsInnerWithDefaults

`func NewConnectorSyncResponseSyncDocumentsInnerWithDefaults() *ConnectorSyncResponseSyncDocumentsInner`

NewConnectorSyncResponseSyncDocumentsInnerWithDefaults instantiates a new ConnectorSyncResponseSyncDocumentsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ConnectorSyncResponseSyncDocumentsInner) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *ConnectorSyncResponseSyncDocumentsInner) HasId() bool`

HasId returns a boolean if a field has been set.

### GetExternalId

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetExternalId() string`

GetExternalId returns the ExternalId field if non-nil, zero value otherwise.

### GetExternalIdOk

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetExternalIdOk() (*string, bool)`

GetExternalIdOk returns a tuple with the ExternalId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExternalId

`func (o *ConnectorSyncResponseSyncDocumentsInner) SetExternalId(v string)`

SetExternalId sets ExternalId field to given value.

### HasExternalId

`func (o *ConnectorSyncResponseSyncDocumentsInner) HasExternalId() bool`

HasExternalId returns a boolean if a field has been set.

### GetTitle

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *ConnectorSyncResponseSyncDocumentsInner) SetTitle(v string)`

SetTitle sets Title field to given value.

### HasTitle

`func (o *ConnectorSyncResponseSyncDocumentsInner) HasTitle() bool`

HasTitle returns a boolean if a field has been set.

### GetMimeType

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetMimeType() string`

GetMimeType returns the MimeType field if non-nil, zero value otherwise.

### GetMimeTypeOk

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetMimeTypeOk() (*string, bool)`

GetMimeTypeOk returns a tuple with the MimeType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMimeType

`func (o *ConnectorSyncResponseSyncDocumentsInner) SetMimeType(v string)`

SetMimeType sets MimeType field to given value.

### HasMimeType

`func (o *ConnectorSyncResponseSyncDocumentsInner) HasMimeType() bool`

HasMimeType returns a boolean if a field has been set.

### GetModifiedAt

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetModifiedAt() time.Time`

GetModifiedAt returns the ModifiedAt field if non-nil, zero value otherwise.

### GetModifiedAtOk

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetModifiedAtOk() (*time.Time, bool)`

GetModifiedAtOk returns a tuple with the ModifiedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetModifiedAt

`func (o *ConnectorSyncResponseSyncDocumentsInner) SetModifiedAt(v time.Time)`

SetModifiedAt sets ModifiedAt field to given value.

### HasModifiedAt

`func (o *ConnectorSyncResponseSyncDocumentsInner) HasModifiedAt() bool`

HasModifiedAt returns a boolean if a field has been set.

### GetSummary

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetSummary() ConnectorDocumentSummary`

GetSummary returns the Summary field if non-nil, zero value otherwise.

### GetSummaryOk

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetSummaryOk() (*ConnectorDocumentSummary, bool)`

GetSummaryOk returns a tuple with the Summary field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSummary

`func (o *ConnectorSyncResponseSyncDocumentsInner) SetSummary(v ConnectorDocumentSummary)`

SetSummary sets Summary field to given value.

### HasSummary

`func (o *ConnectorSyncResponseSyncDocumentsInner) HasSummary() bool`

HasSummary returns a boolean if a field has been set.

### GetCandidate

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetCandidate() map[string]interface{}`

GetCandidate returns the Candidate field if non-nil, zero value otherwise.

### GetCandidateOk

`func (o *ConnectorSyncResponseSyncDocumentsInner) GetCandidateOk() (*map[string]interface{}, bool)`

GetCandidateOk returns a tuple with the Candidate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCandidate

`func (o *ConnectorSyncResponseSyncDocumentsInner) SetCandidate(v map[string]interface{})`

SetCandidate sets Candidate field to given value.

### HasCandidate

`func (o *ConnectorSyncResponseSyncDocumentsInner) HasCandidate() bool`

HasCandidate returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
