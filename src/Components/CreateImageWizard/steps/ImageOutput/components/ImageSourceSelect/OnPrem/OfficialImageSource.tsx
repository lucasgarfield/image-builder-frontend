import React, { useMemo } from 'react';

import {
  Button,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';

import {
  useGetImageExistsQuery,
  useGetRegistryAuthStatusQuery,
  usePullImageMutation,
} from '@/store/api/backend';
import { Distributions } from '@/store/api/backend/hosted';
import { KNOWN_IMAGES } from '@/store/api/backend/onprem/constants';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  changeDistribution,
  changeImageSource,
  changeImageTypes,
  selectArchitecture,
  selectForceShowErrors,
  selectImageSource,
  selectImageSourceType,
  selectImageTypes,
  selectIsOfficialImage,
  selectIsoPayloadReference,
  type SupportedImageTypes,
} from '@/store/slices/wizard';

import ImageSelect from './ImageSelect';
import RegistryAuth from './RegistryAuth';

type PullButtonProps = {
  onPull: () => void;
  isPulling: boolean;
  isAuthenticated: boolean;
  isDisabled?: boolean;
};

const PullButton = ({
  onPull,
  isPulling,
  isAuthenticated,
  isDisabled,
}: PullButtonProps) => {
  const button = (
    <Button
      variant='secondary'
      onClick={onPull}
      isDisabled={isDisabled || isPulling}
      isAriaDisabled={!isAuthenticated}
      icon={isPulling ? <Spinner size='sm' /> : undefined}
    >
      {isPulling ? 'Pulling image...' : 'Pull latest image'}
    </Button>
  );

  if (isAuthenticated) {
    return button;
  }

  return (
    <Tooltip content='Log in to registry.redhat.io to pull images.'>
      {button}
    </Tooltip>
  );
};

const OfficialImageSource = () => {
  const dispatch = useAppDispatch();
  const arch = useAppSelector(selectArchitecture);
  const selectedRef = useAppSelector(selectImageSource);
  const imageSourceType = useAppSelector(selectImageSourceType);
  const forceShowErrors = useAppSelector(selectForceShowErrors);
  const hasOfficialSelection = useAppSelector(selectIsOfficialImage);
  const imageTypes = useAppSelector(selectImageTypes);
  const isoPayloadReference = useAppSelector(selectIsoPayloadReference);

  const showPayloadSelect =
    hasOfficialSelection && imageTypes.includes('bootable-container-iso');

  const { data: authStatus, isLoading: isAuthLoading } =
    useGetRegistryAuthStatusQuery(undefined, {
      refetchOnMountOrArgChange: true,
    });
  const isAuthenticated = authStatus?.status === 'authenticated';

  const images = useMemo(
    () => KNOWN_IMAGES.map((known) => ({ ...known, arch })),
    [arch],
  );

  // The payload container is fixed by the selected installer image;
  // the dropdown exists so its name, tag, and registry reference are
  // visible, not to offer a choice.
  const payloadItems = useMemo(() => {
    const installer = images.find((img) => img.reference === selectedRef);
    return (installer?.iso_payload_references ?? []).map((reference) => ({
      reference,
      name: installer!.name,
      distro: installer!.distro,
      arch,
      type: 'Base image',
    }));
  }, [images, selectedRef, arch]);

  // Local images can be removed outside the wizard (e.g. podman rmi),
  // so bypass the cache and re-check whenever this section mounts.
  const { data: imageExists } = useGetImageExistsQuery(
    { reference: selectedRef! },
    { skip: !selectedRef, refetchOnMountOrArgChange: true },
  );
  const { data: payloadExists } = useGetImageExistsQuery(
    { reference: isoPayloadReference! },
    { skip: !isoPayloadReference, refetchOnMountOrArgChange: true },
  );

  // The mutation state is scoped to the reference it was started with,
  // so switching to another image doesn't show its busy/error state.
  const [pullImage, pullState] = usePullImageMutation();
  const isPulling =
    pullState.isLoading && pullState.originalArgs?.reference === selectedRef;
  const isPullError =
    pullState.isError && pullState.originalArgs?.reference === selectedRef;

  const [pullPayloadImage, payloadPullState] = usePullImageMutation();
  const isPullingPayload =
    payloadPullState.isLoading &&
    payloadPullState.originalArgs?.reference === isoPayloadReference;
  const isPayloadPullError =
    payloadPullState.isError &&
    payloadPullState.originalArgs?.reference === isoPayloadReference;

  const showSelectionError = forceShowErrors && !hasOfficialSelection;
  const showPullValidation = hasOfficialSelection && imageExists === false;
  const showPayloadPullValidation =
    showPayloadSelect && payloadExists === false;

  const errorId = showSelectionError
    ? 'official-image-selection-error'
    : showPullValidation
      ? 'official-image-pull-error'
      : undefined;

  if (imageSourceType !== 'official') {
    return null;
  }

  return (
    <>
      <RegistryAuth />
      <FormGroup label='Bootc container' className='pf-v6-u-mt-md'>
        <Flex
          spaceItems={{ default: 'spaceItemsMd' }}
          alignItems={{ default: 'alignItemsFlexStart' }}
        >
          <FlexItem>
            <ImageSelect
              items={images}
              selectedRef={selectedRef}
              ariaDescribedBy={errorId}
              onSelect={(_event, selection) => {
                const selected = images.find(
                  (img) => img.reference === selection,
                );
                if (selected) {
                  dispatch(changeImageSource(selected.reference));
                  dispatch(
                    changeDistribution(selected.distro as Distributions),
                  );
                  dispatch(
                    changeImageTypes([selected.type as SupportedImageTypes]),
                  );
                }
              }}
              getLabel={(item) => item.name}
              placeholder={'Select an official image'}
            />
          </FlexItem>
          {hasOfficialSelection && (
            <FlexItem className='pf-v6-u-mt-md'>
              <PullButton
                onPull={() => pullImage({ reference: selectedRef! })}
                isPulling={isPulling}
                isAuthenticated={isAuthenticated}
                isDisabled={isAuthLoading}
              />
            </FlexItem>
          )}
        </Flex>
        {showSelectionError && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem
                variant='error'
                id='official-image-selection-error'
              >
                Select an official image to proceed.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
        {showPullValidation && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant='error' id='official-image-pull-error'>
                {isPullError
                  ? 'Failed to pull image. Please try again.'
                  : 'Bootc container must be pulled before proceeding.'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>
      {showPayloadSelect && (
        <FormGroup label='Payload container' className='pf-v6-u-mt-md'>
          <Flex
            spaceItems={{ default: 'spaceItemsMd' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
          >
            <FlexItem>
              <ImageSelect
                items={payloadItems}
                selectedRef={isoPayloadReference}
                onSelect={() => {}}
                getLabel={(item) => item.name}
                placeholder='Select a payload container'
                isOptionDisabled={() => true}
                ariaDescribedBy={
                  showPayloadPullValidation
                    ? 'payload-image-pull-error'
                    : undefined
                }
              />
            </FlexItem>
            <FlexItem className='pf-v6-u-mt-md'>
              <PullButton
                onPull={() =>
                  pullPayloadImage({ reference: isoPayloadReference! })
                }
                isPulling={isPullingPayload}
                isAuthenticated={isAuthenticated}
                isDisabled={isAuthLoading || !isoPayloadReference}
              />
            </FlexItem>
          </Flex>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                The installer deploys this base image.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
          {showPayloadPullValidation && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant='error' id='payload-image-pull-error'>
                  {isPayloadPullError
                    ? 'Failed to pull image. Please try again.'
                    : 'Payload container must be pulled before proceeding.'}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>
      )}
    </>
  );
};

export default OfficialImageSource;
