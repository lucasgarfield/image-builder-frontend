import type { BootcDistributionItem } from '@/store/api/backend';

export type KnownImage = Omit<BootcDistributionItem, 'arch'>;

export const OFFICIAL_REGISTRY = 'registry.redhat.io';

// Development builds (make cockpit/devel DEV_REGISTRY=...) can redirect
// registry operations to a registry holding unpublished containers.
// References shown in the UI and stored in blueprints keep the official
// registry; only podman and image-builder CLI invocations are rewritten.
const getDevRegistry = (): string | undefined =>
  process.env.DEV_REGISTRY?.replace(/\/+$/, '') || undefined;

// The development registry does not mirror the official paths; it
// publishes the known images as <distro major>-<CLI image type>, e.g.
// quay.io/.../image-builder-bootc-foundry/rhel-10-qcow2:latest.
const DEV_IMAGE_NAMES: Record<string, string> = {
  'registry.redhat.io/rhel10/rhel-kvm:latest': 'rhel-10-qcow2:latest',
  'registry.redhat.io/rhel10/rhel-aws:latest': 'rhel-10-ami:latest',
  'registry.redhat.io/rhel10/rhel-bootc-installer:latest':
    'rhel-10-bootable-container-iso:latest',
  'registry.redhat.io/rhel10/rhel10-bootc:latest': 'rhel-10-bootc:latest',
};

export const resolveImageReference = (reference: string): string => {
  const devRegistry = getDevRegistry();
  const devName = DEV_IMAGE_NAMES[reference];
  if (!devRegistry || !devName) {
    return reference;
  }
  return `${devRegistry}/${devName}`;
};

export const getRegistryHost = (): string => {
  const devRegistry = getDevRegistry();
  return devRegistry ? devRegistry.split('/')[0] : OFFICIAL_REGISTRY;
};

// For the auth verification: the official registry hosts the known
// images under rhel10/, the development registry is itself the
// repository path.
export const getRegistrySearchPath = (): string => {
  return getDevRegistry() ?? `${OFFICIAL_REGISTRY}/rhel10`;
};

export const RHEL_10_BOOTC_BASE_IMAGE =
  'registry.redhat.io/rhel10/rhel10-bootc:latest';

export const KNOWN_IMAGES: KnownImage[] = [
  {
    reference: 'registry.redhat.io/rhel10/rhel-kvm:latest',
    distro: 'rhel-10.3',
    name: 'Red Hat Enterprise Linux (RHEL) 10.3',
    type: 'guest-image',
  },
  {
    reference: 'registry.redhat.io/rhel10/rhel-aws:latest',
    distro: 'rhel-10.3',
    name: 'Red Hat Enterprise Linux (RHEL) 10.3',
    type: 'aws',
  },
  {
    reference: 'registry.redhat.io/rhel10/rhel-bootc-installer:latest',
    distro: 'rhel-10.3',
    name: 'Red Hat Enterprise Linux (RHEL) 10.3',
    type: 'bootable-container-iso',
    iso_payload_references: [RHEL_10_BOOTC_BASE_IMAGE],
  },
];

export const isKnownImageRef = (ref: string) => {
  return KNOWN_IMAGES.some((known) => known.reference === ref);
};
