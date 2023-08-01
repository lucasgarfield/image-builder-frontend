import { useEffect } from 'react';

import { SkipToken } from '@reduxjs/toolkit/dist/query';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import { ClonesResponseItem, imageBuilderApi } from './imageBuilderApi';

import type { RootState, AppDispatch } from '.';

const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useGetCloneStatusesQuery = (
  clones: (ClonesResponseItem | SkipToken)[]
) => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const statuses = clones
      .filter((clone): clone is ClonesResponseItem => {
        return clone !== skipToken;
      })
      .map((clone) => {
        return dispatch(
          imageBuilderApi.endpoints.getCloneStatus.initiate({ id: clone.id })
        );
      });
    return () => {
      for (const status of statuses) {
        status.unsubscribe();
      }
    };
  }, [dispatch, clones]);

  return useAppSelector((state) => {
    return clones
      .filter((clone): clone is ClonesResponseItem => {
        return clone !== skipToken;
      })
      .map((clone) => {
        return imageBuilderApi.endpoints.getCloneStatus.select({
          id: clone.id,
        })(state);
      });
  });
};
