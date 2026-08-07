import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getRegistryHost,
  getRegistrySearchPath,
  resolveImageReference,
} from '../constants';

describe('resolveImageReference', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the reference unchanged without DEV_REGISTRY', () => {
    expect(
      resolveImageReference('registry.redhat.io/rhel10/rhel-kvm:latest'),
    ).toBe('registry.redhat.io/rhel10/rhel-kvm:latest');
  });

  it('maps known references to their development names', () => {
    vi.stubEnv('DEV_REGISTRY', 'quay.io/myorg/foundry');

    expect(
      resolveImageReference('registry.redhat.io/rhel10/rhel-kvm:latest'),
    ).toBe('quay.io/myorg/foundry/rhel-10-qcow2:latest');
    expect(
      resolveImageReference('registry.redhat.io/rhel10/rhel-aws:latest'),
    ).toBe('quay.io/myorg/foundry/rhel-10-ami:latest');
    expect(
      resolveImageReference(
        'registry.redhat.io/rhel10/rhel-bootc-installer:latest',
      ),
    ).toBe('quay.io/myorg/foundry/rhel-10-bootable-container-iso:latest');
    expect(
      resolveImageReference('registry.redhat.io/rhel10/rhel10-bootc:latest'),
    ).toBe('quay.io/myorg/foundry/rhel-10-bootc:latest');
  });

  it('ignores trailing slashes in DEV_REGISTRY', () => {
    vi.stubEnv('DEV_REGISTRY', 'quay.io/myorg/foundry/');

    expect(
      resolveImageReference('registry.redhat.io/rhel10/rhel-kvm:latest'),
    ).toBe('quay.io/myorg/foundry/rhel-10-qcow2:latest');
  });

  it('leaves unknown references untouched', () => {
    vi.stubEnv('DEV_REGISTRY', 'quay.io/myorg/foundry');

    expect(resolveImageReference('localhost/my-derived-image:latest')).toBe(
      'localhost/my-derived-image:latest',
    );
    expect(
      resolveImageReference('registry.redhat.io/rhel9/other-image:latest'),
    ).toBe('registry.redhat.io/rhel9/other-image:latest');
  });
});

describe('getRegistryHost', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the official registry without DEV_REGISTRY', () => {
    expect(getRegistryHost()).toBe('registry.redhat.io');
  });

  it('returns only the host part of DEV_REGISTRY', () => {
    vi.stubEnv('DEV_REGISTRY', 'registry.example.com:5000/myorg/foundry');

    expect(getRegistryHost()).toBe('registry.example.com:5000');
  });

  it('returns a bare DEV_REGISTRY host as-is', () => {
    vi.stubEnv('DEV_REGISTRY', 'registry.example.com:5000');

    expect(getRegistryHost()).toBe('registry.example.com:5000');
  });
});

describe('getRegistrySearchPath', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('searches the official rhel10 path without DEV_REGISTRY', () => {
    expect(getRegistrySearchPath()).toBe('registry.redhat.io/rhel10');
  });

  it('searches the development repository path', () => {
    vi.stubEnv('DEV_REGISTRY', 'quay.io/myorg/foundry');

    expect(getRegistrySearchPath()).toBe('quay.io/myorg/foundry');
  });
});
