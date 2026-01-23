import React from 'react';

import { Alert } from '@patternfly/react-core';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { SerializedError } from '@reduxjs/toolkit';

type TemplatesErrorProps = {
  error: FetchBaseQueryError | SerializedError | undefined;
};

const TemplatesError = ({ error }: TemplatesErrorProps) => {
  const is401 = error && 'status' in error && error.status === 401;

  if (is401) {
    return (
      <Alert title="You do not have access" variant="danger" isPlain isInline>
        Contact your organization administrator(s) for more information.
      </Alert>
    );
  }

  return (
    <Alert
      title="Content templates unavailable"
      variant="danger"
      isPlain
      isInline
    >
      Content templates cannot be reached, try again later.
    </Alert>
  );
};

export default TemplatesError;
