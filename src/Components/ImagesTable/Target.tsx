import React from 'react';

import { Skeleton } from '@patternfly/react-core';

import { targetOptions } from '../../constants';
import {
  ComposesResponseItem,
  useGetComposeClonesQuery,
} from '../../store/imageBuilderApi';

type TargetPropTypes = {
  compose: ComposesResponseItem;
};

export const Target = ({ compose }: TargetPropTypes) => {
  return <p>{targetOptions[compose.request.image_requests[0].image_type]}</p>;
};

type AwsTargetPropTypes = {
  compose: ComposesResponseItem;
};

export const AwsTarget = process.env.IS_ON_PREMISE
  ? // we don't need to clone composes for on-prem
    // since we can upload directly to the desired
    // region
    () => <>{targetOptions.aws}</>
  : ({ compose }: AwsTargetPropTypes) => {
      const { data, isSuccess } = useGetComposeClonesQuery({
        composeId: compose.id,
      });

      if (!isSuccess) {
        return <Skeleton />;
      }

      // Unnecessary conditional, expected left-hand side of `??` operator to be possibly null or undefined - disable-autofix/@typescript-eslint/no-unnecessary-condition
      // eslint-disable-next-line disable-autofix/@typescript-eslint/no-unnecessary-condition
      const text = `${targetOptions.aws} (${(data.data.length ?? 0) + 1})`;
      return <>{text}</>;
    };
