import { notificationsReducer } from '@redhat-cloud-services/frontend-components-notifications/redux';
import {
  AnyAction,
  MiddlewareArray,
  ThunkDispatch,
  configureStore,
} from '@reduxjs/toolkit';
import promiseMiddleware from 'redux-promise-middleware';

import clonesSlice from './clonesSlice';
import composesSlice from './composesSlice';
import { contentSourcesApi } from './contentSourcesApi';
import { edgeApi } from './edgeApi';
import { imageBuilderApi } from './enhancedImageBuilderApi';
import { provisioningApi } from './provisioningApi';
import { rhsmApi } from './rhsmApi';

export const reducer = {
  clones: clonesSlice,
  composes: composesSlice,
  [contentSourcesApi.reducerPath]: contentSourcesApi.reducer,
  [edgeApi.reducerPath]: edgeApi.reducer,
  [imageBuilderApi.reducerPath]: imageBuilderApi.reducer,
  [rhsmApi.reducerPath]: rhsmApi.reducer,
  [provisioningApi.reducerPath]: provisioningApi.reducer,
  notifications: notificationsReducer,
};

export const middleware = (getDefaultMiddleware: Function) =>
  getDefaultMiddleware().concat(
    promiseMiddleware,
    contentSourcesApi.middleware,
    imageBuilderApi.middleware,
    rhsmApi.middleware,
    provisioningApi.middleware
  );

export const store = configureStore({ reducer, middleware });

export type RootState = ReturnType<typeof store.getState>;

// TODO explain that this isn't working so we have the workaround
//export type AppDispatch = typeof store.dispatch;
export type AppDispatch = ThunkDispatch<RootState, null, AnyAction>;
