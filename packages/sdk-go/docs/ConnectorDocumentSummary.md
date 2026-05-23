# ConnectorDocumentSummary

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SchemaVersion** | Pointer to **interface{}** |  | [optional]
**Provider** | Pointer to **string** |  | [optional]
**ConnectionId** | Pointer to **string** |  | [optional]
**ExternalId** | Pointer to **string** |  | [optional]
**Title** | Pointer to **string** |  | [optional]
**MimeType** | Pointer to **string** |  | [optional]
**Excerpt** | Pointer to **string** |  | [optional]
**ContentHash** | Pointer to **string** |  | [optional]
**SourceRefs** | Pointer to **[]map[string]interface{}** |  | [optional]
**Metadata** | Pointer to **map[string]interface{}** |  | [optional]

## Methods

### NewConnectorDocumentSummary

`func NewConnectorDocumentSummary() *ConnectorDocumentSummary`

NewConnectorDocumentSummary instantiates a new ConnectorDocumentSummary object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectorDocumentSummaryWithDefaults

`func NewConnectorDocumentSummaryWithDefaults() *ConnectorDocumentSummary`

NewConnectorDocumentSummaryWithDefaults instantiates a new ConnectorDocumentSummary object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSchemaVersion

`func (o *ConnectorDocumentSummary) GetSchemaVersion() interface{}`

GetSchemaVersion returns the SchemaVersion field if non-nil, zero value otherwise.

### GetSchemaVersionOk

`func (o *ConnectorDocumentSummary) GetSchemaVersionOk() (*interface{}, bool)`

GetSchemaVersionOk returns a tuple with the SchemaVersion field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSchemaVersion

`func (o *ConnectorDocumentSummary) SetSchemaVersion(v interface{})`

SetSchemaVersion sets SchemaVersion field to given value.

### HasSchemaVersion

`func (o *ConnectorDocumentSummary) HasSchemaVersion() bool`

HasSchemaVersion returns a boolean if a field has been set.

### SetSchemaVersionNil

`func (o *ConnectorDocumentSummary) SetSchemaVersionNil(b bool)`

 SetSchemaVersionNil sets the value for SchemaVersion to be an explicit nil

### UnsetSchemaVersion
`func (o *ConnectorDocumentSummary) UnsetSchemaVersion()`

UnsetSchemaVersion ensures that no value is present for SchemaVersion, not even an explicit nil
### GetProvider

`func (o *ConnectorDocumentSummary) GetProvider() string`

GetProvider returns the Provider field if non-nil, zero value otherwise.

### GetProviderOk

`func (o *ConnectorDocumentSummary) GetProviderOk() (*string, bool)`

GetProviderOk returns a tuple with the Provider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProvider

`func (o *ConnectorDocumentSummary) SetProvider(v string)`

SetProvider sets Provider field to given value.

### HasProvider

`func (o *ConnectorDocumentSummary) HasProvider() bool`

HasProvider returns a boolean if a field has been set.

### GetConnectionId

`func (o *ConnectorDocumentSummary) GetConnectionId() string`

GetConnectionId returns the ConnectionId field if non-nil, zero value otherwise.

### GetConnectionIdOk

`func (o *ConnectorDocumentSummary) GetConnectionIdOk() (*string, bool)`

GetConnectionIdOk returns a tuple with the ConnectionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConnectionId

`func (o *ConnectorDocumentSummary) SetConnectionId(v string)`

SetConnectionId sets ConnectionId field to given value.

### HasConnectionId

`func (o *ConnectorDocumentSummary) HasConnectionId() bool`

HasConnectionId returns a boolean if a field has been set.

### GetExternalId

`func (o *ConnectorDocumentSummary) GetExternalId() string`

GetExternalId returns the ExternalId field if non-nil, zero value otherwise.

### GetExternalIdOk

`func (o *ConnectorDocumentSummary) GetExternalIdOk() (*string, bool)`

GetExternalIdOk returns a tuple with the ExternalId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExternalId

`func (o *ConnectorDocumentSummary) SetExternalId(v string)`

SetExternalId sets ExternalId field to given value.

### HasExternalId

`func (o *ConnectorDocumentSummary) HasExternalId() bool`

HasExternalId returns a boolean if a field has been set.

### GetTitle

`func (o *ConnectorDocumentSummary) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *ConnectorDocumentSummary) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *ConnectorDocumentSummary) SetTitle(v string)`

SetTitle sets Title field to given value.

### HasTitle

`func (o *ConnectorDocumentSummary) HasTitle() bool`

HasTitle returns a boolean if a field has been set.

### GetMimeType

`func (o *ConnectorDocumentSummary) GetMimeType() string`

GetMimeType returns the MimeType field if non-nil, zero value otherwise.

### GetMimeTypeOk

`func (o *ConnectorDocumentSummary) GetMimeTypeOk() (*string, bool)`

GetMimeTypeOk returns a tuple with the MimeType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMimeType

`func (o *ConnectorDocumentSummary) SetMimeType(v string)`

SetMimeType sets MimeType field to given value.

### HasMimeType

`func (o *ConnectorDocumentSummary) HasMimeType() bool`

HasMimeType returns a boolean if a field has been set.

### GetExcerpt

`func (o *ConnectorDocumentSummary) GetExcerpt() string`

GetExcerpt returns the Excerpt field if non-nil, zero value otherwise.

### GetExcerptOk

`func (o *ConnectorDocumentSummary) GetExcerptOk() (*string, bool)`

GetExcerptOk returns a tuple with the Excerpt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExcerpt

`func (o *ConnectorDocumentSummary) SetExcerpt(v string)`

SetExcerpt sets Excerpt field to given value.

### HasExcerpt

`func (o *ConnectorDocumentSummary) HasExcerpt() bool`

HasExcerpt returns a boolean if a field has been set.

### GetContentHash

`func (o *ConnectorDocumentSummary) GetContentHash() string`

GetContentHash returns the ContentHash field if non-nil, zero value otherwise.

### GetContentHashOk

`func (o *ConnectorDocumentSummary) GetContentHashOk() (*string, bool)`

GetContentHashOk returns a tuple with the ContentHash field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContentHash

`func (o *ConnectorDocumentSummary) SetContentHash(v string)`

SetContentHash sets ContentHash field to given value.

### HasContentHash

`func (o *ConnectorDocumentSummary) HasContentHash() bool`

HasContentHash returns a boolean if a field has been set.

### GetSourceRefs

`func (o *ConnectorDocumentSummary) GetSourceRefs() []map[string]interface{}`

GetSourceRefs returns the SourceRefs field if non-nil, zero value otherwise.

### GetSourceRefsOk

`func (o *ConnectorDocumentSummary) GetSourceRefsOk() (*[]map[string]interface{}, bool)`

GetSourceRefsOk returns a tuple with the SourceRefs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSourceRefs

`func (o *ConnectorDocumentSummary) SetSourceRefs(v []map[string]interface{})`

SetSourceRefs sets SourceRefs field to given value.

### HasSourceRefs

`func (o *ConnectorDocumentSummary) HasSourceRefs() bool`

HasSourceRefs returns a boolean if a field has been set.

### GetMetadata

`func (o *ConnectorDocumentSummary) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *ConnectorDocumentSummary) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *ConnectorDocumentSummary) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *ConnectorDocumentSummary) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
