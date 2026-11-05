import React, { PropsWithChildren } from 'react';

import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';

import { ImageTypes } from '@/store/api/backend';
import { initialState } from '@/store/slices/wizard';
import { createTestStore } from '@/test/testUtils';
import { useFlag } from '@/Utilities/useGetEnvironment';

import { useCustomizationRestrictions } from '../hooks';

vi.mock('@/store/api/backend/hosted', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/store/api/backend/hosted')>()),
  useGetDistributionQuery: vi.fn(() => ({ data: undefined })),
}));

const flag = 'image-builder.image-mode-registration.enabled';

const renderRestrictions = (imageType: ImageTypes) => {
  const store = createTestStore({
    details: {
      ...initialState.details,
      blueprint: { ...initialState.details.blueprint, mode: 'image' },
    },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );

  return renderHook(
    ({ selectedImageTypes }) =>
      useCustomizationRestrictions({ selectedImageTypes }),
    { wrapper, initialProps: { selectedImageTypes: [imageType] } },
  );
};

afterEach(() => {
  vi.mocked(useFlag).mockReturnValue(false);
});

describe('hosted image-mode registration flag', () => {
  it.each<ImageTypes>(['ami', 'aws', 'gcp', 'azure', 'guest-image'])(
    'updates registration restrictions for %s when the flag changes',
    (imageType) => {
      vi.mocked(useFlag).mockReturnValue(false);
      const { result, rerender } = renderRestrictions(imageType);
      expect(result.current.restrictions.registration.shouldHide).toBe(true);

      vi.mocked(useFlag).mockImplementation((name) => name === flag);
      rerender({ selectedImageTypes: [imageType] });
      expect(result.current.restrictions.registration.shouldHide).toBe(false);

      vi.mocked(useFlag).mockReturnValue(false);
      rerender({ selectedImageTypes: [imageType] });
      expect(result.current.restrictions.registration.shouldHide).toBe(true);
    },
  );

  it.each<ImageTypes>(['bootable-container-iso', 'pxe-tar-xz'])(
    'hides registration when switching from a disk image to %s without metadata',
    (imageType) => {
      vi.mocked(useFlag).mockImplementation((name) => name === flag);
      const { result, rerender } = renderRestrictions('guest-image');
      expect(result.current.restrictions.registration.shouldHide).toBe(false);

      rerender({ selectedImageTypes: [imageType] });
      expect(result.current.restrictions.registration.shouldHide).toBe(true);
    },
  );
});
