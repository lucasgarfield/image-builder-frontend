import React from 'react';

import { ClipboardCopy } from '@patternfly/react-core';
import {
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';

import { StatusClone, AwsDetailsStatus } from './Status';

import {
  ClonesResponseItem,
  ComposesResponseItem,
  UploadStatus,
  useGetComposeStatusQuery,
} from '../../store/imageBuilderApi';

type RowPropTypes = {
  ami: JSX.Element;
  region: JSX.Element;
  status: JSX.Element;
};

type AmiPropTypes = {
  status: UploadStatus | undefined;
};

const Ami = ({ status }: AmiPropTypes) => {
  return status?.status === 'success' ? (
    <ClipboardCopy hoverTip="Copy" clickTip="Copied" variant="inline-compact">
      {'ami' in status.options ? status.options.ami : null}
    </ClipboardCopy>
  ) : (
    <></>
  );
};

const ComposeRegion = () => {
  return <p>us-east-1</p>;
};

type CloneRegionPropTypes = {
  region: string;
};

const CloneRegion = ({ region }: CloneRegionPropTypes) => {
  return <p>{region}</p>;
};

const Row = ({ ami, region, status }: RowPropTypes) => {
  return (
    <Tbody>
      <Tr className="no-bottom-border">
        <Td dataLabel="AMI">{ami}</Td>
        <Td dataLabel="Region">{region}</Td>
        <Td dataLabel="Status">{status}</Td>
      </Tr>
    </Tbody>
  );
};

type CloneRowPropTypes = {
  clone: ClonesResponseItem;
  status: UploadStatus;
};

const CloneRow = ({ clone, status }: CloneRowPropTypes) => {
  return (
    <Row
      ami={<Ami status={status} />}
      region={<CloneRegion region={clone.request.region} />}
      status={<StatusClone clone={clone} status={status} />}
    />
  );
};

type ComposeRowPropTypes = {
  compose: ComposesResponseItem;
};

const ComposeRow = ({ compose }: ComposeRowPropTypes) => {
  const { data, isSuccess } = useGetComposeStatusQuery({
    composeId: compose.id,
  });
  return isSuccess ? (
    <Row
      ami={<Ami status={data.image_status.upload_status} />}
      region={<ComposeRegion />}
      status={<AwsDetailsStatus compose={compose} />}
    />
  ) : null;
};

export type ReducedClonesByRegion = {
  [region: string]: {
    clone: ClonesResponseItem;
    status: UploadStatus | undefined;
  };
};

type ClonesTablePropTypes = {
  compose: ComposesResponseItem;
  reducedClonesByRegion: ReducedClonesByRegion;
};

const ClonesTable = ({
  compose,
  reducedClonesByRegion,
}: ClonesTablePropTypes) => {
  const cloneRows = [];
  for (const reducedClone of Object.values(reducedClonesByRegion)) {
    cloneRows.push(
      <CloneRow
        clone={reducedClone.clone}
        status={reducedClone.status}
        key={reducedClone.clone.id}
      />
    );
  }

  return (
    <TableComposable variant="compact" data-testid="clones-table">
      <Thead>
        <Tr className="no-bottom-border">
          <Th className="pf-m-width-60">AMI</Th>
          <Th className="pf-m-width-20">Region</Th>
          <Th className="pf-m-width-20">Status</Th>
        </Tr>
      </Thead>
      <ComposeRow compose={compose} />
      {cloneRows}
    </TableComposable>
  );
};

export default ClonesTable;
