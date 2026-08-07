import type { Bootc } from '@/store/api/backend/onprem';
import { resolveImageReference } from '@/store/api/backend/onprem/constants';

// Image mode: the bootc container provides the OS content. The
// CLI resolves the reference from root's local container storage,
// where the wizard has already pulled it — so the references must be
// resolved the same way as the pull (see resolveImageReference).
export const getBootcArgs = (bootc: Bootc | undefined): string[] => {
  if (!bootc) {
    return [];
  }
  const args = ['--bootc-ref', resolveImageReference(bootc.reference)];
  if (bootc.build_reference) {
    args.push(
      '--bootc-build-ref',
      resolveImageReference(bootc.build_reference),
    );
  }
  if (bootc.iso_payload_reference) {
    args.push(
      '--bootc-installer-payload-ref',
      resolveImageReference(bootc.iso_payload_reference),
    );
  }
  return args;
};
