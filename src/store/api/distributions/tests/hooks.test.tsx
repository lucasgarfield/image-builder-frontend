import { ImageTypeInfo } from '@/store/api/backend';
import {
  ALL_CUSTOMIZATIONS,
  computeImageTypeCustomizationSupport,
  computeRestrictions,
  CustomizationType,
  imageModeDetails,
  imageModeTypeInfo,
  isCustomizationSupported,
  RestrictionStrategy,
  SupportContext,
} from '@/store/api/distributions';

import {
  computeRestrictionStrategy,
  getAllCustomizationTypes,
} from './helpers';
import {
  createMockDistributionDetails,
  defaultContext,
  mockImageTypes,
} from './mocks';

describe('useCustomizationRestrictions hook logic', () => {
  describe('default behavior (package mode, not on-premise)', () => {
    it('should not hide any customizations by default', () => {
      const result = computeRestrictionStrategy({
        isImageMode: false,
        isOnPremise: false,
      });

      for (const customization of getAllCustomizationTypes()) {
        expect(result[customization].shouldHide).toBe(false);
      }
    });
  });

  describe('image mode restrictions', () => {
    it('should allow filesystem, users and registration for a disk target', () => {
      const result = computeRestrictionStrategy({
        isImageMode: true,
        isOnPremise: false,
        imageType: 'guest-image',
      });

      expect(result.filesystem.shouldHide).toBe(false);
      expect(result.users.shouldHide).toBe(false);
      expect(result.registration.shouldHide).toBe(false);

      const allowedInImageMode = ['filesystem', 'users', 'registration'];
      const hiddenTypes = getAllCustomizationTypes().filter(
        (c) => !allowedInImageMode.includes(c),
      );
      for (const customization of hiddenTypes) {
        expect(result[customization].shouldHide).toBe(true);
      }
    });

    it('should hide every customization until an image type is selected', () => {
      const result = computeRestrictionStrategy({
        isImageMode: true,
        isOnPremise: false,
      });

      for (const customization of getAllCustomizationTypes()) {
        expect(result[customization].shouldHide).toBe(true);
      }
    });
  });

  describe('image mode registration', () => {
    const imageMode: SupportContext = {
      isImageMode: true,
      isOnPremise: false,
      isRhel: true,
    };

    const detailsFor = (imageType: 'guest-image' | 'aws' | 'gcp' | 'azure') => {
      const details = imageModeTypeInfo(imageType);
      if (!details) {
        throw new Error(`missing image mode details for ${imageType}`);
      }
      return details;
    };

    it.each(['guest-image', 'aws', 'gcp', 'azure'] as const)(
      'should show registration for hosted %s',
      (imageType) => {
        const result = computeRestrictions({
          imageTypes: { [imageType]: detailsFor(imageType) },
          context: imageMode,
        });

        expect(result.registration.shouldHide).toBe(false);
        expect(result.filesystem.shouldHide).toBe(false);
        expect(result.users.shouldHide).toBe(false);
        expect(result.packages.shouldHide).toBe(true);
      },
    );

    it('should show registration for on-premise disk targets', () => {
      const result = computeRestrictions({
        imageTypes: {
          'guest-image': detailsFor('guest-image'),
          aws: detailsFor('aws'),
        },
        context: { ...imageMode, isOnPremise: true },
      });

      expect(result.registration.shouldHide).toBe(false);
    });

    it.each([false, true])(
      'should hide registration for the container installer (on-premise=%s)',
      (isOnPremise) => {
        const iso = imageModeTypeInfo('bootable-container-iso');
        if (!iso) {
          throw new Error('missing image mode details for the installer');
        }
        const result = computeRestrictions({
          imageTypes: { 'bootable-container-iso': iso },
          context: { ...imageMode, isOnPremise },
        });

        expect(result.registration.shouldHide).toBe(true);
        expect(result.filesystem.shouldHide).toBe(true);
        expect(result.users.shouldHide).toBe(true);
      },
    );

    it('should use the image mode lists for the hosted bootc targets', () => {
      const details = imageModeDetails([
        'aws',
        'gcp',
        'azure',
        'guest-image',
        'bootable-container-iso',
        'image-installer',
      ]);

      expect(Object.keys(details).sort()).toEqual([
        'aws',
        'azure',
        'bootable-container-iso',
        'gcp',
        'guest-image',
      ]);
      expect(details.aws.supported_blueprint_options).toEqual([
        'filesystem',
        'users',
        'registration',
      ]);
      expect(
        details['bootable-container-iso'].supported_blueprint_options,
      ).toEqual([]);
    });

    it('should show registration for non-RHEL custom images', () => {
      const result = computeRestrictions({
        imageTypes: { 'guest-image': detailsFor('guest-image') },
        context: { ...imageMode, isRhel: false, isOnPremise: true },
      });

      expect(result.registration.shouldHide).toBe(false);
    });
  });

  describe('on-premise restrictions', () => {
    it('should hide repositories and firstboot on premise', () => {
      const result = computeRestrictionStrategy({
        isImageMode: false,
        isOnPremise: true,
      });

      expect(result.repositories.shouldHide).toBe(true);
      expect(result.firstboot.shouldHide).toBe(true);
    });

    it('should allow other customizations on premise', () => {
      const result = computeRestrictionStrategy({
        isImageMode: false,
        isOnPremise: true,
      });

      // These should not be hidden
      expect(result.packages.shouldHide).toBe(false);
      expect(result.filesystem.shouldHide).toBe(false);
      expect(result.kernel.shouldHide).toBe(false);
      expect(result.users.shouldHide).toBe(false);
      expect(result.hostname.shouldHide).toBe(false);
    });
  });

  describe('non-RHEL distribution restrictions', () => {
    it('should hide registration for non-RHEL distributions', () => {
      const result = computeRestrictionStrategy({
        isImageMode: false,
        isOnPremise: false,
        distro: 'centos-9',
      });

      expect(result.registration.shouldHide).toBe(true);
    });

    it('should not hide registration for RHEL distributions', () => {
      const result = computeRestrictionStrategy({
        isImageMode: false,
        isOnPremise: false,
        distro: 'rhel-9',
      });

      expect(result.registration.shouldHide).toBe(false);
    });

    it('should not hide other customizations for non-RHEL distributions', () => {
      const result = computeRestrictionStrategy({
        isImageMode: false,
        isOnPremise: false,
        distro: 'centos-9',
      });

      expect(result.packages.shouldHide).toBe(false);
      expect(result.filesystem.shouldHide).toBe(false);
      expect(result.users.shouldHide).toBe(false);
    });
  });

  describe('combined restrictions', () => {
    it('should combine image mode and on-premise restrictions', () => {
      const result = computeRestrictionStrategy({
        isImageMode: true,
        isOnPremise: true,
        imageType: 'guest-image',
      });

      expect(result.filesystem.shouldHide).toBe(false);
      expect(result.users.shouldHide).toBe(false);
      expect(result.registration.shouldHide).toBe(false);

      expect(result.packages.shouldHide).toBe(true);
      expect(result.repositories.shouldHide).toBe(true);
      expect(result.firstboot.shouldHide).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle all customization types', () => {
      const result = computeRestrictionStrategy({
        isImageMode: false,
        isOnPremise: false,
      });

      // Verify all customization types are present
      for (const customization of getAllCustomizationTypes()) {
        expect(result[customization]).toBeDefined();
        expect(result[customization]).toHaveProperty('shouldHide');
      }
    });
  });

  describe('image type restrictions', () => {
    it('should hide customization when single image type does not support it', () => {
      const data = createMockDistributionDetails({
        'image-installer': mockImageTypes.imageInstallerWithoutFilesystem,
      });

      const result = computeRestrictions({
        imageTypes: data.architectures!.x86_64.image_types!,
        context: defaultContext,
      });

      expect(result.filesystem.shouldHide).toBe(true);
      expect(result.packages.shouldHide).toBe(false);
    });

    it('should hide customization when no selected image types support it', () => {
      const data = createMockDistributionDetails({
        'image-installer': {
          supported_blueprint_options: ['packages', 'users'],
        },
        wsl: { supported_blueprint_options: ['packages', 'users'] },
      });

      const result = computeRestrictions({
        imageTypes: data.architectures!.x86_64.image_types!,
        context: defaultContext,
      });

      expect(result.filesystem.shouldHide).toBe(true);
      expect(result.packages.shouldHide).toBe(false);
    });

    it('should show customization when at least one image type supports it', () => {
      const data = createMockDistributionDetails({
        aws: mockImageTypes.awsWithLimitedCustomizations,
        'image-installer': {
          supported_blueprint_options: ['packages', 'users'],
        },
      });

      const result = computeRestrictions({
        imageTypes: data.architectures!.x86_64.image_types!,
        context: defaultContext,
      });

      expect(result.filesystem.shouldHide).toBe(false);
      expect(result.packages.shouldHide).toBe(false);
    });

    it('should hide most customizations for network-installer', () => {
      const data = createMockDistributionDetails({
        'network-installer': mockImageTypes.networkInstallerMinimal,
      });

      const result = computeRestrictions({
        imageTypes: data.architectures!.x86_64.image_types!,
        context: defaultContext,
      });

      expect(result.locale.shouldHide).toBe(false);
      expect(result.fips.shouldHide).toBe(false);
      expect(result.packages.shouldHide).toBe(true);
      expect(result.filesystem.shouldHide).toBe(true);
      expect(result.kernel.shouldHide).toBe(true);
      expect(result.timezone.shouldHide).toBe(true);
      expect(result.users.shouldHide).toBe(true);
    });

    it('should handle image type with undefined supported_blueprint_options alongside one that defines it', () => {
      const data = createMockDistributionDetails({
        aws: { supported_blueprint_options: ['filesystem', 'packages'] },
        gcp: mockImageTypes.gcpUndefined,
      });

      const result = computeRestrictions({
        imageTypes: data.architectures!.x86_64.image_types!,
        context: defaultContext,
      });

      for (const customization of getAllCustomizationTypes()) {
        expect(result[customization].shouldHide).toBe(false);
      }
    });

    it('should not hide any customizations when image_types is an empty object', () => {
      const data = createMockDistributionDetails({});

      const result = computeRestrictions({
        imageTypes: data.architectures!.x86_64.image_types!,
        context: defaultContext,
      });

      for (const customization of getAllCustomizationTypes()) {
        expect(result[customization].shouldHide).toBe(false);
      }
    });
  });
});

describe('RestrictionStrategy type', () => {
  it('should have correct structure', () => {
    const strategy: RestrictionStrategy = {
      shouldHide: false,
    };

    expect(strategy).toHaveProperty('shouldHide');
  });
});

describe('ALL_CUSTOMIZATIONS', () => {
  it('should contain all expected customization types', () => {
    const expectedTypes: CustomizationType[] = [
      'packages',
      'repositories',
      'filesystem',
      'kernel',
      'timezone',
      'locale',
      'firewall',
      'services',
      'hostname',
      'firstboot',
      'openscap',
      'registration',
      'users',
      'fips',
      'aap',
    ];

    expect([...ALL_CUSTOMIZATIONS]).toEqual(expectedTypes);
  });

  it('should have 15 customization types', () => {
    expect(ALL_CUSTOMIZATIONS).toHaveLength(15);
  });
});

describe('isCustomizationSupported', () => {
  describe('image mode restrictions', () => {
    const imageModeCxt: SupportContext = {
      isImageMode: true,
      isOnPremise: false,
      isRhel: true,
    };

    it('should follow the image mode option list for a disk target', () => {
      const disk = imageModeTypeInfo('guest-image');
      expect(isCustomizationSupported('filesystem', disk, imageModeCxt)).toBe(
        true,
      );
      expect(isCustomizationSupported('users', disk, imageModeCxt)).toBe(true);
      expect(
        isCustomizationSupported('registration', disk, imageModeCxt),
      ).toBe(true);
      expect(isCustomizationSupported('packages', disk, imageModeCxt)).toBe(
        false,
      );
    });

    it('should hide registration for the container installer', () => {
      const iso = imageModeTypeInfo('bootable-container-iso');
      expect(isCustomizationSupported('registration', iso, imageModeCxt)).toBe(
        false,
      );
      expect(isCustomizationSupported('filesystem', iso, imageModeCxt)).toBe(
        false,
      );
    });
  });

  describe('on-premise restrictions', () => {
    const onPremiseCtx: SupportContext = {
      isImageMode: false,
      isOnPremise: true,
      isRhel: true,
    };

    it('should hide repositories and firstboot on premise', () => {
      expect(
        isCustomizationSupported('repositories', undefined, onPremiseCtx),
      ).toBe(false);
      expect(
        isCustomizationSupported('firstboot', undefined, onPremiseCtx),
      ).toBe(false);
    });

    it('should allow other customizations on premise', () => {
      expect(
        isCustomizationSupported('packages', undefined, onPremiseCtx),
      ).toBe(true);
      expect(
        isCustomizationSupported('filesystem', undefined, onPremiseCtx),
      ).toBe(true);
      expect(isCustomizationSupported('users', undefined, onPremiseCtx)).toBe(
        true,
      );
      expect(isCustomizationSupported('kernel', undefined, onPremiseCtx)).toBe(
        true,
      );
    });
  });

  describe('distribution restrictions', () => {
    it('should hide registration for non-RHEL distributions', () => {
      const nonRhelCtx: SupportContext = {
        isImageMode: false,
        isOnPremise: false,
        isRhel: false,
      };

      expect(
        isCustomizationSupported('registration', undefined, nonRhelCtx),
      ).toBe(false);
    });

    it('should hide aap for non-RHEL distributions', () => {
      const nonRhelCtx: SupportContext = {
        isImageMode: false,
        isOnPremise: false,
        isRhel: false,
      };

      expect(isCustomizationSupported('aap', undefined, nonRhelCtx)).toBe(
        false,
      );
    });

    it('should allow aap for RHEL distributions', () => {
      const rhelCtx: SupportContext = {
        isImageMode: false,
        isOnPremise: false,
        isRhel: true,
      };

      expect(isCustomizationSupported('aap', undefined, rhelCtx)).toBe(true);
    });

    it('should allow registration for RHEL distributions', () => {
      const rhelCtx: SupportContext = {
        isImageMode: false,
        isOnPremise: false,
        isRhel: true,
      };

      expect(isCustomizationSupported('registration', undefined, rhelCtx)).toBe(
        true,
      );
    });

    it('should allow other customizations for non-RHEL distributions', () => {
      const nonRhelCtx: SupportContext = {
        isImageMode: false,
        isOnPremise: false,
        isRhel: false,
      };

      expect(isCustomizationSupported('packages', undefined, nonRhelCtx)).toBe(
        true,
      );
      expect(
        isCustomizationSupported('filesystem', undefined, nonRhelCtx),
      ).toBe(true);
      expect(isCustomizationSupported('users', undefined, nonRhelCtx)).toBe(
        true,
      );
    });
  });

  describe('image type supported_blueprint_options', () => {
    const defaultCtx: SupportContext = {
      isImageMode: false,
      isOnPremise: false,
      isRhel: true,
    };

    it('should respect image type supported_blueprint_options list', () => {
      const imageType: ImageTypeInfo = {
        name: 'test-image',
        supported_blueprint_options: ['packages', 'users'],
      };

      expect(isCustomizationSupported('packages', imageType, defaultCtx)).toBe(
        true,
      );
      expect(isCustomizationSupported('users', imageType, defaultCtx)).toBe(
        true,
      );
      expect(
        isCustomizationSupported('filesystem', imageType, defaultCtx),
      ).toBe(false);
      expect(isCustomizationSupported('kernel', imageType, defaultCtx)).toBe(
        false,
      );
    });

    it('should allow all customizations when supported_blueprint_options is undefined', () => {
      const imageType: ImageTypeInfo = {
        name: 'test-image',
      };

      expect(isCustomizationSupported('packages', imageType, defaultCtx)).toBe(
        true,
      );
      expect(
        isCustomizationSupported('filesystem', imageType, defaultCtx),
      ).toBe(true);
      expect(isCustomizationSupported('kernel', imageType, defaultCtx)).toBe(
        true,
      );
      expect(isCustomizationSupported('users', imageType, defaultCtx)).toBe(
        true,
      );
    });

    it('should allow all customizations when imageType is undefined', () => {
      expect(isCustomizationSupported('packages', undefined, defaultCtx)).toBe(
        true,
      );
      expect(
        isCustomizationSupported('filesystem', undefined, defaultCtx),
      ).toBe(true);
      expect(isCustomizationSupported('kernel', undefined, defaultCtx)).toBe(
        true,
      );
    });

    it('should combine on-premise restrictions with image type restrictions', () => {
      const onPremiseCtx: SupportContext = {
        isImageMode: false,
        isOnPremise: true,
        isRhel: true,
      };
      const imageType: ImageTypeInfo = {
        name: 'test-image',
        supported_blueprint_options: ['packages', 'repositories', 'firstboot'],
      };

      // packages is in supported list and not blocked by on-premise
      expect(
        isCustomizationSupported('packages', imageType, onPremiseCtx),
      ).toBe(true);
      // repositories is in supported list but blocked by on-premise
      expect(
        isCustomizationSupported('repositories', imageType, onPremiseCtx),
      ).toBe(false);
      // firstboot is in supported list but blocked by on-premise
      expect(
        isCustomizationSupported('firstboot', imageType, onPremiseCtx),
      ).toBe(false);
    });
  });

  describe('precedence rules', () => {
    it('should still block repositories on premise in image mode', () => {
      const imageModeOnPremiseCtx: SupportContext = {
        isImageMode: true,
        isOnPremise: true,
        isRhel: true,
      };
      const imageType: ImageTypeInfo = {
        name: 'guest-image',
        supported_blueprint_options: ['filesystem', 'repositories'],
      };

      expect(
        isCustomizationSupported(
          'filesystem',
          imageType,
          imageModeOnPremiseCtx,
        ),
      ).toBe(true);
      expect(
        isCustomizationSupported(
          'repositories',
          imageType,
          imageModeOnPremiseCtx,
        ),
      ).toBe(false);
    });
  });
});

describe('computeImageTypeCustomizationSupport', () => {
  const defaultCtx: SupportContext = {
    isImageMode: false,
    isOnPremise: false,
    isRhel: true,
  };

  describe('empty and edge cases', () => {
    it('should return empty array when no image types provided', () => {
      const result = computeImageTypeCustomizationSupport(
        {},
        'packages',
        defaultCtx,
      );

      expect(result).toEqual([]);
    });

    it('should filter out entries with invalid image type keys', () => {
      const imageTypes: Record<string, ImageTypeInfo> = {
        'invalid-image-type': {
          name: 'invalid',
          supported_blueprint_options: ['packages'],
        },
      };

      const result = computeImageTypeCustomizationSupport(
        imageTypes,
        'packages',
        defaultCtx,
      );

      expect(result).toEqual([]);
    });
  });

  describe('single image type', () => {
    it('should return supported=true when image type supports the customization', () => {
      const imageTypes: Record<string, ImageTypeInfo> = {
        aws: {
          name: 'aws',
          supported_blueprint_options: ['packages', 'filesystem', 'users'],
        },
      };

      const result = computeImageTypeCustomizationSupport(
        imageTypes,
        'packages',
        defaultCtx,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'AWS',
        supported: true,
      });
    });

    it('should return supported=false when image type does not support the customization', () => {
      const imageTypes: Record<string, ImageTypeInfo> = {
        aws: {
          name: 'aws',
          supported_blueprint_options: ['packages', 'users'],
        },
      };

      const result = computeImageTypeCustomizationSupport(
        imageTypes,
        'filesystem',
        defaultCtx,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'AWS',
        supported: false,
      });
    });

    it('should return supported=true when supported_blueprint_options is undefined', () => {
      const imageTypes: Record<string, ImageTypeInfo> = {
        gcp: {
          name: 'gcp',
        },
      };

      const result = computeImageTypeCustomizationSupport(
        imageTypes,
        'filesystem',
        defaultCtx,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Google Cloud',
        supported: true,
      });
    });
  });

  describe('multiple image types', () => {
    it('should return correct support status for each image type', () => {
      const imageTypes: Record<string, ImageTypeInfo> = {
        aws: {
          name: 'aws',
          supported_blueprint_options: ['packages', 'filesystem'],
        },
        'image-installer': {
          name: 'image-installer',
          supported_blueprint_options: ['packages'],
        },
      };

      const result = computeImageTypeCustomizationSupport(
        imageTypes,
        'filesystem',
        defaultCtx,
      );

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        name: 'AWS',
        supported: true,
      });
      expect(result).toContainEqual({
        name: 'Installer',
        supported: false,
      });
    });

    it('should handle mixed valid and invalid image type keys', () => {
      const imageTypes: Record<string, ImageTypeInfo> = {
        aws: {
          name: 'aws',
          supported_blueprint_options: ['packages'],
        },
        'not-a-real-type': {
          name: 'fake',
          supported_blueprint_options: ['packages'],
        },
        gcp: {
          name: 'gcp',
          supported_blueprint_options: ['packages'],
        },
      };

      const result = computeImageTypeCustomizationSupport(
        imageTypes,
        'packages',
        defaultCtx,
      );

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toContain('AWS');
      expect(result.map((r) => r.name)).toContain('Google Cloud');
      expect(result.map((r) => r.name)).not.toContain('fake');
    });
  });

  describe('name mapping', () => {
    it('should map image type keys to display names correctly', () => {
      const imageTypes: Record<string, ImageTypeInfo> = {
        aws: { name: 'aws' },
        azure: { name: 'azure' },
        gcp: { name: 'gcp' },
        'guest-image': { name: 'guest-image' },
        vsphere: { name: 'vsphere' },
        wsl: { name: 'wsl' },
      };

      const result = computeImageTypeCustomizationSupport(
        imageTypes,
        'packages',
        defaultCtx,
      );

      const names = result.map((r) => r.name);
      expect(names).toContain('AWS');
      expect(names).toContain('Microsoft Azure');
      expect(names).toContain('Google Cloud');
      expect(names).toContain('Guest image');
      expect(names).toContain('vSphere');
      expect(names).toContain('WSL');
    });
  });

  describe('context restrictions', () => {
    it('should respect on-premise restrictions', () => {
      const onPremiseCtx: SupportContext = {
        isImageMode: false,
        isOnPremise: true,
        isRhel: true,
      };

      const imageTypes: Record<string, ImageTypeInfo> = {
        aws: {
          name: 'aws',
          supported_blueprint_options: [
            'repositories',
            'firstboot',
            'packages',
          ],
        },
      };

      const reposResult = computeImageTypeCustomizationSupport(
        imageTypes,
        'repositories',
        onPremiseCtx,
      );
      expect(reposResult[0].supported).toBe(false);

      const firstbootResult = computeImageTypeCustomizationSupport(
        imageTypes,
        'firstboot',
        onPremiseCtx,
      );
      expect(firstbootResult[0].supported).toBe(false);

      const packagesResult = computeImageTypeCustomizationSupport(
        imageTypes,
        'packages',
        onPremiseCtx,
      );
      expect(packagesResult[0].supported).toBe(true);
    });

    it('should respect non-RHEL distribution restrictions', () => {
      const nonRhelCtx: SupportContext = {
        isImageMode: false,
        isOnPremise: false,
        isRhel: false,
      };

      const imageTypes: Record<string, ImageTypeInfo> = {
        aws: {
          name: 'aws',
          supported_blueprint_options: ['registration', 'packages'],
        },
      };

      const registrationResult = computeImageTypeCustomizationSupport(
        imageTypes,
        'registration',
        nonRhelCtx,
      );
      expect(registrationResult[0].supported).toBe(false);

      const packagesResult = computeImageTypeCustomizationSupport(
        imageTypes,
        'packages',
        nonRhelCtx,
      );
      expect(packagesResult[0].supported).toBe(true);
    });

    it('should respect image mode option lists', () => {
      const imageModeCtx: SupportContext = {
        isImageMode: true,
        isOnPremise: false,
        isRhel: true,
      };
      const aws = imageModeTypeInfo('aws');
      if (!aws) {
        throw new Error('missing image mode details for aws');
      }

      const imageTypes: Record<string, ImageTypeInfo> = { aws };

      expect(
        computeImageTypeCustomizationSupport(
          imageTypes,
          'filesystem',
          imageModeCtx,
        )[0].supported,
      ).toBe(true);
      expect(
        computeImageTypeCustomizationSupport(
          imageTypes,
          'registration',
          imageModeCtx,
        )[0].supported,
      ).toBe(true);
      expect(
        computeImageTypeCustomizationSupport(
          imageTypes,
          'packages',
          imageModeCtx,
        )[0].supported,
      ).toBe(false);
      expect(
        computeImageTypeCustomizationSupport(
          imageTypes,
          'kernel',
          imageModeCtx,
        )[0].supported,
      ).toBe(false);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle network-installer which only supports locale and fips', () => {
      const imageTypes: Record<string, ImageTypeInfo> = {
        'network-installer': {
          name: 'network-installer',
          supported_blueprint_options: ['locale', 'fips'],
        },
      };

      const localeResult = computeImageTypeCustomizationSupport(
        imageTypes,
        'locale',
        defaultCtx,
      );
      expect(localeResult[0]).toEqual({
        name: 'Network Installer',
        supported: true,
      });

      const packagesResult = computeImageTypeCustomizationSupport(
        imageTypes,
        'packages',
        defaultCtx,
      );
      expect(packagesResult[0]).toEqual({
        name: 'Network Installer',
        supported: false,
      });
    });

    it('should handle wsl which does not support filesystem or kernel', () => {
      const imageTypes: Record<string, ImageTypeInfo> = {
        wsl: {
          name: 'wsl',
          supported_blueprint_options: ['packages', 'users', 'timezone'],
        },
      };

      const filesystemResult = computeImageTypeCustomizationSupport(
        imageTypes,
        'filesystem',
        defaultCtx,
      );
      expect(filesystemResult[0].supported).toBe(false);

      const kernelResult = computeImageTypeCustomizationSupport(
        imageTypes,
        'kernel',
        defaultCtx,
      );
      expect(kernelResult[0].supported).toBe(false);

      const packagesResult = computeImageTypeCustomizationSupport(
        imageTypes,
        'packages',
        defaultCtx,
      );
      expect(packagesResult[0].supported).toBe(true);
    });

    it('should correctly identify support across multiple image types for UI labeling', () => {
      const imageTypes: Record<string, ImageTypeInfo> = {
        aws: {
          name: 'aws',
          supported_blueprint_options: ['filesystem', 'packages'],
        },
        'image-installer': {
          name: 'image-installer',
          supported_blueprint_options: ['packages'],
        },
        wsl: {
          name: 'wsl',
          supported_blueprint_options: ['packages'],
        },
      };

      const result = computeImageTypeCustomizationSupport(
        imageTypes,
        'filesystem',
        defaultCtx,
      );

      const awsEntry = result.find((r) => r.name === 'AWS');
      const installerEntry = result.find((r) => r.name === 'Installer');
      const wslEntry = result.find((r) => r.name === 'WSL');

      expect(awsEntry?.supported).toBe(true);
      expect(installerEntry?.supported).toBe(false);
      expect(wslEntry?.supported).toBe(false);
    });
  });
});
