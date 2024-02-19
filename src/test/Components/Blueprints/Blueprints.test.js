import React from 'react';

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';

import CreateImageWizard from '../../../Components/CreateImageWizardV2';
import LandingPage from '../../../Components/LandingPage/LandingPage';
import { IMAGE_BUILDER_API } from '../../../constants';
import { emptyGetBlueprints } from '../../fixtures/blueprints';
import { server } from '../../mocks/server';
import {
  renderCustomRoutesWithReduxRouter,
  renderWithReduxRouter,
} from '../../testUtils';
import '@testing-library/jest-dom';

import '@testing-library/jest-dom';

jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  useChrome: () => ({
    isBeta: () => false,
    isProd: () => true,
    getEnvironment: () => 'prod',
  }),
}));

jest.mock('@unleash/proxy-client-react', () => ({
  useUnleashContext: () => jest.fn(),
  useFlag: jest.fn((flag) =>
    flag === 'image-builder.new-wizard.enabled' ? true : false
  ),
}));

describe('Blueprints', () => {
  const user = userEvent.setup();
  const blueprintNameWithComposes = 'Dark Chocolate';
  const blueprintNameEmptyComposes = 'Milk Chocolate';

  test('renders blueprints page', async () => {
    renderWithReduxRouter('', {});
    await screen.findByText(blueprintNameWithComposes);
    await screen.findByText(blueprintNameEmptyComposes);
  });
  test('renders blueprint empty state', async () => {
    server.use(
      rest.get(
        `${IMAGE_BUILDER_API}/experimental/blueprints`,
        (req, res, ctx) => {
          return res(ctx.status(200), ctx.json(emptyGetBlueprints));
        }
      )
    );

    renderWithReduxRouter('', {});
    await screen.findByText('No blueprints yet');
  });
  test('renders blueprint composes', async () => {
    renderWithReduxRouter('', {});
    const nameMatcher = (_, element) =>
      element.getAttribute('name') === blueprintNameWithComposes;

    const blueprintRadioBtn = await screen.findByRole('radio', {
      name: nameMatcher,
    });
    await user.click(blueprintRadioBtn);
    const table = await screen.findByTestId('images-table');
    const { findByText } = within(table);
    await findByText(blueprintNameWithComposes);
  });
  test('renders blueprint composes empty state', async () => {
    renderWithReduxRouter('', {});
    const nameMatcher = (_, element) =>
      element.getAttribute('name') === blueprintNameEmptyComposes;

    const blueprintRadioBtn = await screen.findByRole('radio', {
      name: nameMatcher,
    });
    await user.click(blueprintRadioBtn);
    expect(screen.queryByTestId('images-table')).not.toBeInTheDocument();
  });
  test('click build image button', async () => {
    renderWithReduxRouter('', {});
    const nameMatcher = (_, element) =>
      element.getAttribute('name') === blueprintNameWithComposes;

    const blueprintRadioBtn = await screen.findByRole('radio', {
      name: nameMatcher,
    });
    await user.click(blueprintRadioBtn);
    const buildImageBtn = await screen.findByRole('button', {
      name: /Build image/i,
    });
    expect(buildImageBtn).toBeEnabled();
  });

  describe('edit blueprint', () => {
    const editedBlueprintName = 'Dark Chocolate';
    const routes = [
      {
        path: 'insights/image-builder/*',
        element: <LandingPage />,
      },
      {
        path: 'insights/image-builder/imagewizard/:composeId?',
        element: <CreateImageWizard />,
      },
    ];

    test('open blueprint wizard in editing mode', async () => {
      await renderCustomRoutesWithReduxRouter(
        'imagewizard/677b010b-e95e-4694-9813-d11d847f1bfc',
        {},
        routes
      );
      const blueprintDetails = await screen.findByText('Image details');
      await user.click(blueprintDetails);
      await screen.findByText(editedBlueprintName);
    });
    test('redirect to index page when blueprint is invalid', async () => {
      server.use(
        rest.get(
          `${IMAGE_BUILDER_API}/experimental/blueprints/invalid-compose-id`,
          (req, res, ctx) => {
            return res(ctx.status(404));
          }
        )
      );
      await renderCustomRoutesWithReduxRouter(
        'imagewizard/invalid-compose-id',
        {},
        routes
      );
      await screen.findByRole('heading', { name: /Images/i, level: 1 });
    });
  });

  describe('filtering', () => {
    test('filter blueprints', async () => {
      renderWithReduxRouter('', {});

      const searchInput = await screen.findByPlaceholderText(
        'Search by name or description'
      );
      searchInput.focus();
      await user.keyboard('Milk');

      // wait for debounce
      await waitFor(() => {
        expect(screen.getAllByRole('radio')).toHaveLength(1);
      });
    });
  });
});
