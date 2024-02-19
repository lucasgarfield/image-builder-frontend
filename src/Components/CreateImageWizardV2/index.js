import React from 'react';

import { useParams } from 'react-router-dom';

import CreateImageWizard from './CreateImageWizard';
import EditImageWizard from './EditImageWizard';

const ImageWizard = () => {
  const { composeId } = useParams();
  return composeId ? (
    <EditImageWizard composeId={composeId} />
  ) : (
    <CreateImageWizard />
  );
};
export default ImageWizard;
