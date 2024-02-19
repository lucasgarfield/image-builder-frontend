import { Store } from 'redux';

import { RootState } from '../../../store';
import {
  AwsUploadRequestOptions,
  BlueprintResponse,
  CreateBlueprintRequest,
  Customizations,
  GcpUploadRequestOptions,
  ImageRequest,
  ImageTypes,
  Subscription,
  UploadTypes,
} from '../../../store/imageBuilderApi';
import {
  selectActivationKey,
  selectArchitecture,
  selectAwsAccountId,
  selectAwsShareMethod,
  selectAwsSource,
  selectBaseUrl,
  selectBlueprintDescription,
  selectBlueprintName,
  selectDistribution,
  selectGcpAccountType,
  selectGcpEmail,
  selectGcpShareMethod,
  selectImageTypes,
  selectRegistrationType,
  selectServerUrl,
  wizardState,
} from '../../../store/wizardSlice';
import { GcpAccountType } from '../steps/TargetEnvironment/Gcp';

/**
 * This function maps the wizard state to a valid CreateBlueprint request object
 * @param {string} orgID organization ID
 * @returns {CreateBlueprintRequest} blueprint creation request payload
 */
export const mapRequestFromState = (
  store: Store,
  orgID: string
): CreateBlueprintRequest => {
  const state = store.getState();
  const imageRequests = getImageRequests(state);
  const customizations = getCustomizations(state, orgID);

  return {
    name: selectBlueprintName(state),
    description: selectBlueprintDescription(state),
    distribution: selectDistribution(state),
    image_requests: imageRequests,
    customizations,
  };
};

/**
 * This function maps the blueprint response to the wizard state, used to populate the wizard with the blueprint details
 * @param request BlueprintResponse
 * @param source  V1ListSourceResponseItem
 * @returns wizardState
 */
export const mapRequestToState = (request: BlueprintResponse): wizardState => {
  const gcp = request.image_requests.find(
    (image) => image.image_type === 'gcp'
  );
  const aws = request.image_requests.find(
    (image) => image.image_type === 'aws'
  );
  const awsUploadOptions = aws?.upload_request
    .options as AwsUploadRequestOptions;
  const gcpUploadOptions = gcp?.upload_request
    .options as GcpUploadRequestOptions;
  return {
    details: {
      blueprintName: request.name,
      blueprintDescription: request.description,
    },
    env: {
      serverUrl: request.customizations.subscription?.['server-url'] || '',
      baseUrl: request.customizations.subscription?.['base-url'] || '',
    },
    // TODO: add openscap support
    openScap: {
      profile: undefined,
      kernel: {
        kernelAppend: '',
      },
      services: {
        disabled: [],
        enabled: [],
      },
    },
    architecture: request.image_requests[0].architecture,
    distribution: request.distribution,
    imageTypes: request.image_requests.map((image) => image.image_type),
    gcp: {
      shareMethod: gcpUploadOptions?.share_with_accounts
        ? 'withGoogle'
        : 'withInsights',
      accountType: gcpUploadOptions?.share_with_accounts?.[0].split(
        ':'
      )[0] as GcpAccountType,
      email: gcpUploadOptions?.share_with_accounts?.[0].split(':')[1] || '',
    },
    aws: {
      accountId: awsUploadOptions?.share_with_accounts?.[0] || '',
      shareMethod: awsUploadOptions?.share_with_sources ? 'sources' : 'manual',
      source: { id: awsUploadOptions?.share_with_sources?.[0] },
    },
    repositories: {
      customRepositories: request.customizations.custom_repositories || [],
    },
    registration: {
      registrationType: request.customizations?.subscription?.rhc
        ? 'register-now-rhc'
        : 'register-now-insights',
      activationKey: request.customizations.subscription?.['activation-key'],
    },
  };
};

const getImageRequests = (state: RootState): ImageRequest[] => {
  const imageTypes = selectImageTypes(state);
  return imageTypes.map((type) => ({
    architecture: selectArchitecture(state),
    image_type: type,
    upload_request: {
      type: uploadTypeByTargetEnv(type),
      options: getImageOptions(type, state),
    },
  }));
};

const uploadTypeByTargetEnv = (imageType: ImageTypes): UploadTypes => {
  switch (imageType) {
    case 'aws':
      return 'aws';
    case 'gcp':
      return 'gcp';
    case 'azure':
      return 'azure';
    case 'oci':
      return 'oci.objectstorage';
    case 'wsl':
      return 'aws.s3';
    case 'image-installer':
      return 'aws.s3';
    case 'vsphere':
      return 'aws.s3';
    case 'ami':
      return 'aws';
    default: {
      // TODO: add edge type
      throw new Error(`image type: ${imageType} has no implementation yet`);
    }
  }
};
const getImageOptions = (
  imageType: ImageTypes,
  state: RootState
): AwsUploadRequestOptions | GcpUploadRequestOptions => {
  switch (imageType) {
    case 'aws':
      if (selectAwsShareMethod(state) === 'sources')
        return { share_with_sources: [selectAwsSource(state)?.id || ''] };
      else return { share_with_accounts: [selectAwsAccountId(state)] };
    case 'gcp': {
      let googleAccount: string = '';
      if (selectGcpShareMethod(state) === 'withGoogle') {
        const gcpEmail = selectGcpEmail(state);
        switch (selectGcpAccountType(state)) {
          case 'google':
            googleAccount = `user:${gcpEmail}`;
            break;
          case 'service':
            googleAccount = `serviceAccount:${gcpEmail}`;
            break;
          case 'group':
            googleAccount = `group:${gcpEmail}`;
            break;
          case 'domain':
            googleAccount = `domain:${gcpEmail}`;
        }
        return { share_with_accounts: [googleAccount] };
      } else {
        // TODO: GCP withInsights is not implemented yet
        return {};
      }
    }
  }
  return {};
};

const getCustomizations = (state: RootState, orgID: string): Customizations => {
  return {
    containers: undefined,
    directories: undefined,
    files: undefined,
    subscription: getSubscription(state, orgID),
    packages: undefined,
    payload_repositories: undefined,
    custom_repositories: undefined,
    openscap: undefined,
    filesystem: undefined,
    users: undefined,
    services: undefined,
    hostname: undefined,
    kernel: undefined,
    groups: undefined,
    timezone: undefined,
    locale: undefined,
    firewall: undefined,
    installation_device: undefined,
    fdo: undefined,
    ignition: undefined,
    partitioning_mode: undefined,
    fips: undefined,
  };
};

const getSubscription = (
  state: RootState,
  orgID: string
): Subscription | undefined => {
  const registrationType = selectRegistrationType(state);
  const activationKey = selectActivationKey(state);

  if (registrationType === 'register-later') {
    return undefined;
  }

  if (activationKey === undefined) {
    throw new Error(
      'Activation key unexpectedly undefined while generating subscription customization'
    );
  }

  const initialSubscription = {
    'activation-key': activationKey,
    organization: Number(orgID),
    'server-url': selectServerUrl(state),
    'base-url': selectBaseUrl(state),
  };

  switch (registrationType) {
    case 'register-now-rhc':
      return { ...initialSubscription, insights: true, rhc: true };
    case 'register-now-insights':
      return { ...initialSubscription, insights: true, rhc: false };
    case 'register-now':
      return { ...initialSubscription, insights: false, rhc: false };
  }
};
