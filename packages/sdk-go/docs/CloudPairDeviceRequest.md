# CloudPairDeviceRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**InstallToken** | **string** |  |
**DeviceLabel** | Pointer to **string** |  | [optional]
**Platform** | Pointer to **string** |  | [optional]

## Methods

### NewCloudPairDeviceRequest

`func NewCloudPairDeviceRequest(installToken string, ) *CloudPairDeviceRequest`

NewCloudPairDeviceRequest instantiates a new CloudPairDeviceRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCloudPairDeviceRequestWithDefaults

`func NewCloudPairDeviceRequestWithDefaults() *CloudPairDeviceRequest`

NewCloudPairDeviceRequestWithDefaults instantiates a new CloudPairDeviceRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetInstallToken

`func (o *CloudPairDeviceRequest) GetInstallToken() string`

GetInstallToken returns the InstallToken field if non-nil, zero value otherwise.

### GetInstallTokenOk

`func (o *CloudPairDeviceRequest) GetInstallTokenOk() (*string, bool)`

GetInstallTokenOk returns a tuple with the InstallToken field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInstallToken

`func (o *CloudPairDeviceRequest) SetInstallToken(v string)`

SetInstallToken sets InstallToken field to given value.


### GetDeviceLabel

`func (o *CloudPairDeviceRequest) GetDeviceLabel() string`

GetDeviceLabel returns the DeviceLabel field if non-nil, zero value otherwise.

### GetDeviceLabelOk

`func (o *CloudPairDeviceRequest) GetDeviceLabelOk() (*string, bool)`

GetDeviceLabelOk returns a tuple with the DeviceLabel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeviceLabel

`func (o *CloudPairDeviceRequest) SetDeviceLabel(v string)`

SetDeviceLabel sets DeviceLabel field to given value.

### HasDeviceLabel

`func (o *CloudPairDeviceRequest) HasDeviceLabel() bool`

HasDeviceLabel returns a boolean if a field has been set.

### GetPlatform

`func (o *CloudPairDeviceRequest) GetPlatform() string`

GetPlatform returns the Platform field if non-nil, zero value otherwise.

### GetPlatformOk

`func (o *CloudPairDeviceRequest) GetPlatformOk() (*string, bool)`

GetPlatformOk returns a tuple with the Platform field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatform

`func (o *CloudPairDeviceRequest) SetPlatform(v string)`

SetPlatform sets Platform field to given value.

### HasPlatform

`func (o *CloudPairDeviceRequest) HasPlatform() bool`

HasPlatform returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
