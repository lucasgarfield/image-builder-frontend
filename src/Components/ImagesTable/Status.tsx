import React, { useEffect, useState } from 'react';

import './ImageBuildStatus.scss';
import {
  Alert,
  Button,
  Flex,
  Panel,
  PanelMain,
  Popover,
  Skeleton,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  CopyIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
  OffIcon,
  PendingIcon,
} from '@patternfly/react-icons';

import {
  ClonesResponseItem,
  ComposeStatus,
  ComposesResponseItem,
  UploadStatus,
  useGetComposeStatusQuery,
} from '../../store/imageBuilderApi';

type StatusClonePropTypes = {
  clone: ClonesResponseItem;
  status: UploadStatus | undefined;
};

export const StatusClone = ({ clone, status }: StatusClonePropTypes) => {
  switch (status?.status) {
    case 'failure':
      return (
        <ErrorStatus
          icon={statuses.failureSharing.icon}
          text={statuses.failureSharing.text}
          reason={`Failed to share image to ${clone.request.region}`}
        />
      );
    case 'success':
    case 'running':
    case 'pending':
      return (
        <Status
          icon={statuses[status.status].icon}
          text={statuses[status.status].text}
        />
      );
    default:
      return <></>;
  }
};

type ComposeStatusPropTypes = {
  compose: ComposesResponseItem;
};

export const AwsDetailsStatus = ({ compose }: ComposeStatusPropTypes) => {
  const { data, isSuccess } = useGetComposeStatusQuery({
    composeId: compose.id,
  });

  if (!isSuccess) {
    return <></>;
  }

  switch (data.image_status.status) {
    case 'failure':
      return (
        <ErrorStatus
          icon={statuses[data.image_status.status].icon}
          text={statuses[data.image_status.status].text}
          reason={data?.image_status?.error?.details?.reason || ''}
        />
      );
    default:
      return (
        <Status
          icon={statuses[data.image_status.status].icon}
          text={statuses[data.image_status.status].text}
        />
      );
  }
};

type ReducedClonesByRegion = {
  [region: string]: {
    clone: ClonesResponseItem;
    status: UploadStatus | undefined;
  };
};

type AwsStatusPropTypes = {
  compose: ComposesResponseItem;
  clones: ReducedClonesByRegion;
};

export const AwsStatus = ({ compose, clones }: AwsStatusPropTypes) => {
  const { data, isSuccess } = useGetComposeStatusQuery({
    composeId: compose.id,
  });

  if (!isSuccess) {
    return <></>;
  } else if (Object.values(clones).length === 0) {
    return <CloudStatus compose={compose} />;
  }

  // TODO rename this
  const statusesX = new Set();
  statusesX.add(data.image_status.status);
  Object.values(clones).forEach((clone) => {
    statusesX.add(clone.status?.status);
  });

  if (statusesX.has('failure')) {
    return (
      <ErrorStatus
        icon={statuses['failure'].icon}
        text={'Sharing image failed'}
        reason={'Failed to share image to one or more regions.'}
      />
    );
  } else if (statusesX.has('pending')) {
    return (
      <Status icon={statuses['pending'].icon} text={statuses['pending'].text} />
    );
  } else if (statusesX.has('running')) {
    return (
      <Status icon={statuses['running'].icon} text={statuses['running'].text} />
    );
  } else if (statusesX.has('success')) {
    return (
      <Status icon={statuses['success'].icon} text={statuses['success'].text} />
    );
  } else {
    return <></>;
  }
};

type CloudStatusPropTypes = {
  compose: ComposesResponseItem;
  status: ComposeStatus;
};

export const CloudStatus = ({ compose, status }: CloudStatusPropTypes) => {
  useEffect(() => {
    if (status === 'success' || status === 'failure') {
      setPollingInterval(0);
    } else {
      setPollingInterval(8000);
    }
  }, [setPollingInterval, status]);

  if (!isSuccess) {
    return <Skeleton width="50%" />;
  }

  switch (data.image_status.status) {
    case 'failure':
      return (
        <ErrorStatus
          icon={statuses['failure'].icon}
          text={statuses['failure'].text}
          reason={data.image_status.error?.reason || ''}
        />
      );
    default:
      return (
        <Status
          icon={statuses[data.image_status.status].icon}
          text={statuses[data.image_status.status].text}
        />
      );
  }
};

type AzureStatusPropTypes = {
  status: ComposeStatus;
};

export const AzureStatus = ({ status }: AzureStatusPropTypes) => {
  switch (status.image_status.status) {
    case 'failure':
      return (
        <ErrorStatus
          icon={statuses[status.image_status.status].icon}
          text={statuses[status.image_status.status].text}
          reason={status.image_status.error?.reason || ''}
        />
      );
    default:
      return (
        <Status
          icon={statuses[status.image_status.status].icon}
          text={statuses[status.image_status.status].text}
        />
      );
  }
};

type AwsS3StatusPropTypes = {
  compose: ComposesResponseItem;
  isExpired: boolean;
  hoursToExpiration: number;
};

export const AwsS3Status = ({
  compose,
  isExpired,
  hoursToExpiration,
}: AwsS3StatusPropTypes) => {
  const { data, isSuccess } = useGetComposeStatusQuery({
    composeId: compose.id,
  });

  if (!isSuccess) {
    return <></>;
  }

  const status = data.image_status.status;

  if (isExpired) {
    return (
      <Status icon={statuses['expired'].icon} text={statuses['expired'].text} />
    );
  } else if (status === 'success') {
    return (
      <Status
        icon={statuses['expiring'].icon}
        text={`Expiring in ${hoursToExpiration} hours`}
      />
    );
  } else {
    return <Status icon={statuses[status].icon} text={statuses[status].text} />;
  }
  // TODO what about failure state?
  // maybe here we need to do an early if return for isExpired,
  // then switch on success/pending/failure etc...?
};

const statuses = {
  failure: {
    icon: <ExclamationCircleIcon className="error" />,
    text: 'Image build failed',
  },

  pending: {
    icon: <PendingIcon />,
    text: 'Image build is pending',
  },

  building: {
    icon: <InProgressIcon className="pending" />,
    text: 'Image build in progress',
  },

  uploading: {
    icon: <InProgressIcon className="pending" />,
    text: 'Image upload in progress',
  },

  registering: {
    icon: <InProgressIcon className="pending" />,
    text: 'Cloud registration in progress',
  },

  running: {
    icon: <InProgressIcon className="pending" />,
    text: 'Running',
  },

  success: {
    icon: <CheckCircleIcon className="success" />,
    text: 'Ready',
  },

  expired: {
    icon: <OffIcon />,
    text: 'Expired',
  },

  expiring: {
    icon: <ExclamationTriangleIcon className="expiring" />,
  },

  failureSharing: {
    icon: <ExclamationCircleIcon className="error" />,
    text: 'Sharing image failed',
  },

  failedClone: {
    icon: <ExclamationCircleIcon className="error" />,
    text: 'Failure sharing',
  },
};

type StatusPropTypes = {
  icon: JSX.Element;
  text: string;
};

const Status = ({ icon, text }: StatusPropTypes) => {
  return (
    <Flex className="pf-u-align-items-baseline pf-m-nowrap">
      <div className="pf-u-mr-sm">{icon}</div>
      <p>{text}</p>
    </Flex>
  );
};

type ErrorStatusPropTypes = {
  icon: JSX.Element;
  text: string;
  reason: string;
};

const ErrorStatus = ({ icon, text, reason }: ErrorStatusPropTypes) => {
  return (
    <Flex className="pf-u-align-items-baseline pf-m-nowrap">
      <div className="pf-u-mr-sm">{icon}</div>
      <Popover
        position="bottom"
        minWidth="30rem"
        bodyContent={
          <>
            <Alert variant="danger" title={text} isInline isPlain />
            <Panel isScrollable>
              <PanelMain maxHeight="25rem">
                <div className="pf-u-mt-sm">
                  <p>{reason}</p>
                  <Button
                    variant="link"
                    onClick={() => navigator.clipboard.writeText(reason)}
                    className="pf-u-pl-0 pf-u-mt-md"
                  >
                    Copy error text to clipboard <CopyIcon />
                  </Button>
                </div>
              </PanelMain>
            </Panel>
          </>
        }
      >
        <Button variant="link" className="pf-u-p-0 pf-u-font-size-sm">
          <div className="failure-button">{text}</div>
        </Button>
      </Popover>
    </Flex>
  );
};
