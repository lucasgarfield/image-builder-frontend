import { emptyRhsmApi as api } from "./emptyRhsmApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listActivationKeys: build.query<
      ListActivationKeysApiResponse,
      ListActivationKeysApiArg
    >({
      query: () => ({ url: `/activation_keys` }),
    }),
    showActivationKey: build.query<
      ShowActivationKeyApiResponse,
      ShowActivationKeyApiArg
    >({
      query: (queryArg) => ({ url: `/activation_keys/${queryArg.name}` }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as rhsmApi };
export type ListActivationKeysApiResponse =
  /** status 200 Array of activation keys */ {
    body?: ActivationKeys[];
  };
export type ListActivationKeysApiArg = void;
export type ShowActivationKeyApiResponse = /** status 200 Activation key */ {
  body?: ActivationKeys;
};
export type ShowActivationKeyApiArg = {
  name: string;
};
export type AdditionalRepositories = {
  repositoryLabel?: string;
  repositoryName?: string;
};
export type ActivationKeys = {
  additionalRepositories?: AdditionalRepositories[];
  id?: string;
  name?: string;
  releaseVersion?: string;
  role?: string;
  serviceLevel?: string;
  usage?: string;
};
export type ErrorDetails = {
  code?: number;
  message?: string;
};
export const { useListActivationKeysQuery, useShowActivationKeyQuery } =
  injectedRtkApi;
