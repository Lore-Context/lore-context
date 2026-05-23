# CloudDevice

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **string** |  | [optional]
**VaultId** | Pointer to **string** |  | [optional]
**AccountId** | Pointer to **string** |  | [optional]
**Label** | Pointer to **string** |  | [optional]
**Platform** | Pointer to **string** |  | [optional]
**Status** | Pointer to **string** |  | [optional]
**PairedAt** | Pointer to **time.Time** |  | [optional]
**LastSeenAt** | Pointer to **time.Time** |  | [optional]

## Methods

### NewCloudDevice

`func NewCloudDevice() *CloudDevice`

NewCloudDevice instantiates a new CloudDevice object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCloudDeviceWithDefaults

`func NewCloudDeviceWithDefaults() *CloudDevice`

NewCloudDeviceWithDefaults instantiates a new CloudDevice object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *CloudDevice) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *CloudDevice) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *CloudDevice) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *CloudDevice) HasId() bool`

HasId returns a boolean if a field has been set.

### GetVaultId

`func (o *CloudDevice) GetVaultId() string`

GetVaultId returns the VaultId field if non-nil, zero value otherwise.

### GetVaultIdOk

`func (o *CloudDevice) GetVaultIdOk() (*string, bool)`

GetVaultIdOk returns a tuple with the VaultId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVaultId

`func (o *CloudDevice) SetVaultId(v string)`

SetVaultId sets VaultId field to given value.

### HasVaultId

`func (o *CloudDevice) HasVaultId() bool`

HasVaultId returns a boolean if a field has been set.

### GetAccountId

`func (o *CloudDevice) GetAccountId() string`

GetAccountId returns the AccountId field if non-nil, zero value otherwise.

### GetAccountIdOk

`func (o *CloudDevice) GetAccountIdOk() (*string, bool)`

GetAccountIdOk returns a tuple with the AccountId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccountId

`func (o *CloudDevice) SetAccountId(v string)`

SetAccountId sets AccountId field to given value.

### HasAccountId

`func (o *CloudDevice) HasAccountId() bool`

HasAccountId returns a boolean if a field has been set.

### GetLabel

`func (o *CloudDevice) GetLabel() string`

GetLabel returns the Label field if non-nil, zero value otherwise.

### GetLabelOk

`func (o *CloudDevice) GetLabelOk() (*string, bool)`

GetLabelOk returns a tuple with the Label field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLabel

`func (o *CloudDevice) SetLabel(v string)`

SetLabel sets Label field to given value.

### HasLabel

`func (o *CloudDevice) HasLabel() bool`

HasLabel returns a boolean if a field has been set.

### GetPlatform

`func (o *CloudDevice) GetPlatform() string`

GetPlatform returns the Platform field if non-nil, zero value otherwise.

### GetPlatformOk

`func (o *CloudDevice) GetPlatformOk() (*string, bool)`

GetPlatformOk returns a tuple with the Platform field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatform

`func (o *CloudDevice) SetPlatform(v string)`

SetPlatform sets Platform field to given value.

### HasPlatform

`func (o *CloudDevice) HasPlatform() bool`

HasPlatform returns a boolean if a field has been set.

### GetStatus

`func (o *CloudDevice) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *CloudDevice) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *CloudDevice) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *CloudDevice) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetPairedAt

`func (o *CloudDevice) GetPairedAt() time.Time`

GetPairedAt returns the PairedAt field if non-nil, zero value otherwise.

### GetPairedAtOk

`func (o *CloudDevice) GetPairedAtOk() (*time.Time, bool)`

GetPairedAtOk returns a tuple with the PairedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPairedAt

`func (o *CloudDevice) SetPairedAt(v time.Time)`

SetPairedAt sets PairedAt field to given value.

### HasPairedAt

`func (o *CloudDevice) HasPairedAt() bool`

HasPairedAt returns a boolean if a field has been set.

### GetLastSeenAt

`func (o *CloudDevice) GetLastSeenAt() time.Time`

GetLastSeenAt returns the LastSeenAt field if non-nil, zero value otherwise.

### GetLastSeenAtOk

`func (o *CloudDevice) GetLastSeenAtOk() (*time.Time, bool)`

GetLastSeenAtOk returns a tuple with the LastSeenAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastSeenAt

`func (o *CloudDevice) SetLastSeenAt(v time.Time)`

SetLastSeenAt sets LastSeenAt field to given value.

### HasLastSeenAt

`func (o *CloudDevice) HasLastSeenAt() bool`

HasLastSeenAt returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
