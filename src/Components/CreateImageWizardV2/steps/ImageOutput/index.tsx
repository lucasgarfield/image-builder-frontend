import React from 'react';

import { Text, Form, Title } from '@patternfly/react-core';

import ArchSelect from './ArchSelect';
import ReleaseLifecycle from './ReleaseLifecycle';
import ReleaseSelect from './ReleaseSelect';
import TargetEnvironment from './TargetEnvironment';

import DocumentationButton from '../../../sharedComponents/DocumentationButton';

const ImageOutputStep = () => {
  return (
    <Form>
      <Title headingLevel="h2">Image output</Title>
      <Text>
        Image builder allows you to create a custom image and push it to target
        environments.
        <br />
        <DocumentationButton />
      </Text>
      <ReleaseSelect />
      <ReleaseLifecycle />
      <ArchSelect />
      <TargetEnvironment />
    </Form>
  );
};

export default ImageOutputStep;
