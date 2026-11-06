import { ImageTypeInfo, ImageTypes } from '@/store/api/backend';

import { CustomizationType } from './types';

export const ALL_CUSTOMIZATIONS = [
  'packages',
  'repositories',
  'filesystem',
  'kernel',
  'timezone',
  'locale',
  'firewall',
  'services',
  'hostname',
  'firstboot',
  'openscap',
  'registration',
  'users',
  'fips',
  'aap',
] as const satisfies readonly CustomizationType[];

// Mapping backend naming of customizations to frontend naming.
// A single backend key can map to multiple frontend customization types.
export const BACKEND_TO_FRONTEND_OPTIONS: Record<
  string,
  CustomizationType | CustomizationType[]
> = {
  packages: 'packages',
  'customizations.filesystem': 'filesystem',
  'customizations.kernel': 'kernel',
  'customizations.kernel.name': 'kernel',
  'customizations.kernel.append': 'kernel',
  'customizations.timezone': 'timezone',
  'customizations.locale': 'locale',
  'customizations.firewall': 'firewall',
  'customizations.services': 'services',
  'customizations.hostname': 'hostname',
  'customizations.openscap': 'openscap',
  'customizations.repositories': 'repositories',
  'customizations.user': 'users',
  'customizations.rhsm': 'registration',
  'customizations.fips': 'fips',
  'customizations.files': ['firstboot', 'aap'],
};

// Image mode and package mode share image type names, but not image-builder
// definitions. The distributions API only returns the package-mode list, and it
// does not describe bootc registration (`--registrations` / subscription),
// which is not a blueprint option. Until composer can return the bootc lists,
// image mode reads this hardcoded set instead.
//
// Values are frontend customization names. `filesystem` is the wizard step;
// the bootc disk builders implement that as `customizations.disk`.
export const IMAGE_MODE_DISK_OPTIONS = [
  'filesystem',
  'users',
  'registration',
] as const satisfies readonly CustomizationType[];

export type DistroDetails = ImageTypeInfo & {
  image_mode_supported_blueprint_options?: readonly CustomizationType[];
};

export const DISTRO_DETAILS: Record<string, DistroDetails> = {
  aws: {
    name: 'aws',
    supported_blueprint_options: [...ALL_CUSTOMIZATIONS],
    image_mode_supported_blueprint_options: IMAGE_MODE_DISK_OPTIONS,
  },
  azure: {
    name: 'azure',
    supported_blueprint_options: [...ALL_CUSTOMIZATIONS],
    image_mode_supported_blueprint_options: IMAGE_MODE_DISK_OPTIONS,
  },
  vhd: {
    name: 'vhd',
    supported_blueprint_options: [...ALL_CUSTOMIZATIONS],
  },
  gcp: {
    name: 'gcp',
    supported_blueprint_options: [...ALL_CUSTOMIZATIONS],
    image_mode_supported_blueprint_options: IMAGE_MODE_DISK_OPTIONS,
  },
  'guest-image': {
    name: 'guest-image',
    supported_blueprint_options: [...ALL_CUSTOMIZATIONS],
    image_mode_supported_blueprint_options: IMAGE_MODE_DISK_OPTIONS,
  },
  'image-installer': {
    name: 'image-installer',
    supported_blueprint_options: [
      // image-installer has everything but filesystem
      ...ALL_CUSTOMIZATIONS.filter((c) => c !== 'filesystem'),
    ],
  },
  'bootable-container-iso': {
    name: 'bootable-container-iso',
    // Neither package mode nor the bootc ISO builders apply registration or
    // filesystem customizations. An empty list hides every step.
    supported_blueprint_options: [],
    image_mode_supported_blueprint_options: [],
  },
  vsphere: {
    name: 'vsphere',
    supported_blueprint_options: [...ALL_CUSTOMIZATIONS],
  },
  'vsphere-ova': {
    name: 'vsphere-ova',
    supported_blueprint_options: [...ALL_CUSTOMIZATIONS],
  },
  wsl: {
    name: 'wsl',
    supported_blueprint_options: [
      // wsl has everything but filesystem, openscap & kernel
      ...ALL_CUSTOMIZATIONS.filter(
        (c) => c !== 'filesystem' && c !== 'kernel' && c !== 'openscap',
      ),
    ],
  },
  ami: { name: 'ami', supported_blueprint_options: [...ALL_CUSTOMIZATIONS] },
  oci: {
    name: 'oci',
    supported_blueprint_options: [...ALL_CUSTOMIZATIONS],
  },
  'network-installer': {
    name: 'network-installer',
    supported_blueprint_options: ['locale', 'fips'],
  },
  'pxe-tar-xz': {
    name: 'pxe-tar-xz',
    supported_blueprint_options: [
      // pxe boot has everything but filesystem
      ...ALL_CUSTOMIZATIONS.filter((c) => c !== 'filesystem'),
    ],
  },
};

// Image-mode capability lookup. Returns undefined for types we do not build
// from a bootc container, so the caller can tell "no image mode definition"
// apart from "defined, and it supports nothing" (the installer ISO).
export const imageModeTypeInfo = (
  imageType: ImageTypes,
): DistroDetails | undefined => {
  if (!(imageType in DISTRO_DETAILS)) {
    return undefined;
  }
  const details = DISTRO_DETAILS[imageType];
  const options = details.image_mode_supported_blueprint_options;
  // An empty list is a real definition; a missing field is not.
  if (options === undefined) {
    return undefined;
  }
  return {
    ...details,
    supported_blueprint_options: [...options],
  };
};
