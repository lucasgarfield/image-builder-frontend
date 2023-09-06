import React from 'react';

import {
  ClipboardCopy,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListDescription,
  DescriptionListTerm,
  Button,
  Spinner,
  Popover,
  Alert,
  Skeleton,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

import ClonesTable, { ReducedClonesByRegion } from './ClonesTable';

import { extractProvisioningList } from '../../store/helpers';
import {
  ComposesResponseItem,
  useGetComposeStatusQuery,
} from '../../store/imageBuilderApi';
import { useGetSourceListQuery } from '../../store/provisioningApi';
import {
  isGcpUploadRequestOptions,
  isGcpUploadStatus,
} from '../../store/types';

const SourceNotFoundPopover = () => {
  return (
    <Popover
      position="bottom"
      bodyContent={
        <>
          <Alert
            variant="danger"
            title="Source name cannot be loaded"
            className="pf-u-pb-md"
            isInline
            isPlain
          />
          <p>
            The information about the source cannot be loaded. Please check the
            source was not removed and try again later.
          </p>
          <br />
          <Button
            component="a"
            target="_blank"
            variant="link"
            icon={<ExternalLinkAltIcon />}
            iconPosition="right"
            isInline
            href={'settings/sources'}
          >
            Manage sources here
          </Button>
        </>
      }
    >
      <Button variant="link" className="pf-u-p-0 pf-u-font-size-sm">
        <div className="failure-button">Source name cannot be loaded</div>
      </Button>
    </Popover>
  );
};

const AzureSourceName = ({ id }) => {
  const { data: rawSources, isSuccess } = useGetSourceListQuery({
    provider: 'azure',
  });
  const sources = extractProvisioningList(rawSources);

  if (isSuccess) {
    const sourcename = sources.find((source) => source.id === id);
    if (sourcename) {
      return <p>{sourcename.name}</p>;
    } else {
      return <SourceNotFoundPopover />;
    }
  } else {
    return <Spinner isSVG size="md" />;
  }
};

type AwsSourceNamePropTypes = {
  id: string;
};

const AwsSourceName = ({ id }: AwsSourceNamePropTypes) => {
  const { data: rawSources, isSuccess } = useGetSourceListQuery({
    provider: 'aws',
  });
  const sources = extractProvisioningList(rawSources);

  if (isSuccess) {
    const sourcename = sources.find((source) => source.id === id);
    if (sourcename) {
      return <p>{sourcename.name}</p>;
    } else {
      return <SourceNotFoundPopover />;
    }
  } else {
    return <Spinner isSVG size="md" />;
  }
};

const parseGcpSharedWith = (sharedWith) => {
  const splitGCPSharedWith = sharedWith[0].split(':');
  return splitGCPSharedWith[1];
};

type AwsDetailsPropTypes = {
  compose: ComposesResponseItem;
  reducedClonesByRegion: ReducedClonesByRegion;
};

export const AwsDetails = ({
  compose,
  reducedClonesByRegion,
}: AwsDetailsPropTypes) => {
  return (
    <>
      <div className="pf-u-font-weight-bold pf-u-pb-md">Build Information</div>
      <DescriptionList isHorizontal isCompact className=" pf-u-pl-xl">
        <DescriptionListGroup>
          <DescriptionListTerm>UUID</DescriptionListTerm>
          <DescriptionListDescription>
            <ClipboardCopy
              hoverTip="Copy"
              clickTip="Copied"
              variant="inline-compact"
              ouiaId="aws-uuid"
            >
              {compose.id}
            </ClipboardCopy>
          </DescriptionListDescription>
        </DescriptionListGroup>
        {compose.request.image_requests[0].upload_request.options
          .share_with_sources && (
          <DescriptionListGroup>
            <DescriptionListTerm>Source</DescriptionListTerm>
            <DescriptionListDescription>
              <AwsSourceName
                id={
                  compose.request.image_requests[0].upload_request.options
                    .share_with_sources?.[0]
                }
              />
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
        {compose.request.image_requests[0].upload_request.options
          .share_with_accounts?.[0] && (
          <DescriptionListGroup>
            <DescriptionListTerm>Shared with</DescriptionListTerm>
            <DescriptionListDescription>
              <Button
                component="a"
                target="_blank"
                variant="link"
                icon={<ExternalLinkAltIcon />}
                iconPosition="right"
                isInline
                // the format of an account link is taken from
                // https://docs.aws.amazon.com/signin/latest/userguide/sign-in-urls-defined.html
                href={`https://${compose.request.image_requests[0].upload_request.options.share_with_accounts[0]}.signin.aws.amazon.com/console/`}
              >
                {
                  compose.request.image_requests[0].upload_request.options
                    .share_with_accounts[0]
                }
              </Button>
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
      <>
        <br />
        <div className="pf-u-font-weight-bold pf-u-pb-md">
          Cloud Provider Identifiers
        </div>
      </>
      <ClonesTable
        compose={compose}
        reducedClonesByRegion={reducedClonesByRegion}
      />
    </>
  );
};

type AzureDetailsPropTypes = {
  compose: ComposesResponseItem;
};

export const AzureDetails = ({ compose }: AzureDetailsPropTypes) => {
  const { data } = useGetComposeStatusQuery({ composeId: compose.id });

  const status = data?.image_status.status;
  const imageName = compose.request.image_name;
  const sourceId =
    compose.request.image_requests[0].upload_request.options.source_id;
  const resourceGroup =
    compose.request.image_requests[0].upload_request.options.resource_group;

  return (
    <>
      <div className="pf-u-font-weight-bold pf-u-pb-md">Build Information</div>
      <DescriptionList isHorizontal isCompact className=" pf-u-pl-xl">
        <DescriptionListGroup>
          <DescriptionListTerm>UUID</DescriptionListTerm>
          <DescriptionListDescription>
            <ClipboardCopy
              hoverTip="Copy"
              clickTip="Copied"
              variant="inline-compact"
              ouiaId="azure-uuid"
            >
              {compose.id}
            </ClipboardCopy>
          </DescriptionListDescription>
        </DescriptionListGroup>
        {sourceId && (
          <DescriptionListGroup>
            <DescriptionListTerm>Source</DescriptionListTerm>
            <DescriptionListDescription>
              <AzureSourceName id={sourceId} />
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
        <DescriptionListGroup>
          <DescriptionListTerm>Resource Group</DescriptionListTerm>
          <DescriptionListDescription>
            {resourceGroup}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
      <br />
      <div className="pf-u-font-weight-bold pf-u-pb-md">
        Cloud Provider Identifiers
      </div>
      <DescriptionList isHorizontal isCompact className=" pf-u-pl-xl">
        <DescriptionListGroup>
          <DescriptionListTerm>Image name</DescriptionListTerm>
          <DescriptionListDescription>
            {status === 'success' ? (
              <ClipboardCopy
                hoverTip="Copy"
                clickTip="Copied"
                variant="inline-compact"
              >
                {imageName}
              </ClipboardCopy>
            ) : status === 'failure' ? (
              <p></p>
            ) : (
              <Spinner isSVG size="md" />
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </>
  );
};

type GcpDetailsPropTypes = {
  compose: ComposesResponseItem;
};

export const GcpDetails = ({ compose }: GcpDetailsPropTypes) => {
  const { data } = useGetComposeStatusQuery({
    composeId: compose.id,
  });

  const options = compose.request.image_requests[0].upload_request.options;

  if (!isGcpUploadRequestOptions(options)) {
    throw TypeError(
      `Error: options must be of type GcpUploadRequestOptions, not ${typeof options}.`
    );
  }

  const uploadStatus = data.image_status.upload_status?.options;

  // TODO think on this, when/why would it be undefined? crash (throw error?) or
  // fail gracefully?
  if (uploadStatus === undefined) {
    return <></>;
  }

  if (!isGcpUploadStatus(uploadStatus)) {
    throw TypeError(
      `Error: uploadStatus must be of type GcpUploadStatus, not ${typeof uploadStatus}.`
    );
  }

  return (
    <>
      <div className="pf-u-font-weight-bold pf-u-pb-md">Build Information</div>
      <DescriptionList isHorizontal isCompact className=" pf-u-pl-xl">
        <DescriptionListGroup>
          <DescriptionListTerm>UUID</DescriptionListTerm>
          <DescriptionListDescription>
            <ClipboardCopy
              hoverTip="Copy"
              clickTip="Copied"
              variant="inline-compact"
              ouiaId="gcp-uuid"
            >
              {compose.id}
            </ClipboardCopy>
          </DescriptionListDescription>
        </DescriptionListGroup>
        {data.image_status.status === 'success' && (
          <DescriptionListGroup>
            <DescriptionListTerm>Project ID</DescriptionListTerm>
            <DescriptionListDescription>
              {uploadStatus.project_id}
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
        {options.share_with_accounts && (
          <DescriptionListGroup>
            <DescriptionListTerm>Shared with</DescriptionListTerm>
            <DescriptionListDescription>
              {parseGcpSharedWith(options.share_with_accounts)}
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
      <br />
      <div className="pf-u-font-weight-bold pf-u-pb-md">
        Cloud Provider Identifiers
      </div>
      <DescriptionList isHorizontal isCompact className=" pf-u-pl-xl">
        <DescriptionListGroup>
          <DescriptionListTerm>Image name</DescriptionListTerm>
          <DescriptionListDescription>
            {data.image_status.status === 'success' ? (
              <ClipboardCopy
                hoverTip="Copy"
                clickTip="Copied"
                variant="inline-compact"
              >
                {uploadStatus.image_name}
              </ClipboardCopy>
            ) : data.image_status.status === 'failure' ? (
              <p></p>
            ) : (
              <Spinner isSVG size="md" />
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </>
  );
};

type AwsS3DetailsPropTypes = {
  compose: ComposesResponseItem;
};

export const AwsS3Details = ({ compose }: AwsS3DetailsPropTypes) => {
  return (
    <>
      <div className="pf-u-font-weight-bold pf-u-pb-md">Build Information</div>
      <DescriptionList isHorizontal isCompact className=" pf-u-pl-xl">
        <DescriptionListGroup>
          <DescriptionListTerm>UUID</DescriptionListTerm>
          <DescriptionListDescription>
            <ClipboardCopy
              hoverTip="Copy"
              clickTip="Copied"
              variant="inline-compact"
              ouiaId="other-targets-uuid"
            >
              {compose.id}
            </ClipboardCopy>
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </>
  );
};
