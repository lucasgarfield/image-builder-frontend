import cockpit from 'cockpit';

import {
  getRegistryHost,
  resolveImageReference,
} from '@/store/api/backend/onprem/constants';
import { OnPremBuilder, onPremQueryHandler } from '@/store/api/shared';

import { checkImageExists, checkRegistryAuth } from './helpers';

import type {
  PullImageApiArg,
  RegistryAuthStatus,
  RegistryLoginApiArg,
} from '../types';

export const registryEndpoints = (builder: OnPremBuilder) => ({
  getRegistryAuthStatus: builder.query<RegistryAuthStatus, void>({
    queryFn: onPremQueryHandler(() => checkRegistryAuth()),
  }),
  registryLogin: builder.mutation<RegistryAuthStatus, RegistryLoginApiArg>({
    queryFn: onPremQueryHandler(
      async ({ queryArgs: { username, password } }) => {
        await cockpit
          .spawn(
            [
              'podman',
              'login',
              '--username',
              username,
              '--password-stdin',
              getRegistryHost(),
            ],
            { superuser: 'require', err: 'message' },
          )
          .input(password);
        return { status: 'authenticated', username };
      },
    ),
  }),
  registryLogout: builder.mutation<void, void>({
    queryFn: onPremQueryHandler(async () => {
      await cockpit.spawn(['podman', 'logout', getRegistryHost()], {
        superuser: 'require',
      });
    }),
  }),
  getImageExists: builder.query<boolean, PullImageApiArg>({
    queryFn: onPremQueryHandler(async ({ queryArgs: { reference } }) =>
      checkImageExists(resolveImageReference(reference)),
    ),
  }),
  pullImage: builder.mutation<void, PullImageApiArg>({
    queryFn: onPremQueryHandler(async ({ queryArgs: { reference } }) => {
      await cockpit.spawn(
        ['podman', 'pull', resolveImageReference(reference)],
        {
          superuser: 'require',
          err: 'message',
        },
      );
    }),
  }),
});
