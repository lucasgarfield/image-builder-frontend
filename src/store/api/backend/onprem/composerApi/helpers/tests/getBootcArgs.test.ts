import { describe, expect, it, vi } from 'vitest';

import { getBootcArgs } from '../getBootcArgs';

describe('getBootcArgs', () => {
  it('returns no args without a bootc section', () => {
    expect(getBootcArgs(undefined)).toEqual([]);
  });

  it('returns the container reference arg', () => {
    expect(getBootcArgs({ reference: 'quay.io/example/image:latest' })).toEqual(
      ['--bootc-ref', 'quay.io/example/image:latest'],
    );
  });

  it('includes the optional build and installer payload references', () => {
    expect(
      getBootcArgs({
        reference: 'quay.io/example/image:latest',
        build_reference: 'quay.io/example/build:latest',
        iso_payload_reference: 'quay.io/example/payload:latest',
      }),
    ).toEqual([
      '--bootc-ref',
      'quay.io/example/image:latest',
      '--bootc-build-ref',
      'quay.io/example/build:latest',
      '--bootc-installer-payload-ref',
      'quay.io/example/payload:latest',
    ]);
  });

  it('rewrites official references when DEV_REGISTRY is set', () => {
    vi.stubEnv('DEV_REGISTRY', 'quay.io/myorg');

    expect(
      getBootcArgs({
        reference: 'registry.redhat.io/rhel10/rhel-bootc-installer:latest',
        iso_payload_reference: 'registry.redhat.io/rhel10/rhel10-bootc:latest',
      }),
    ).toEqual([
      '--bootc-ref',
      'quay.io/myorg/rhel10/rhel-bootc-installer:latest',
      '--bootc-installer-payload-ref',
      'quay.io/myorg/rhel10/rhel10-bootc:latest',
    ]);

    vi.unstubAllEnvs();
  });
});
