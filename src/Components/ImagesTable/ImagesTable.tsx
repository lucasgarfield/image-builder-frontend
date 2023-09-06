import React, { useEffect, useMemo, useState } from 'react';

import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  EmptyStateVariant,
  OnSetPage,
  Pagination,
  PaginationVariant,
  Skeleton,
  Text,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, PlusCircleIcon } from '@patternfly/react-icons';
import {
  ActionsColumn,
  ExpandableRowContent,
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import { skipToken } from '@reduxjs/toolkit/dist/query';
import { Link, NavigateFunction, useNavigate } from 'react-router-dom';

import './ImagesTable.scss';
import {
  AwsDetails,
  AwsS3Details,
  AzureDetails,
  GcpDetails,
} from './ImageDetails';
import { AwsS3Instance, CloudInstance } from './Instance';
import Release from './Release';
import { AwsS3Status, AwsStatus, CloudStatus } from './Status';
import { AwsTarget, Target } from './Target';

import { AWS_S3_EXPIRATION_TIME_IN_HOURS } from '../../constants';
import { useGetCloneStatusesQuery } from '../../store/hooks';
import {
  ComposesResponseItem,
  ComposeStatus,
  useGetComposeClonesQuery,
  useGetComposesQuery,
  useGetComposeStatusQuery,
} from '../../store/imageBuilderApi';
import { ClonesByRegion, ReducedClonesByRegion } from '../../store/types';
import { resolveRelPath } from '../../Utilities/path';
import {
  hoursToExpiration,
  timestampToDisplayString,
} from '../../Utilities/time';

const ImagesTable = () => {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const { data, isSuccess } = useGetComposesQuery({
    limit: perPage,
    offset: page,
  });

  const onSetPage: OnSetPage = (_, page) => setPage(page);

  const onPerPageSelect: OnSetPage = (_, perPage) => setPerPage(perPage);

  // TODO nope fix this
  if (!isSuccess) {
    return <></>;
  }

  const composes = data.data;
  const itemCount = data.meta.count;

  return (
    <>
      {!isSuccess && <></>}
      {(data.meta.count === 0 && (
        <EmptyState variant={EmptyStateVariant.large} data-testid="empty-state">
          <EmptyStateIcon icon={PlusCircleIcon} />
          <Title headingLevel="h4" size="lg">
            Create an RPM-DNF image
          </Title>
          <EmptyStateBody>
            <Text>
              Image builder is a tool for creating deployment-ready customized
              system images: installation disks, virtual machines, cloud
              vendor-specific images, and others. By using image builder, you
              can create these images faster than manual procedures because it
              eliminates the specific configurations required for each output
              type.
            </Text>
            <br />
            <Text>
              With RPM-DNF, you can manage the system software by using the DNF
              package manager and updated RPM packages. This is a simple and
              adaptive method of managing and modifying the system over its
              lifecycle.
            </Text>
            <br />
            <Text>
              <Button
                component="a"
                target="_blank"
                variant="link"
                icon={<ExternalLinkAltIcon />}
                iconPosition="right"
                isInline
                href={
                  'https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index'
                }
              >
                Learn more about managing images with DNF
              </Button>
            </Text>
          </EmptyStateBody>
          <Link
            to={resolveRelPath('imagewizard')}
            className="pf-c-button pf-m-primary"
            data-testid="create-image-action"
          >
            Create image
          </Link>
          <EmptyStateSecondaryActions>
            <Button
              component="a"
              target="_blank"
              variant="link"
              icon={<ExternalLinkAltIcon />}
              iconPosition="right"
              isInline
              href={
                'https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/creating_customized_rhel_images_using_the_image_builder_service'
              }
              className="pf-u-pt-md"
            >
              Image builder for RPM-DNF documentation
            </Button>
          </EmptyStateSecondaryActions>
        </EmptyState>
      )) || (
        <>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem>
                <Link
                  to={resolveRelPath('imagewizard')}
                  className="pf-c-button pf-m-primary"
                  data-testid="create-image-action"
                >
                  Create image
                </Link>
              </ToolbarItem>
              <ToolbarItem
                variant="pagination"
                alignment={{ default: 'alignRight' }}
              >
                <Pagination
                  itemCount={itemCount}
                  perPage={perPage}
                  page={page}
                  onSetPage={onSetPage}
                  onPerPageSelect={onPerPageSelect}
                  widgetId="compose-pagination-top"
                  data-testid="images-pagination-top"
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <TableComposable variant="compact" data-testid="images-table">
            <Thead>
              <Tr>
                <Th />
                <Th>Image name</Th>
                <Th>Created/Updated</Th>
                <Th>Release</Th>
                <Th>Target</Th>
                <Th>Status</Th>
                <Th>Instance</Th>
                <Th />
              </Tr>
            </Thead>
            {composes.map((compose, rowIndex) => {
              return (
                <ImagesTableRow
                  compose={compose}
                  rowIndex={rowIndex}
                  key={compose.id}
                />
              );
            })}
          </TableComposable>
          <Toolbar className="pf-u-mb-xl">
            <ToolbarContent>
              <ToolbarItem
                variant="pagination"
                alignment={{ default: 'alignRight' }}
              >
                <Pagination
                  variant={PaginationVariant.bottom}
                  itemCount={itemCount}
                  perPage={perPage}
                  page={page}
                  onSetPage={onSetPage}
                  onPerPageSelect={onPerPageSelect}
                  widgetId="compose-pagination-bottom"
                  data-testid="images-pagination-bottom"
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        </>
      )}
    </>
  );
};

type ImagesTableRowPropTypes = {
  compose: ComposesResponseItem;
  rowIndex: number;
};

const ImagesTableRow = ({ compose, rowIndex }: ImagesTableRowPropTypes) => {
  const [pollingInterval, setPollingInterval] = useState(8000);

  const { data: composeStatus, isLoading } = useGetComposeStatusQuery(
    {
      composeId: compose.id,
    },
    { pollingInterval: pollingInterval }
  );

  useEffect(() => {
    if (
      composeStatus?.image_status.status === 'success' ||
      composeStatus?.image_status.status === 'failure'
    ) {
      setPollingInterval(0);
    } else {
      setPollingInterval(8000);
    }
  }, [setPollingInterval, composeStatus]);

  if (isLoading) {
    return <LoadingRow compose={compose} rowIndex={rowIndex} />;
  }

  const type = compose.request.image_requests[0].upload_request.type;

  switch (type) {
    // case 'aws':
    //   return <AwsRow compose={compose} rowIndex={rowIndex} />;
    case 'gcp':
      return <GcpRow compose={compose} rowIndex={rowIndex} />;
    case 'azure':
      return <AzureRow compose={compose} rowIndex={rowIndex} />;
    // case 'aws.s3':
    //   return <AwsS3Row compose={compose} rowIndex={rowIndex} />;
    default:
      return <LoadingRow compose={compose} rowIndex={rowIndex} />;
  }
};

type GcpRowPropTypes = {
  compose: ComposesResponseItem;
  rowIndex: number;
};

const GcpRow = ({ compose, rowIndex }: GcpRowPropTypes) => {
  const details = <GcpDetails compose={compose} />;
  const instance = <CloudInstance compose={compose} />;
  const status = <CloudStatus compose={compose} />;
  return (
    <Row
      compose={compose}
      rowIndex={rowIndex}
      details={details}
      status={status}
      instance={instance}
    />
  );
};

type AzureRowPropTypes = {
  compose: ComposesResponseItem;
  rowIndex: number;
};

const AzureRow = ({ compose, rowIndex }: AzureRowPropTypes) => {
  const details = <AzureDetails compose={compose} />;
  const instance = <CloudInstance compose={compose} />;
  const status = <CloudStatus compose={compose} />;

  return (
    <Row
      compose={compose}
      rowIndex={rowIndex}
      details={details}
      instance={instance}
      status={status}
    />
  );
};

type AwsS3RowPropTypes = {
  compose: ComposesResponseItem;
  rowIndex: number;
};

const AwsS3Row = ({ compose, rowIndex }: AwsS3RowPropTypes) => {
  const expirationTime = hoursToExpiration(compose.created_at);
  const isExpired = expirationTime >= AWS_S3_EXPIRATION_TIME_IN_HOURS;

  const details = <AwsS3Details compose={compose} />;
  const instance = <AwsS3Instance compose={compose} isExpired={isExpired} />;
  const status = (
    <AwsS3Status
      compose={compose}
      isExpired={isExpired}
      hoursToExpiration={expirationTime}
    />
  );

  return (
    <Row
      compose={compose}
      rowIndex={rowIndex}
      details={details}
      instance={instance}
      status={status}
    />
  );
};

type AwsRowPropTypes = {
  compose: ComposesResponseItem;
  rowIndex: number;
};

const AwsRow = ({ compose, rowIndex }: AwsRowPropTypes) => {
  const { data: composeStatus } = useGetComposeStatusQuery({
    composeId: compose.id,
  });

  const navigate = useNavigate();

  const { data: clones, isSuccess: isSuccessClones } = useGetComposeClonesQuery(
    {
      composeId: compose.id,
    }
  );

  const statuses = useGetCloneStatusesQuery(
    isSuccessClones ? clones.data : [skipToken]
  );

  const isSuccessStatuses = !statuses.find(
    (status) => status.isSuccess === false
  );

  const reducedClonesByRegion = useMemo(() => {
    // Merge clones and their statuses
    const clonesByRegion: ClonesByRegion = {};

    clones.data.forEach((clone, i) => {
      const region = clone.request.region;
      if (clonesByRegion[region]) {
        clonesByRegion[region].push({ clone: clone, status: statuses[i].data });
      } else {
        clonesByRegion[region] = [{ clone: clone, status: statuses[i].data }];
      }
    });

    const reducingPriority = {
      success: 4,
      pending: 3,
      running: 2,
      failure: 1,
    };

    const reducedClonesByRegion: ReducedClonesByRegion = {};

    for (const [region, clones] of Object.entries(clonesByRegion)) {
      reducedClonesByRegion[region] = clones.reduce((current, accumulator) => {
        const currentStatus = current.status?.status;
        const currentPriority = currentStatus
          ? reducingPriority[currentStatus]
          : 0;
        const accumulatorStatus = accumulator.status?.status;
        const accumulatorPriority = accumulatorStatus
          ? reducingPriority[accumulatorStatus]
          : 0;

        if (currentPriority > accumulatorPriority) {
          return current;
        } else {
          return accumulator;
        }
      }, clones[0]);
    }

    return reducedClonesByRegion;
  }, [clones, statuses]);

  const target = <AwsTarget clones={reducedClonesByRegion} />;

  const status = <AwsStatus compose={compose} clones={reducedClonesByRegion} />;

  const instance = <CloudInstance compose={compose} />;

  const details = (
    <AwsDetails
      compose={compose}
      reducedClonesByRegion={reducedClonesByRegion}
    />
  );

  const actions = (
    <ActionsColumn items={awsActions(compose, composeStatus, navigate)} />
  );

  return (
    <Row
      compose={compose}
      rowIndex={rowIndex}
      status={status}
      target={target}
      actions={actions}
      instance={instance}
      details={details}
    />
  );
};

type RowPropTypes = {
  compose: ComposesResponseItem;
  rowIndex: any;
  status: JSX.Element;
  target?: JSX.Element;
  actions?: JSX.Element;
  instance: JSX.Element;
  details: JSX.Element;
};

const Row = ({
  compose,
  rowIndex,
  status,
  target,
  actions,
  details,
  instance,
}: RowPropTypes) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const handleToggle = () => setIsExpanded(!isExpanded);

  const navigate = useNavigate();

  return (
    <Tbody key={compose.id} isExpanded={isExpanded}>
      <Tr className="no-bottom-border">
        <Td
          expand={{
            rowIndex: rowIndex,
            isExpanded: isExpanded,
            onToggle: () => handleToggle(),
          }}
        />
        <Td dataLabel="Image name">
          {compose.request.image_name || compose.id}
        </Td>
        <Td dataLabel="Created">
          {timestampToDisplayString(compose.created_at)}
        </Td>
        <Td dataLabel="Release">
          <Release release={compose.request.distribution} />
        </Td>
        <Td dataLabel="Target">
          {target ? target : <Target compose={compose} />}
        </Td>
        <Td dataLabel="Status">{status}</Td>
        <Td dataLabel="Instance">{instance}</Td>
        <Td>
          {actions ? (
            actions
          ) : (
            <ActionsColumn items={defaultActions(compose, navigate)} />
          )}
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td colSpan={8}>
          <ExpandableRowContent>{details}</ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

type LoadingRowPropTypes = {
  compose: ComposesResponseItem;
  rowIndex: any;
};

const LoadingRow = ({ compose, rowIndex }: LoadingRowPropTypes) => {
  return (
    <Tbody key={compose.id} isExpanded={false}>
      <Tr className="no-bottom-border">
        <Td
          expand={{
            rowIndex: rowIndex,
            isExpanded: false,
          }}
        />
        <Td dataLabel="Image name">
          {compose.request.image_name || compose.id}
        </Td>
        <Td dataLabel="Created">
          {timestampToDisplayString(compose.created_at)}
        </Td>
        <Td dataLabel="Release">
          <Release release={compose.request.distribution} />
        </Td>
        <Td dataLabel="Target">
          <Skeleton />
        </Td>
        <Td dataLabel="Status">
          <Skeleton />
        </Td>
        <Td dataLabel="Instance">
          <Skeleton />
        </Td>
        <Td>
          <ActionsColumn isDisabled />
        </Td>
      </Tr>
      <Tr>
        <Td colSpan={8}>
          <ExpandableRowContent />
        </Td>
      </Tr>
    </Tbody>
  );
};

const defaultActions = (
  compose: ComposesResponseItem,
  navigate: NavigateFunction
) => [
  {
    title: 'Recreate image',
    onClick: () => {
      navigate(resolveRelPath(`imagewizard/${compose.id}`));
    },
  },
  {
    title: (
      <a
        className="ib-subdued-link"
        href={`data:text/plain;charset=utf-8,${encodeURIComponent(
          JSON.stringify(compose.request, null, '  ')
        )}`}
        download={`request-${compose.id}.json`}
      >
        Download compose request (.json)
      </a>
    ),
  },
];

const awsActions = (
  compose: ComposesResponseItem,
  status: ComposeStatus | undefined,
  navigate: NavigateFunction
) => [
  {
    title: 'Share to new region',
    onClick: () => navigate(resolveRelPath(`share/${compose.id}`)),
    isDisabled: status?.image_status.status === 'success' ? false : true,
  },
  ...defaultActions(compose, navigate),
];

export default ImagesTable;
