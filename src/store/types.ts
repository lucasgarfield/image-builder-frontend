import {
  AwsUploadRequestOptions,
  Awss3UploadStatus,
  AzureUploadRequestOptions,
  ClonesResponseItem,
  GcpUploadRequestOptions,
  GcpUploadStatus,
  UploadRequest,
  UploadStatus,
} from './imageBuilderApi';

export const isGcpUploadRequestOptions = (
  options: UploadRequest['options']
): options is GcpUploadRequestOptions => {
  return (options as GcpUploadRequestOptions).share_with_accounts !== undefined;
};

export const isAwsUploadRequestOptions = (
  options: UploadRequest['options']
): options is AwsUploadRequestOptions => {
  return (options as AwsUploadRequestOptions).share_with_sources !== undefined;
};

export const isAzureUploadRequestOptions = (
  options: UploadRequest['options']
): options is AzureUploadRequestOptions => {
  return (options as AzureUploadRequestOptions).resource_group !== undefined;
};

export const isGcpUploadStatus = (
  status: UploadStatus['options']
): status is GcpUploadStatus => {
  return (status as GcpUploadStatus).project_id !== undefined;
};

export const isAwss3UploadStatus = (
  status: UploadStatus['options']
): status is Awss3UploadStatus => {
  return (status as Awss3UploadStatus).url !== undefined;
};

export type ClonesByRegion = {
  [region: string]: Array<{
    clone: ClonesResponseItem;
    status: UploadStatus | undefined;
  }>;
};

export type ReducedClonesByRegion = {
  [region: string]: {
    clone: ClonesResponseItem;
    status: UploadStatus | undefined;
  };
};
