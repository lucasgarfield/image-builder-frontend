import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import {
  initialState,
  selectDistribution,
  selectImageSource as selectImageSourceState,
} from '@/store/slices/wizard';
import { clickWithWait, createUser, renderWithRedux } from '@/test/testUtils';

import { openImageSourceSelect, renderImageSourceSelect } from './helpers';
import {
  mockBootcDistributions,
  mockBootcDistributionsMultipleTypes,
  mockBootcDistributionsNoRhel10,
  mockBootcDistributionsWithMinorVersions,
} from './mocks';

import ImageSourceSelect from '../components/ImageSourceSelect';

const mockRefetch = vi.fn();
const mockUseGetDistributionsQuery = vi.fn();
const mockUseGetImageExistsQuery = vi.fn();
const mockUseGetRegistryAuthStatusQuery = vi.fn();
const mockUsePullImageMutation = vi.fn();
const mockPullImage = vi.fn();

vi.mock('@/store/api/backend', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/api/backend')>();
  return {
    ...actual,
    useGetDistributionsQuery: (...args: unknown[]) =>
      mockUseGetDistributionsQuery(...args),
    useGetRegistryAuthStatusQuery: (...args: unknown[]) =>
      mockUseGetRegistryAuthStatusQuery(...args),
    useGetImageExistsQuery: (...args: unknown[]) =>
      mockUseGetImageExistsQuery(...args),
    usePullImageMutation: (...args: unknown[]) =>
      mockUsePullImageMutation(...args),
  };
});

const renderHostedImageSourceSelect = () => {
  return renderWithRedux(<ImageSourceSelect />, {
    details: {
      ...initialState.details,
      blueprint: { ...initialState.details.blueprint, mode: 'image' },
    },
  });
};

describe('ImageSourceSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetDistributionsQuery.mockReturnValue({
      data: mockBootcDistributions,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });
    mockUseGetImageExistsQuery.mockReturnValue({
      data: true,
      isLoading: false,
      isError: false,
    });
    mockUseGetRegistryAuthStatusQuery.mockReturnValue({
      data: { status: 'authenticated', username: 'testuser' },
      isLoading: false,
      isError: false,
      error: undefined,
    });
    mockUsePullImageMutation.mockReturnValue([
      mockPullImage,
      { isLoading: false, isError: false },
    ]);
  });

  describe('Rendering', () => {
    test('displays image source label with required indicator', async () => {
      renderImageSourceSelect();

      expect(await screen.findByText('Image source')).toBeInTheDocument();
      // On-prem renders two required FormGroups (Release + Image source)
      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers.length).toBeGreaterThanOrEqual(1);
    });

    test('displays official and local image source cards', async () => {
      renderImageSourceSelect();

      expect(
        await screen.findByText('Official Red Hat images'),
      ).toBeInTheDocument();
      expect(screen.getByText('Local images')).toBeInTheDocument();
      expect(screen.queryByText('Custom images')).not.toBeInTheDocument();
      expect(screen.queryByText('No login')).not.toBeInTheDocument();
      expect(screen.queryByText('Login required')).not.toBeInTheDocument();
    });

    test('does not auto-select an image on-prem', async () => {
      const { store } = renderImageSourceSelect();

      await screen.findByText('Image source');

      expect(selectImageSourceState(store.getState())).toBeUndefined();
    });
  });

  describe('Official images', () => {
    test('displays official images in dropdown', async () => {
      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);

      const options = await screen.findAllByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3/i,
      });
      expect(options).toHaveLength(3);
    });

    test('displays the container reference for each image', async () => {
      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);

      expect(
        await screen.findByText(
          'registry.redhat.io/rhel10/rhel-10-qcow2:latest',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText('registry.redhat.io/rhel10/rhel-10-ec2:latest'),
      ).toBeInTheDocument();
    });

    test('updates redux state when selecting an image', async () => {
      const { store } = renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);
      const option = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*guest image/i,
      });
      await clickWithWait(user, option);

      await waitFor(() => {
        expect(selectImageSourceState(store.getState())).toBe(
          'registry.redhat.io/rhel10/rhel-10-qcow2:latest',
        );
        expect(selectDistribution(store.getState())).toBe('rhel-10.3');
      });
    });

    test('selecting the container installer shows the payload container', async () => {
      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);
      const option = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*container installer/i,
      });
      await clickWithWait(user, option);

      expect(await screen.findByText('Payload container')).toBeInTheDocument();

      // Both the installer and its payload show the same image name;
      // the payload toggle is the second one.
      const toggles = screen.getAllByRole('button', {
        name: /red hat enterprise linux \(rhel\) 10.3/i,
      });
      expect(toggles).toHaveLength(2);
      await clickWithWait(user, toggles[1]);

      const payloadOption = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*base image/i,
      });
      expect(payloadOption).toBeDisabled();
      expect(payloadOption).toHaveTextContent(
        'registry.redhat.io/rhel10/rhel-10-qcow2:latest',
      );
    });

    test('pull busy state only shows for the image being pulled', async () => {
      // A pull of the guest image is in flight
      mockUsePullImageMutation.mockReturnValue([
        mockPullImage,
        {
          isLoading: true,
          isError: false,
          originalArgs: {
            reference: 'registry.redhat.io/rhel10/rhel-10-qcow2:latest',
          },
        },
      ]);

      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);
      const guestOption = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*guest image/i,
      });
      await clickWithWait(user, guestOption);

      expect(
        await screen.findByRole('button', { name: /pulling image/i }),
      ).toBeInTheDocument();

      // Switching to another image must not inherit the busy state
      const toggle = screen.getByRole('button', {
        name: /rhel.*10\.3.*guest image/i,
      });
      await clickWithWait(user, toggle);
      const awsOption = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*aws/i,
      });
      await clickWithWait(user, awsOption);

      expect(
        await screen.findByRole('button', { name: /pull latest image/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /pulling image/i }),
      ).not.toBeInTheDocument();
    });

    test('shows the image type on the closed toggles', async () => {
      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);
      const option = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*container installer/i,
      });
      await clickWithWait(user, option);

      // The bootc and payload toggles share the image name; the type
      // label is what tells them apart.
      expect(
        await screen.findByRole('button', {
          name: /rhel.*10\.3.*container installer/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: /rhel.*10\.3.*base image/i,
        }),
      ).toBeInTheDocument();
    });

    test('labels the image dropdown as the bootc container', async () => {
      renderImageSourceSelect();

      expect(await screen.findByText('Bootc container')).toBeInTheDocument();
    });

    test('shows the bootc pull error above the payload container section', async () => {
      // Neither the installer nor its payload exists locally
      mockUseGetImageExistsQuery.mockReturnValue({
        data: false,
        isLoading: false,
        isError: false,
      });

      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);
      const option = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*container installer/i,
      });
      await clickWithWait(user, option);

      const bootcError = await screen.findByText(
        /bootc container must be pulled before proceeding/i,
      );
      expect(
        screen.getByText(/payload container must be pulled before proceeding/i),
      ).toBeInTheDocument();

      const payloadLabel = screen.getByText('Payload container');
      expect(
        bootcError.compareDocumentPosition(payloadLabel) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    test('requires the payload container to be pulled', async () => {
      // The installer image exists locally but its payload does not
      mockUseGetImageExistsQuery.mockImplementation(
        (arg: { reference: string }) => ({
          data:
            arg.reference !== 'registry.redhat.io/rhel10/rhel-10-qcow2:latest',
          isLoading: false,
          isError: false,
        }),
      );

      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);
      const option = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*container installer/i,
      });
      await clickWithWait(user, option);

      expect(
        await screen.findByText(
          /payload container must be pulled before proceeding/i,
        ),
      ).toBeInTheDocument();
    });

    test('pulls the payload container with its own pull button', async () => {
      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);
      const option = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*container installer/i,
      });
      await clickWithWait(user, option);

      const pullButtons = await screen.findAllByRole('button', {
        name: /pull latest image/i,
      });
      expect(pullButtons).toHaveLength(2);

      await clickWithWait(user, pullButtons[1]);

      expect(mockPullImage).toHaveBeenCalledWith({
        reference: 'registry.redhat.io/rhel10/rhel-10-qcow2:latest',
      });
    });

    test('does not show the payload container for disk images', async () => {
      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);
      const option = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*guest image/i,
      });
      await clickWithWait(user, option);

      expect(screen.queryByText('Payload container')).not.toBeInTheDocument();
    });
  });

  describe('Not logged in', () => {
    beforeEach(() => {
      mockUseGetRegistryAuthStatusQuery.mockReturnValue({
        data: { status: 'unauthenticated' },
        isLoading: false,
        isError: false,
        error: undefined,
      });
    });

    test('displays the login prompt instead of an empty state', async () => {
      renderImageSourceSelect();

      expect(
        await screen.findByText(/log in to pull the latest images/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/login to select an image/i),
      ).not.toBeInTheDocument();
    });

    test('displays official images in the dropdown', async () => {
      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);

      const options = await screen.findAllByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3/i,
      });
      expect(options).toHaveLength(3);
    });

    test('allows selecting an image without logging in', async () => {
      const { store } = renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);
      const option = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*guest image/i,
      });
      await clickWithWait(user, option);

      await waitFor(() => {
        expect(selectImageSourceState(store.getState())).toBe(
          'registry.redhat.io/rhel10/rhel-10-qcow2:latest',
        );
      });
    });

    test('disables the pull button', async () => {
      renderImageSourceSelect();
      const user = createUser();

      await openImageSourceSelect(user);
      const option = await screen.findByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10.3.*guest image/i,
      });
      await clickWithWait(user, option);

      const pullButton = await screen.findByRole('button', {
        name: /pull latest image/i,
      });
      expect(pullButton).toHaveAttribute('aria-disabled', 'true');

      await clickWithWait(user, pullButton);
      expect(mockPullImage).not.toHaveBeenCalled();
    });

    test('login action opens the login form', async () => {
      renderImageSourceSelect();
      const user = createUser();

      const loginButton = await screen.findByRole('button', {
        name: /log in/i,
      });
      await clickWithWait(user, loginButton);

      expect(
        await screen.findByText(/log in to registry\.redhat\.io/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });
  });

  describe('Local images', () => {
    const renderLocalImageSource = () => {
      return renderImageSourceSelect({
        output: {
          ...initialState.output,
          imageSourceType: 'local',
        },
      });
    };

    test('displays coming soon note instead of an image dropdown', async () => {
      renderLocalImageSource();

      expect(
        await screen.findByText(/local image support is coming soon/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/cockpit image builder 10\.4/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /select an official image/i }),
      ).not.toBeInTheDocument();
    });

    test('displays the image-builder CLI example', async () => {
      renderLocalImageSource();

      expect(
        await screen.findByDisplayValue(
          'image-builder build qcow2 --bootc-ref localhost/my-derived-image:latest',
        ),
      ).toBeInTheDocument();
    });

    test('selecting the local card shows the coming soon note', async () => {
      renderImageSourceSelect();
      const user = createUser();

      const localCard = await screen.findByRole('radio', {
        name: /local images/i,
      });
      await clickWithWait(user, localCard);

      expect(
        await screen.findByText(/local image support is coming soon/i),
      ).toBeInTheDocument();
    });
  });

  describe('Hosted (non on-premise)', () => {
    test('does not display source type cards', async () => {
      renderHostedImageSourceSelect();

      await screen.findByText('Image source');

      expect(screen.queryByText('Local images')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Official Red Hat images'),
      ).not.toBeInTheDocument();
    });

    test('displays hosted error message when query fails', async () => {
      mockUseGetDistributionsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      renderHostedImageSourceSelect();

      expect(
        await screen.findByRole('heading', {
          name: /error loading bootc images/i,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText(/please try again later/i)).toBeInTheDocument();
    });

    test('auto-selects the first rhel-10 distribution', async () => {
      const { store } = renderHostedImageSourceSelect();

      await waitFor(() => {
        expect(selectImageSourceState(store.getState())).toBe(
          'registry.redhat.io/rhel10/rhel-bootc:rhel-10',
        );
      });
    });

    test('falls back to first distribution when no rhel-10 is available', async () => {
      mockUseGetDistributionsQuery.mockReturnValue({
        data: mockBootcDistributionsNoRhel10,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      const { store } = renderHostedImageSourceSelect();

      await waitFor(() => {
        expect(selectImageSourceState(store.getState())).toBe(
          'registry.redhat.io/rhel9/rhel-bootc:rhel-9',
        );
      });
    });
  });

  describe('Distribution filtering and deduplication', () => {
    test('hosted filters out minor versions', async () => {
      mockUseGetDistributionsQuery.mockReturnValue({
        data: mockBootcDistributionsWithMinorVersions,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      renderHostedImageSourceSelect();
      const user = createUser();

      const toggle = await screen.findByRole('button', {
        name: /red hat enterprise linux \(rhel\) 10/i,
      });
      await clickWithWait(user, toggle);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent(
        'Red Hat Enterprise Linux (RHEL) 10',
      );
      expect(options[1]).toHaveTextContent('Red Hat Enterprise Linux (RHEL) 9');
    });

    test('hosted deduplicates distributions by name', async () => {
      mockUseGetDistributionsQuery.mockReturnValue({
        data: mockBootcDistributionsMultipleTypes,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      renderHostedImageSourceSelect();
      const user = createUser();

      const toggle = await screen.findByRole('button', {
        name: /red hat enterprise linux \(rhel\) 10/i,
      });
      await clickWithWait(user, toggle);

      const options = screen.getAllByRole('option', {
        name: /red hat enterprise linux \(rhel\) 10/i,
      });
      expect(options).toHaveLength(1);
    });
  });
});
