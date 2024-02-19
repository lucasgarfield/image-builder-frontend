import React, { useState, useEffect } from 'react';

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  WizardFooterWrapper,
  useWizardContext,
} from '@patternfly/react-core';
import { SpinnerIcon } from '@patternfly/react-icons';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { useStore } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useComposeBlueprintMutation,
  useCreateBlueprintMutation,
  useUpdateBlueprintMutation,
} from '../../../../store/imageBuilderApi';
import { resolveRelPath } from '../../../../Utilities/path';
import { mapRequestFromState } from '../../utilities/requestMapper';

const ReviewWizardFooter = () => {
  const { goToPrevStep, close } = useWizardContext();
  const [
    createBlueprint,
    { isLoading: isCreationLoading, isSuccess: isCreationSuccess },
  ] = useCreateBlueprintMutation();
  const [buildBlueprint, { isLoading: isBuildLoading }] =
    useComposeBlueprintMutation();
  const [updateBlueprint] = useUpdateBlueprintMutation();
  const { auth } = useChrome();
  const navigate = useNavigate();
  const { composeId } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const store = useStore();
  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isCreationSuccess) {
      navigate(resolveRelPath(''));
    }
  }, [isCreationSuccess, navigate]);

  const getBlueprintPayload = async () => {
    const userData = await auth?.getUser();
    const orgId = userData?.identity?.internal?.org_id;
    const requestBody = orgId && mapRequestFromState(store, orgId);
    return requestBody;
  };

  const onSave = async () => {
    const requestBody = await getBlueprintPayload();
    setIsOpen(false);
    if (composeId) {
      requestBody &&
        updateBlueprint({ id: composeId, createBlueprintRequest: requestBody });
    } else {
      requestBody && createBlueprint({ createBlueprintRequest: requestBody });
    }
  };

  const onSaveAndBuild = async () => {
    const requestBody = await getBlueprintPayload();
    setIsOpen(false);
    if (composeId) {
      requestBody &&
        (await updateBlueprint({
          id: composeId,
          createBlueprintRequest: requestBody,
        }));
      buildBlueprint({ id: composeId });
    } else {
      const blueprint =
        !composeId &&
        requestBody &&
        (await createBlueprint({
          createBlueprintRequest: requestBody,
        }).unwrap());
      blueprint && buildBlueprint({ id: blueprint.id });
    }
  };

  return (
    <WizardFooterWrapper>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            variant="primary"
            ref={toggleRef}
            onClick={onToggleClick}
            isExpanded={isOpen}
            icon={(isBuildLoading || isCreationLoading) && <SpinnerIcon />}
          >
            Save
          </MenuToggle>
        )}
        ouiaId="wizard-finish-dropdown"
        shouldFocusToggleOnSelect
      >
        <DropdownList>
          <DropdownItem onClick={onSave} ouiaId="wizard-save-btn">
            Save changes
          </DropdownItem>
          <DropdownItem onClick={onSaveAndBuild} ouiaId="wizard-build-btn">
            Save and build images
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      <Button
        ouiaId="wizard-back-btn"
        variant="secondary"
        onClick={goToPrevStep}
      >
        Back
      </Button>
      <Button ouiaId="wizard-cancel-btn" variant="link" onClick={close}>
        Cancel
      </Button>
    </WizardFooterWrapper>
  );
};

export default ReviewWizardFooter;
