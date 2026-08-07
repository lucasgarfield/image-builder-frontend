import cockpit from 'cockpit';
import { describe, expect, it, vi } from 'vitest';

import { registryEndpoints } from '../composerApi/registry';

vi.mock('cockpit', () => ({
  default: {
    spawn: vi.fn(),
  },
}));

const mockSpawn = vi.mocked(cockpit.spawn);

// Minimal mock matching BaseQueryApi shape
const createMockApi = () =>
  ({
    signal: new AbortController().signal,
    abort: vi.fn(),
    dispatch: vi.fn(),
    getState: vi.fn(),
    extra: undefined,
    endpoint: 'test',
    type: 'query' as const,
  }) as const;

const mockBaseQuery = vi.fn();
const mockExtraOptions = {};

type EndpointFn<Args> = (
  queryArgs: Args,
  api: ReturnType<typeof createMockApi>,
  extraOptions: typeof mockExtraOptions,
  baseQuery: typeof mockBaseQuery,
) => Promise<{ data: unknown } | { error: unknown }>;

// Extract the queryFn from each endpoint definition for direct testing
const mockBuilder = {
  query: <T>({ queryFn }: { queryFn: T }) => queryFn,
  mutation: <T>({ queryFn }: { queryFn: T }) => queryFn,
} as never;

const endpoints = registryEndpoints(mockBuilder);
const getRegistryAuthStatusFn =
  endpoints.getRegistryAuthStatus as unknown as EndpointFn<void>;
const registryLoginFn = endpoints.registryLogin as unknown as EndpointFn<{
  username: string;
  password: string;
}>;
const pullImageFn = endpoints.pullImage as unknown as EndpointFn<{
  reference: string;
}>;

describe('registryEndpoints', () => {
  describe('getRegistryAuthStatus', () => {
    it('should return authenticated when get-login and search both succeed', async () => {
      mockSpawn
        .mockResolvedValueOnce('testuser\n' as never) // podman login --get-login
        .mockResolvedValueOnce('INDEX  NAME' as never); // podman search

      const result = await getRegistryAuthStatusFn(
        undefined as never,
        createMockApi(),
        mockExtraOptions,
        mockBaseQuery,
      );

      expect(result).toEqual({
        data: { status: 'authenticated', username: 'testuser' },
      });
    });

    it('should return not-logged-in when get-login fails', async () => {
      const getLoginError = Object.assign(
        new Error('Error: not logged into registry.redhat.io'),
        { exit_status: 1 },
      );
      mockSpawn.mockRejectedValueOnce(getLoginError as never); // podman login --get-login fails

      const result = await getRegistryAuthStatusFn(
        undefined as never,
        createMockApi(),
        mockExtraOptions,
        mockBaseQuery,
      );

      expect(result).toEqual({
        data: { status: 'not-logged-in' },
      });
    });

    it('should return auth-failed when get-login succeeds but search fails', async () => {
      const searchError = Object.assign(new Error('unauthorized'), {
        exit_status: 125,
      });
      mockSpawn
        .mockResolvedValueOnce('expireduser\n' as never) // podman login --get-login
        .mockRejectedValueOnce(searchError as never); // podman search fails

      const result = await getRegistryAuthStatusFn(
        undefined as never,
        createMockApi(),
        mockExtraOptions,
        mockBaseQuery,
      );

      expect(result).toEqual({
        data: { status: 'auth-failed', username: 'expireduser' },
      });
    });
  });

  describe('registryLogin', () => {
    it('should return authenticated on successful login', async () => {
      const mockInput = vi.fn();
      mockSpawn.mockReturnValueOnce({
        input: mockInput,
      } as never);
      mockInput.mockResolvedValueOnce(undefined);

      const result = await registryLoginFn(
        { username: 'myuser', password: 'mypassword' },
        createMockApi(),
        mockExtraOptions,
        mockBaseQuery,
      );

      expect(result).toEqual({
        data: { status: 'authenticated', username: 'myuser' },
      });
      expect(mockSpawn).toHaveBeenCalledWith(
        [
          'podman',
          'login',
          '--username',
          'myuser',
          '--password-stdin',
          'registry.redhat.io',
        ],
        { superuser: 'require', err: 'message' },
      );
    });

    it('should log in to the development registry when DEV_REGISTRY is set', async () => {
      vi.stubEnv('DEV_REGISTRY', 'registry.example.com:5000/myorg');
      const mockInput = vi.fn();
      mockSpawn.mockReturnValueOnce({
        input: mockInput,
      } as never);
      mockInput.mockResolvedValueOnce(undefined);

      await registryLoginFn(
        { username: 'myuser', password: 'mypassword' },
        createMockApi(),
        mockExtraOptions,
        mockBaseQuery,
      );
      vi.unstubAllEnvs();

      expect(mockSpawn).toHaveBeenCalledWith(
        [
          'podman',
          'login',
          '--username',
          'myuser',
          '--password-stdin',
          'registry.example.com:5000',
        ],
        { superuser: 'require', err: 'message' },
      );
    });

    it('should return an error when login fails', async () => {
      const networkError = Object.assign(new Error('network timeout'), {
        exit_status: 1,
      });
      const mockInput = vi.fn();
      mockSpawn.mockReturnValueOnce({
        input: mockInput,
      } as never);
      mockInput.mockRejectedValueOnce(networkError);

      const result = await registryLoginFn(
        { username: 'user', password: 'pass' },
        createMockApi(),
        mockExtraOptions,
        mockBaseQuery,
      );

      expect(result).toEqual({
        error: { message: 'network timeout' },
      });
    });
  });

  describe('pullImage', () => {
    it('should pull the official reference by default', async () => {
      mockSpawn.mockResolvedValueOnce(undefined as never);

      await pullImageFn(
        { reference: 'registry.redhat.io/rhel10/rhel-kvm:latest' },
        createMockApi(),
        mockExtraOptions,
        mockBaseQuery,
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        ['podman', 'pull', 'registry.redhat.io/rhel10/rhel-kvm:latest'],
        { superuser: 'require', err: 'message' },
      );
    });

    it('should pull from the development registry when DEV_REGISTRY is set', async () => {
      vi.stubEnv('DEV_REGISTRY', 'quay.io/myorg');
      mockSpawn.mockResolvedValueOnce(undefined as never);

      await pullImageFn(
        { reference: 'registry.redhat.io/rhel10/rhel-kvm:latest' },
        createMockApi(),
        mockExtraOptions,
        mockBaseQuery,
      );
      vi.unstubAllEnvs();

      expect(mockSpawn).toHaveBeenCalledWith(
        ['podman', 'pull', 'quay.io/myorg/rhel-10-qcow2:latest'],
        { superuser: 'require', err: 'message' },
      );
    });
  });
});
