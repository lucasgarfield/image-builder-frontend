import { afterEach, describe, expect, it, vi } from 'vitest';

import { getRegistryHost, resolveImageReference } from '../constants';

describe('resolveImageReference', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the reference unchanged without DEV_REGISTRY', () => {
    expect(
      resolveImageReference('registry.redhat.io/rhel10/rhel-kvm:latest'),
    ).toBe('registry.redhat.io/rhel10/rhel-kvm:latest');
  });

  it('replaces the official registry with DEV_REGISTRY', () => {
    vi.stubEnv('DEV_REGISTRY', 'quay.io/myorg');

    expect(
      resolveImageReference('registry.redhat.io/rhel10/rhel-kvm:latest'),
    ).toBe('quay.io/myorg/rhel10/rhel-kvm:latest');
  });

  it('ignores trailing slashes in DEV_REGISTRY', () => {
    vi.stubEnv('DEV_REGISTRY', 'quay.io/myorg/');

    expect(
      resolveImageReference('registry.redhat.io/rhel10/rhel-kvm:latest'),
    ).toBe('quay.io/myorg/rhel10/rhel-kvm:latest');
  });

  it('leaves references from other registries untouched', () => {
    vi.stubEnv('DEV_REGISTRY', 'quay.io/myorg');

    expect(resolveImageReference('localhost/my-derived-image:latest')).toBe(
      'localhost/my-derived-image:latest',
    );
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
    vi.stubEnv('DEV_REGISTRY', 'registry.example.com:5000/myorg');

    expect(getRegistryHost()).toBe('registry.example.com:5000');
  });

  it('returns a bare DEV_REGISTRY host as-is', () => {
    vi.stubEnv('DEV_REGISTRY', 'registry.example.com:5000');

    expect(getRegistryHost()).toBe('registry.example.com:5000');
  });
});
