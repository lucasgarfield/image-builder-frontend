import React from 'react';

import componentTypes from '@data-driven-forms/react-form-renderer/component-types';
import validatorTypes from '@data-driven-forms/react-form-renderer/validator-types';
import {
  Button,
  Popover,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, HelpIcon } from '@patternfly/react-icons';

import StepTemplate from './stepTemplate';

import CustomButtons from '../formComponents/CustomButtons';

const PopoverActivation = () => {
  return (
    <Popover
      hasAutoWidth
      maxWidth="35rem"
      bodyContent={
        <TextContent>
          <Text>
            Activation keys enable you to register a system with appropriate
            subscriptions, system purpose, and repositories attached.
            <br />
            <br />
            If using an activation key with command line registration, you must
            provide your organization&apos;s ID.
          </Text>
        </TextContent>
      }
    >
      <Button
        variant="plain"
        aria-label="Activation key popover"
        aria-describedby="subscription-activation-key"
        className="pf-c-form__group-label-help"
      >
        <HelpIcon />
      </Button>
    </Popover>
  );
};

export default {
  StepTemplate,
  id: 'wizard-registration',
  title: 'Registration',
  name: 'registration',
  nextStep: 'File system configuration',
  buttons: CustomButtons,
  fields: [
    {
      component: componentTypes.RADIO,
      label: 'Register images with Red Hat',
      name: 'register-system',
      initialValue: 'register-now-insights',
      options: [
        {
          label: 'Register and connect image instances with Red Hat',
          description: 'Includes Subscriptions and Red Hat Insights',
          value: 'register-now-insights',
          'data-testid': 'radio-register-now-insights',
          autoFocus: true,
        },
        {
          label: 'Register image instances only',
          description: 'Includes Subscriptions only',
          value: 'register-now',
          className: 'pf-u-mt-sm',
          'data-testid': 'radio-register-now',
        },
        {
          label: 'Register later',
          value: 'register-later',
          className: 'pf-u-mt-sm',
          'data-testid': 'radio-register-later',
        },
      ],
    },
    {
      component: 'activation-keys',
      name: 'subscription-activation-key',
      required: true,
      label: (
        <>
          Activation key to use for this image
          <PopoverActivation />
        </>
      ),
      condition: {
        or: [
          { when: 'register-system', is: 'register-now-insights' },
          { when: 'register-system', is: 'register-now' },
        ],
      },
      isRequired: true,
      validate: [
        {
          type: validatorTypes.REQUIRED,
        },
      ],
    },
    {
      component: componentTypes.PLAIN_TEXT,
      name: 'subscription-activation-description',
      label: (
        <Button
          component="a"
          target="_blank"
          variant="link"
          icon={<ExternalLinkAltIcon />}
          iconPosition="right"
          isInline
          href="https://access.redhat.com/management/activation_keys"
        >
          Create and manage activation keys here
        </Button>
      ),
      condition: {
        or: [
          { when: 'register-system', is: 'register-now-insights' },
          { when: 'register-system', is: 'register-now' },
        ],
      },
    },
    {
      component: componentTypes.PLAIN_TEXT,
      name: 'subscription-register-later',
      label: (
        <TextContent>
          <Text component={TextVariants.h3}>Register Later</Text>
          <Text>
            On initial boot, systems will need to be registered manually before
            having access to updates or Red Hat services.
          </Text>
          <Text>Registering now is recommended.</Text>
        </TextContent>
      ),
      condition: {
        or: [{ when: 'register-system', is: 'register-later' }],
      },
    },
    {
      component: 'activation-key-information',
      name: 'subscription-activation-key-information',
      label: 'Selected activation key',
      valueReference: 'subscription-activation-key',
    },
  ],
};
