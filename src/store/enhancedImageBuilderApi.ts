import { addNotification } from '@redhat-cloud-services/frontend-components-notifications/redux';

import { imageBuilderApi } from './imageBuilderApi';

/* eslint-disable @typescript-eslint/no-explicit-any */
const errorMessage = (err: any) => {
  let msg = err.error.statusText;
  if (err.error.data?.errors[0]?.detail) {
    msg = err.error.data?.errors[0]?.detail;
  }
  return msg;
};

const enhancedApi = imageBuilderApi.enhanceEndpoints({
  addTagTypes: ['Clone', 'Compose', 'Blueprints', 'BlueprintComposes'],
  endpoints: {
    getBlueprints: {
      providesTags: () => {
        return [{ type: 'Blueprints' }];
      },
    },
    getBlueprintComposes: {
      providesTags: () => {
        return [{ type: 'BlueprintComposes' }];
      },
    },
    getComposes: {
      providesTags: () => {
        return [{ type: 'Compose' }];
      },
    },
    getComposeClones: {
      providesTags: (_request, _error, arg) => {
        return [{ type: 'Clone', id: arg.composeId }];
      },
    },
    createBlueprint: {
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        queryFulfilled
          .then(() => {
            // Typescript is unaware of tag types being defined concurrently in enhanceEndpoints()
            // @ts-expect-error
            dispatch(imageBuilderApi.util.invalidateTags(['Blueprints']));
            dispatch(
              addNotification({
                variant: 'success',
                title: 'Your blueprint is being created',
              })
            );
          })
          .catch((err) => {
            dispatch(
              addNotification({
                variant: 'danger',
                title: 'Your blueprint could not be created',
                description: `Status code ${err.error.status}: ${errorMessage(
                  err
                )}`,
              })
            );
          });
      },
    },
    cloneCompose: {
      onQueryStarted: async (
        { composeId, cloneRequest },
        { dispatch, queryFulfilled }
      ) => {
        queryFulfilled
          .then(() => {
            dispatch(
              imageBuilderApi.util.invalidateTags([
                // Typescript is unaware of tag types being defined concurrently in enhanceEndpoints()
                // @ts-expect-error
                { type: 'Clone', id: composeId },
              ])
            );

            dispatch(
              addNotification({
                variant: 'success',
                title:
                  'Your image is being shared to ' +
                  cloneRequest.region +
                  ' region',
              })
            );
          })
          .catch((err) => {
            dispatch(
              addNotification({
                variant: 'danger',
                title: 'Your image could not be shared',
                description: `Status code ${err.error.status}: ${errorMessage(
                  err
                )}`,
              })
            );
          });
      },
    },
    composeBlueprint: {
      invalidatesTags: [{ type: 'Compose' }, { type: 'BlueprintComposes' }],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        queryFulfilled
          .then(() => {
            dispatch(
              addNotification({
                variant: 'success',
                title: 'Blueprint is being built',
              })
            );
          })
          .catch((err) => {
            dispatch(
              addNotification({
                variant: 'danger',
                title: 'Blueprint could not be built',
                description: `Status code ${err.error.status}: ${errorMessage(
                  err
                )}`,
              })
            );
          });
      },
    },
    composeImage: {
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        queryFulfilled
          .then(() => {
            dispatch(
              // Typescript is unaware of tag types being defined concurrently in enhanceEndpoints()
              // @ts-expect-error
              imageBuilderApi.util.invalidateTags(['Blueprints', 'Compose'])
            );
            dispatch(
              addNotification({
                variant: 'success',
                title: 'Your image is being created',
              })
            );
          })
          .catch((err) => {
            dispatch(
              addNotification({
                variant: 'danger',
                title: 'Your image could not be created',
                description: `Status code ${err.error.status}: ${errorMessage(
                  err
                )}`,
              })
            );
          });
      },
    },
    deleteBlueprint: {
      invalidatesTags: [{ type: 'Blueprints' }],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        queryFulfilled
          .then(() => {
            dispatch(
              addNotification({
                variant: 'success',
                title: 'Blueprint was deleted',
              })
            );
          })
          .catch((err) => {
            dispatch(
              addNotification({
                variant: 'danger',
                title: 'Blueprint could not be deleted',
                description: `Status code ${err.error.status}: ${errorMessage(
                  err
                )}`,
              })
            );
          });
      },
    },
  },
});

export { enhancedApi as imageBuilderApi };
