import type { BootcDistributionItem } from '@/store/api/backend';

export type KnownImage = Omit<BootcDistributionItem, 'arch'>;

export const OFFICIAL_REGISTRY = 'registry.redhat.io';

// Development builds (make cockpit/devel DEV_REGISTRY=...) can redirect
// registry operations to a registry holding unpublished containers.
// References shown in the UI and stored in blueprints keep the official
// registry; only podman and image-builder CLI invocations are rewritten.
const getDevRegistry = (): string | undefined =>
  process.env.DEV_REGISTRY?.replace(/\/+$/, '') || undefined;

export const resolveImageReference = (reference: string): string => {
  const devRegistry = getDevRegistry();
  if (!devRegistry || !reference.startsWith(OFFICIAL_REGISTRY)) {
    return reference;
  }
  return devRegistry + reference.slice(OFFICIAL_REGISTRY.length);
};

export const getRegistryHost = (): string => {
  const devRegistry = getDevRegistry();
  return devRegistry ? devRegistry.split('/')[0] : OFFICIAL_REGISTRY;
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
