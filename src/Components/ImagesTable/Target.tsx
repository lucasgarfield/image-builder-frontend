import React from 'react';

import { ImageTypes } from '../../store/imageBuilderApi';
import { ComposesResponseItem } from '../../store/imageBuilderApi';

const targetOptions: { [key in ImageTypes]: string } = {
  aws: 'Amazon Web Services',
  azure: 'Microsoft Azure',
  'edge-commit': '',
  'edge-installer': '',
  gcp: 'Google Cloud Platform',
  'guest-image': 'Virtualization - Guest image',
  'image-installer': 'Bare metal - Installer',
  vsphere: 'VMWare vSphere',
  'vsphere-ova': 'VMWare vSphere',
  wsl: 'Windows Subsystem for Linux',
  ami: '',
  'rhel-edge-commit': '',
  'rhel-edge-installer': '',
  vhd: '',
};

type TargetPropTypes = {
  compose: ComposesResponseItem;
};

export const Target = ({ compose }: TargetPropTypes) => {
  return <p>{targetOptions[compose.request.image_requests[0].image_type]}</p>;
};

type AwsTargetPropTypes = {
  numCloneRows: number;
};

export const AwsTarget = ({ numCloneRows }: AwsTargetPropTypes) => {
  const text = `Amazon Web Services (${numCloneRows + 1})`;
  return <>{text}</>;
};
