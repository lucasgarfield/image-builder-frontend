import React, { Suspense, useState, useMemo } from 'react';

import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { useLoadModule, useScalprum } from '@scalprum/react-core';
import { useNavigate } from 'react-router-dom';

import { MODAL_ANCHOR } from '../../constants';
import {
  ComposeStatus,
  ComposesResponseItem,
  ImageTypes,
  useGetComposeStatusQuery,
} from '../../store/imageBuilderApi';
import { resolveRelPath } from '../../Utilities/path';

type CloudInstancePropTypes = {
  compose: ComposesResponseItem;
};

export const CloudInstance = ({ compose }: CloudInstancePropTypes) => {
  const { initialized: chromeInitialized } = useChrome();

  const scalprum = useScalprum();
  const hasProvisioning = chromeInitialized && scalprum.config?.provisioning;

  const { data: status } = useGetComposeStatusQuery({
    composeId: compose.id,
  });

  if (status?.image_status.status !== 'success') return <></>;

  if (hasProvisioning) {
    return <ProvisioningLink compose={compose} status={status} />;
  } else {
    return <></>;
  }
};

type ProvisioningLinkPropTypes = {
  compose: ComposesResponseItem;
  status: ComposeStatus;
};

const ProvisioningLink = ({ compose, status }: ProvisioningLinkPropTypes) => {
  const [wizardOpen, openWizard] = useState(false);
  const [{ default: ProvisioningWizard }, error] = useLoadModule(
    {
      appName: 'provisioning', // optional
      scope: 'provisioning',
      module: './ProvisioningWizard',
      // processor: (val) => val, // optional
    },
    {},
    {}
  );

  const appendTo = useMemo(() => document.querySelector(MODAL_ANCHOR), []);

  const provider = getImageProvider(compose);

  if (error) {
    return <>Error!</>;
  }

  return (
    <Suspense fallback="loading...">
      <Button variant="link" isInline onClick={() => openWizard(true)}>
        Launch
      </Button>
      {wizardOpen && (
        <Modal
          isOpen
          hasNoBodyWrapper
          appendTo={appendTo}
          showClose={false}
          variant={ModalVariant.large}
          aria-label="Open launch wizard"
        >
          <ProvisioningWizard
            onClose={() => openWizard(false)}
            image={{
              name: compose.image_name || compose.id,
              id: compose.id,
              architecture:
                compose.request.image_requests[0].upload_request.options,
              provider: provider,
              sourceIDs:
                compose.request.image_requests[0].upload_request?.options
                  .share_with_sources,
              accountIDs:
                compose.request.image_requests[0].upload_request?.options
                  .share_with_accounts,
              uploadOptions:
                compose.request.image_requests[0].upload_request.options,
              uploadStatus: status.image_status.upload_status,
              // For backward compatibility only, remove once Provisioning ready (deploys):
              // https://github.com/RHEnVision/provisioning-frontend/pull/238
              sourceId:
                compose.request.image_requests[0].upload_request?.options
                  .share_with_sources[0],
            }}
          />
        </Modal>
      )}
    </Suspense>
  );
};

const getImageProvider = (compose: ComposesResponseItem) => {
  const imageType = compose.request.image_requests[0].image_type;
  switch (imageType) {
    case 'aws':
      return 'aws';
    case 'ami':
      return 'aws';
    case 'azure':
      return 'azure';
    case 'gcp':
      return 'gcp';
    default:
      //TODO check with Provisioning: what if imageType is not 'aws', 'ami', or 'azure'?
      return 'aws';
  }
};

type AwsS3InstancePropTypes = {
  compose: ComposesResponseItem;
  status: ComposeStatus | undefined;
  isExpired: boolean;
};

export const AwsS3Instance = ({
  compose,
  status,
  isExpired,
}: AwsS3InstancePropTypes) => {
  const navigate = useNavigate();

  const fileExtensions: { [key in ImageTypes]: string } = {
    vsphere: '.vmdk',
    'vsphere-ova': '.ova',
    'guest-image': '.qcow2',
    'image-installer': '.iso',
    wsl: '.tar.gz',
  };

  if (status === undefined) {
    return <></>;
  } else if (!isExpired) {
    return (
      <Button
        component="a"
        target="_blank"
        variant="link"
        isInline
        href={status.image_status.upload_status?.options.url}
      >
        Download ({fileExtensions[compose.request.image_requests[0].image_type]}
        )
      </Button>
    );
  } else {
    return (
      <Button
        component="a"
        target="_blank"
        variant="link"
        onClick={() => navigate(resolveRelPath(`imagewizard/${compose.id}`))}
        isInline
      >
        Recreate image
      </Button>
    );
  }
};
