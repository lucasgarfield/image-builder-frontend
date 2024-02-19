import React, { useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import CreateImageWizard from './CreateImageWizard';
import { mapRequestToState } from './utilities/requestMapper';

import { useAppDispatch } from '../../store/hooks';
import { useGetBlueprintQuery } from '../../store/imageBuilderApi';
import { loadWizardState, initializeWizard } from '../../store/wizardSlice';
import { resolveRelPath } from '../../Utilities/path';

type EditImageWizardProps = {
  composeId: string;
};

const EditImageWizard = ({ composeId }: EditImageWizardProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { data: blueprintDetails, error } = useGetBlueprintQuery({
    id: composeId,
  });
  useEffect(() => {
    if (composeId && blueprintDetails) {
      const editBlueprintState = mapRequestToState(blueprintDetails);
      dispatch(loadWizardState(editBlueprintState));
    } else {
      dispatch(initializeWizard());
    }
  }, [composeId, blueprintDetails, dispatch]);
  useEffect(() => {
    // redirect to the main page if the composeId is invalid
    if (error) navigate(resolveRelPath(''));
  }, [error, navigate]);
  return <CreateImageWizard startStepIndex={10} />;
};

export default EditImageWizard;
