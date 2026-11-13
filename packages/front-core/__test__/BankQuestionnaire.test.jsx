import React from 'react';
import { render, waitFor } from '@testing-library/react';

import BankQuestionnaire from 'components/JsonSchema/elements/BankQuestionnaire/index.js';
import MockStore from '../__mocks__/MockStore.js';

it('should initialize and render without crashing', async () => {
  const handleStore = jest.fn();

  const props = {
    template: {
      jsonSchema: {
        properties: {
          step1: {
            properties: {
              question1: {
                type: 'string',
                description: 'Question 1'
              }
            }
          }
        }
      }
    },
    stepName: 'step1',
    actions: { setBusy: jest.fn() },
    name: 'name',
    path: 'path',
    filters: {},
    rootDocument: { data: {} },
    serviceErrorMessage: '',
    pendingMessage: '',
    onChange: jest.fn(),
    taskId: 'taskId',
    handleStore,
    triggerValue: 'triggerValue',
    schema: {},
    errorPath: 'errorPath',
    task: { document: { data: {} } }
  };

  const { container } = render(
    <MockStore>
      <BankQuestionnaire {...props} />
    </MockStore>
  );

  waitFor(() => {
    expect(handleStore).toHaveBeenCalled();
    expect(container).toBeInTheDocument();
  });
});
