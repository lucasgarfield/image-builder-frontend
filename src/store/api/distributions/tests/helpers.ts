import { ImageTypes } from '@/store/api/backend';
import { isRhel } from '@/store/slices/wizard';

import {
  ALL_CUSTOMIZATIONS,
  computeRestrictions,
  type CustomizationType,
  imageModeTypeInfo,
} from '..';

export type ComputeRestrictionStrategyArgs = {
  isImageMode: boolean;
  isOnPremise: boolean;
  distro?: string;
  imageType?: ImageTypes;
};

export const computeRestrictionStrategy = ({
  isImageMode,
  isOnPremise,
  distro = 'rhel-9',
  imageType,
}: ComputeRestrictionStrategyArgs) => {
  const details = imageType ? imageModeTypeInfo(imageType) : undefined;
  return computeRestrictions({
    imageTypes: details && imageType ? { [imageType]: details } : {},
    context: {
      isImageMode,
      isOnPremise,
      isRhel: isRhel(distro),
    },
  });
};

export const getAllCustomizationTypes = (): CustomizationType[] => [
  ...ALL_CUSTOMIZATIONS,
];
