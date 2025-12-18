import {
  Awss3UploadStatus,
  AwsUploadRequestOptions,
  AzureUploadRequestOptions,
  AzureUploadStatus,
  GcpUploadRequestOptions,
  GcpUploadStatus,
  OciUploadStatus,
  UploadRequest,
  UploadStatus,
} from './imageBuilderApi';

export const isGcpUploadRequestOptions = (
  options: UploadRequest['options'],
): options is GcpUploadRequestOptions => {
  return true;
};

export const isAwsUploadRequestOptions = (
  options: UploadRequest['options'],
): options is AwsUploadRequestOptions => {
  return true;
};

export const isAzureUploadRequestOptions = (
  options: UploadRequest['options'],
): options is AzureUploadRequestOptions => {
  // Unnecessary conditional, the types have no overlap - disable-autofix/@typescript-eslint/no-unnecessary-condition
  // eslint-disable-next-line disable-autofix/@typescript-eslint/no-unnecessary-condition
  return (options as AzureUploadRequestOptions).resource_group !== undefined;
};

export const isGcpUploadStatus = (
  status: UploadStatus['options'],
): status is GcpUploadStatus => {
  // Unnecessary conditional, the types have no overlap - disable-autofix/@typescript-eslint/no-unnecessary-condition
  // eslint-disable-next-line disable-autofix/@typescript-eslint/no-unnecessary-condition
  return (status as GcpUploadStatus).project_id !== undefined;
};

export const isOciUploadStatus = (
  status: UploadStatus['options'],
): status is OciUploadStatus => {
  // Unnecessary conditional, the types have no overlap - disable-autofix/@typescript-eslint/no-unnecessary-condition
  // eslint-disable-next-line disable-autofix/@typescript-eslint/no-unnecessary-condition
  return (status as OciUploadStatus).url !== undefined;
};

export const isAwss3UploadStatus = (
  status: UploadStatus['options'],
): status is Awss3UploadStatus => {
  // Unnecessary conditional, the types have no overlap - disable-autofix/@typescript-eslint/no-unnecessary-condition
  // eslint-disable-next-line disable-autofix/@typescript-eslint/no-unnecessary-condition
  return (status as Awss3UploadStatus).url !== undefined;
};

export const isAzureUploadStatus = (
  status: UploadStatus['options'],
): status is AzureUploadStatus => {
  // Unnecessary conditional, the types have no overlap - disable-autofix/@typescript-eslint/no-unnecessary-condition
  // eslint-disable-next-line disable-autofix/@typescript-eslint/no-unnecessary-condition
  return (status as AzureUploadStatus).image_name !== undefined;
};
