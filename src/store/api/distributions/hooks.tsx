import { useMemo } from 'react';

import { simpleTargetNames } from '@/constants';
import {
  ArchitectureInfo,
  ImageTypeInfo,
  ImageTypes,
} from '@/store/api/backend';
import { useGetDistributionQuery } from '@/store/api/backend/hosted';
import { useAppSelector } from '@/store/hooks';
import { selectIsOnPremise } from '@/store/slices/env';
import {
  isImageType,
  isRhel,
  selectArchitecture,
  selectDistribution,
  selectImageTypes,
  selectIsImageMode,
} from '@/store/slices/wizard';
import { useFlag } from '@/Utilities/useGetEnvironment';

import {
  ALL_CUSTOMIZATIONS,
  BACKEND_TO_FRONTEND_OPTIONS,
  DISTRO_DETAILS,
} from './constants';
import { CustomizationType, RestrictionStrategy } from './types';

export const normalizeOptions = (
  options: string[] | undefined,
): string[] | undefined => {
  if (!options) return undefined;
  return [
    ...new Set(
      options
        .flatMap((opt) => BACKEND_TO_FRONTEND_OPTIONS[opt] ?? [])
        .filter(Boolean),
    ),
  ];
};

export const resolveImageTypeKeys = (
  key: string,
  aliases: string[] | undefined,
): string[] => {
  const keys: string[] = [];
  if (isImageType(key)) {
    keys.push(key);
  }
  if (aliases) {
    for (const alias of aliases) {
      if (isImageType(alias)) {
        keys.push(alias);
      }
    }
  }
  return keys.length > 0 ? keys : [key];
};

export const extractImageTypes = ({
  architectures,
  arch,
}: {
  architectures: Record<string, ArchitectureInfo> | undefined;
  arch: string;
}): Record<string, ImageTypeInfo> => {
  if (
    !architectures ||
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    !architectures[arch] ||
    !architectures[arch].image_types
  ) {
    return {};
  }

  const raw = architectures[arch].image_types;
  const normalized: Record<string, ImageTypeInfo> = {};
  const normalizedOptions = (value: ImageTypeInfo) => ({
    ...value,
    supported_blueprint_options: normalizeOptions(
      value.supported_blueprint_options,
    ),
  });

  for (const [key, value] of Object.entries(raw)) {
    for (const frontendKey of resolveImageTypeKeys(key, value.aliases)) {
      normalized[frontendKey] = normalizedOptions(value);
    }
  }
  return normalized;
};

export type SupportContext = {
  isImageMode: boolean;
  isOnPremise: boolean;
  isRhel: boolean;
  isImageModeRegistrationEnabled?: boolean;
};

const supportsImageModeRegistration = (
  context: SupportContext,
  imageTypeKey: string | undefined,
): boolean => {
  if (context.isOnPremise) {
    return true;
  }

  if (!context.isImageModeRegistrationEnabled || imageTypeKey === undefined) {
    return false;
  }

  // ISO and PXE targets cannot register, even if their package-mode
  // metadata advertises registration support.
  const diskImageTypes = ['ami', 'aws', 'gcp', 'azure', 'qcow2', 'guest-image'];
  return diskImageTypes.includes(imageTypeKey);
};

const getImageModeTargetDetails = (
  selectedImageTypes: ImageTypes[],
  availableImageTypes: Record<string, ImageTypeInfo>,
): Record<string, ImageTypeInfo> => {
  const imageTypes: Record<string, ImageTypeInfo> = {};

  for (const imageType of selectedImageTypes) {
    if (imageType in availableImageTypes) {
      imageTypes[imageType] = availableImageTypes[imageType];
    } else {
      // Keep target-specific restrictions active while metadata loads.
      imageTypes[imageType] = { name: imageType };
    }
  }

  return imageTypes;
};

export const isCustomizationSupported = (
  customization: CustomizationType,
  imageType: ImageTypeInfo | undefined,
  ctx: SupportContext,
  imageTypeKey?: string,
) => {
  if (
    ctx.isOnPremise &&
    // on-premise doesn't allow first boot & repository
    // customizations just yet
    ['repositories', 'firstboot'].includes(customization)
  ) {
    return false;
  }

  if (ctx.isImageMode) {
    if (imageTypeKey === undefined && imageType !== undefined) {
      imageTypeKey = imageType.name;
    }

    const imageModeOptions = ['filesystem', 'users'];
    if (supportsImageModeRegistration(ctx, imageTypeKey)) {
      imageModeOptions.push('registration');
    }

    if (!imageModeOptions.includes(customization)) {
      return false;
    }
  }

  // only rhel distros support registration; in image mode the OS comes from
  // the selected container image (official RHEL or custom), not the
  // distribution, so the check doesn't apply
  if (
    !ctx.isImageMode &&
    !ctx.isRhel &&
    (customization === 'registration' || customization === 'aap')
  ) {
    return false;
  }

  const supportedOptions = imageType?.supported_blueprint_options;
  if (supportedOptions === undefined) {
    return true;
  }

  return supportedOptions.includes(customization);
};

export type ComputeRestrictionsArgs = {
  imageTypes: Record<string, ImageTypeInfo>;
  context: SupportContext;
};

export const computeRestrictions = ({
  imageTypes,
  context: ctx,
}: ComputeRestrictionsArgs): Record<CustomizationType, RestrictionStrategy> => {
  const result: Record<CustomizationType, RestrictionStrategy> = {} as Record<
    CustomizationType,
    RestrictionStrategy
  >;

  for (const customization of ALL_CUSTOMIZATIONS) {
    const supportedOptions: Set<string> = new Set();

    // This covers the default case at the beginning of the wizard
    // when the user hasn't selected any image types yet
    if (Object.keys(imageTypes).length === 0) {
      if (isCustomizationSupported(customization, undefined, ctx)) {
        supportedOptions.add(customization);
      }
    }

    for (const it of Object.keys(imageTypes)) {
      if (isCustomizationSupported(customization, imageTypes[it], ctx, it)) {
        supportedOptions.add(customization);
      }
    }

    result[customization] = {
      shouldHide: !supportedOptions.has(customization),
    };
  }

  return result;
};

// Instead of exporting the hook directly from the backend API,
// let's create a wrapper around this to transform the data so that it is easier
// to work with where we need it. This way it will be easy to decide whether we
// need to hide the customizations or display an alert, without complex conditionals
// in the ui components.
export const useCustomizationRestrictions = ({
  selectedImageTypes,
}: {
  selectedImageTypes: ImageTypes[];
}) => {
  const distro = useAppSelector(selectDistribution);
  const arch = useAppSelector(selectArchitecture);
  const isOnPremise = useAppSelector(selectIsOnPremise);
  const isImageMode = useAppSelector(selectIsImageMode);
  const isImageModeRegistrationEnabled = useFlag(
    'image-builder.image-mode-registration.enabled',
  );

  const { data } = useGetDistributionQuery(
    {
      distro: distro,
      architecture: [arch],
      imageType: selectedImageTypes,
    },
    { skip: isOnPremise },
  );

  const restrictions = useMemo(() => {
    let imageTypes = isOnPremise
      ? Object.fromEntries(
          selectedImageTypes
            .filter((it) => it in DISTRO_DETAILS)
            .map((it) => [it, DISTRO_DETAILS[it]]),
        )
      : extractImageTypes({
          architectures: data?.architectures,
          arch,
        });

    if (isImageMode) {
      imageTypes = getImageModeTargetDetails(selectedImageTypes, imageTypes);
    }

    return computeRestrictions({
      imageTypes,
      context: {
        isImageMode,
        isOnPremise,
        isRhel: isRhel(distro),
        isImageModeRegistrationEnabled,
      },
    });
  }, [
    data,
    distro,
    arch,
    isImageMode,
    isOnPremise,
    selectedImageTypes,
    isImageModeRegistrationEnabled,
  ]);

  return {
    restrictions,
  };
};

export type ImageTypeCustomizationSupport = {
  name: string | undefined;
  supported: boolean;
};

export const computeImageTypeCustomizationSupport = (
  imageTypes: Record<string, ImageTypeInfo>,
  customization: CustomizationType,
  context: SupportContext,
): ImageTypeCustomizationSupport[] => {
  return (
    Object.keys(imageTypes)
      .map((it) => {
        // we should be okay here, but it's better to be a bit
        // defensive and add a typecheck
        if (!isImageType(it)) {
          return {
            name: undefined,
            supported: false,
          };
        }

        const imageTypeName = simpleTargetNames[it];
        const isSupported = isCustomizationSupported(
          customization,
          imageTypes[it],
          context,
          it,
        );

        return {
          supported: isSupported,
          name: imageTypeName,
        };
      })
      // this is again a defensive check just incase the
      // naming lookup fails or returns an undefined result
      .filter(({ name }) => name)
  );
};

export const useImageTypeCustomizationSupport = (
  customization: CustomizationType,
) => {
  const distro = useAppSelector(selectDistribution);
  const arch = useAppSelector(selectArchitecture);
  const isOnPremise = useAppSelector(selectIsOnPremise);
  const isImageMode = useAppSelector(selectIsImageMode);
  const selectedImageTypes = useAppSelector(selectImageTypes);
  const isImageModeRegistrationEnabled = useFlag(
    'image-builder.image-mode-registration.enabled',
  );

  const { data } = useGetDistributionQuery(
    {
      distro: distro,
      architecture: [arch],
      imageType: selectedImageTypes,
    },
    {
      skip: isImageMode || isOnPremise,
    },
  );

  if (selectedImageTypes.length <= 1) {
    // Labels are only meaningful when multiple image types are selected,
    // showing per-target support. With 0 or 1 targets the wizard hides
    // unsupported steps entirely, so no labels are needed.
    return [];
  }

  let imageTypes = isOnPremise
    ? Object.fromEntries(
        selectedImageTypes
          .filter((it) => it in DISTRO_DETAILS)
          .map((it) => [it, DISTRO_DETAILS[it]]),
      )
    : extractImageTypes({
        architectures: data?.architectures,
        arch,
      });

  if (isImageMode) {
    imageTypes = getImageModeTargetDetails(selectedImageTypes, imageTypes);
  }

  return computeImageTypeCustomizationSupport(imageTypes, customization, {
    isImageMode,
    isOnPremise,
    isRhel: isRhel(distro),
    isImageModeRegistrationEnabled,
  });
};
