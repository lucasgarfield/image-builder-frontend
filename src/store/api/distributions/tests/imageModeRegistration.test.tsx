import React from 'react';

import { screen } from '@testing-library/react';

import {
  computeImageTypeCustomizationSupport,
  computeRestrictions,
  DISTRO_DETAILS,
  SupportContext,
  useCustomizationRestrictions,
  useImageTypeCustomizationSupport,
} from '@/store/api/distributions';
import { useAppSelector } from '@/store/hooks';
import { initialState, selectImageTypes } from '@/store/slices/wizard';
import { renderWithRedux } from '@/test/testUtils';
import { useFlag } from '@/Utilities/useGetEnvironment';

const context: SupportContext = {
  isImageMode: true,
  isOnPremise: false,
  isRhel: true,
  isImageModeRegistrationEnabled: true,
};

const RegistrationSupport = () => {
  const selectedImageTypes = useAppSelector(selectImageTypes);
  const { restrictions } = useCustomizationRestrictions({ selectedImageTypes });
  const targets = useImageTypeCustomizationSupport('registration');
  return (
    <div>
      <p>
        {restrictions.registration.shouldHide
          ? 'Registration hidden'
          : 'Registration visible'}
      </p>
      {targets.map(({ name, supported }) => (
        <p key={name}>
          {name}: {supported ? 'supported' : 'unsupported'}
        </p>
      ))}
    </div>
  );
};

describe('hosted image mode registration', () => {
  it.each([
    'guest-image',
    'aws',
    'ami',
    'azure',
    'vhd',
    'gcp',
    'vsphere',
    'vsphere-ova',
    'oci',
  ])('allows registration for %s only with the flag enabled', (target) => {
    const imageTypes = { [target]: DISTRO_DETAILS[target] };
    expect(
      computeRestrictions({ imageTypes, context }).registration.shouldHide,
    ).toBe(false);
    expect(
      computeRestrictions({
        imageTypes,
        context: { ...context, isImageModeRegistrationEnabled: false },
      }).registration.shouldHide,
    ).toBe(true);
  });

  it.each([
    'bootable-container-iso',
    'image-installer',
    'network-installer',
    'pxe-tar-xz',
    'wsl',
    'unknown',
  ])('hides registration for %s even without capability metadata', (target) => {
    expect(
      computeRestrictions({
        imageTypes: { [target]: { name: target } },
        context,
      }).registration.shouldHide,
    ).toBe(true);
  });

  it('hides registration before a target is selected', () => {
    expect(
      computeRestrictions({ imageTypes: {}, context }).registration.shouldHide,
    ).toBe(true);
  });

  it('respects image type capabilities even with the flag enabled', () => {
    expect(
      computeRestrictions({
        imageTypes: {
          'guest-image': {
            name: 'guest-image',
            supported_blueprint_options: ['filesystem', 'users'],
          },
        },
        context,
      }).registration.shouldHide,
    ).toBe(true);
  });

  it('labels only supported targets in a mixed selection', () => {
    expect(
      computeImageTypeCustomizationSupport(
        {
          'guest-image': DISTRO_DETAILS['guest-image'],
          'bootable-container-iso': DISTRO_DETAILS['bootable-container-iso'],
          'pxe-tar-xz': DISTRO_DETAILS['pxe-tar-xz'],
        },
        'registration',
        context,
      ).map(({ supported }) => supported),
    ).toEqual([true, false, false]);
  });

  it.each([
    'bootable-container-iso',
    'pxe-tar-xz',
    'image-installer',
    'network-installer',
  ] as const)(
    'hides registration in the hook for %s with the flag enabled',
    (target) => {
      vi.mocked(useFlag).mockReturnValue(true);
      renderWithRedux(<RegistrationSupport />, {
        details: {
          ...initialState.details,
          blueprint: { ...initialState.details.blueprint, mode: 'image' },
        },
        output: { ...initialState.output, imageTypes: [target] },
      });
      expect(screen.getByText('Registration hidden')).toBeInTheDocument();
    },
  );

  it('keeps Cockpit image mode registration available with the flag disabled', () => {
    vi.mocked(useFlag).mockReturnValue(false);
    renderWithRedux(
      <RegistrationSupport />,
      {
        details: {
          ...initialState.details,
          blueprint: { ...initialState.details.blueprint, mode: 'image' },
        },
        output: { ...initialState.output, imageTypes: ['guest-image'] },
      },
      { preloadedState: { env: { isOnPremise: true } } },
    );
    expect(screen.getByText('Registration visible')).toBeInTheDocument();
  });

  it.each([false, true])(
    'uses the Unleash flag (%s) in both hooks without distribution data',
    (enabled) => {
      vi.mocked(useFlag).mockImplementation(
        (flag) =>
          flag === 'image-builder.image-mode-registration.enabled' && enabled,
      );
      renderWithRedux(<RegistrationSupport />, {
        details: {
          ...initialState.details,
          blueprint: { ...initialState.details.blueprint, mode: 'image' },
        },
        output: {
          ...initialState.output,
          imageTypes: ['guest-image', 'bootable-container-iso'],
        },
      });
      expect(
        screen.getByText(
          enabled ? 'Registration visible' : 'Registration hidden',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText(/Guest image:/i)).toHaveTextContent(
        enabled ? ': supported' : ': unsupported',
      );
      expect(screen.getByText(/Container.*:/i)).toHaveTextContent(
        ': unsupported',
      );
    },
  );
});
