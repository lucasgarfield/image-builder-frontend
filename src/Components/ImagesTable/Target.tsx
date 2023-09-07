import React from 'react';

import { ClonesResponseItem, ImageTypes } from '../../store/imageBuilderApi';
import { ComposesResponseItem } from '../../store/imageBuilderApi';

const targetOptions: { [key in ImageTypes]: string } = {
  aws: 'Amazon Web Services',
  azure: 'Microsoft Azure',
  'edge-commit': 'Edge Commit',
  'edge-installer': 'Edge Installer',
  gcp: 'Google Cloud Platform',
  'guest-image': 'Virtualization - Guest image',
  'image-installer': 'Bare metal - Installer',
  vsphere: 'VMWare vSphere',
  'vsphere-ova': 'VMWare vSphere',
  wsl: 'Windows Subsystem for Linux',
  ami: 'Amazon Web Services',
  'rhel-edge-commit': 'RHEL Edge Commit',
  'rhel-edge-installer': 'RHEL Edge Installer',
  vhd: '',
};

type TargetPropTypes = {
  compose: ComposesResponseItem;
};

export const Target = ({ compose }: TargetPropTypes) => {
  return <p>{targetOptions[compose.request.image_requests[0].image_type]}</p>;
};

type AwsTargetPropTypes = {
  clones: ClonesResponseItem[];
};

export const AwsTarget = ({ clones }: AwsTargetPropTypes) => {
  const text = `Amazon Web Services (${clones.length + 1})`;
  return <>{text}</>;
};
