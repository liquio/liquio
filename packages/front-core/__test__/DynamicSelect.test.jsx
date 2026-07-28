import React from 'react';
import { render, screen } from '@testing-library/react';

import DynamicSelect from 'components/JsonSchema/elements/DynamicSelect/index.jsx';
import MockTheme from './../__mocks__/MockTheme.js';

it('should render correct options based on dataPath and schemaOptions', () => {
  const props = {
    dataPath: 'some.path',
    rootDocument: {
      data: {
        some: {
          path: [
            { id: 1, label: 'Option 1' },
            { id: 2, label: 'Option 2' }
          ]
        }
      }
    },
    schemaOptions: null,
    isPopup: false,
    documents: {},
    onChange: jest.fn(),
    path: ['dynamic', 'select']
  };

  render(
    <MockTheme>
      <DynamicSelect {...props} />
    </MockTheme>
  );

  React.act(() => {
    screen.getByRole('button').click();
  });

  expect(screen.getByText('Option 1')).toBeInTheDocument();
  expect(screen.getByText('Option 2')).toBeInTheDocument();
});

it('should handle selected values correctly in handleChange', () => {
  const ChangeEvent = require('components/JsonSchema').ChangeEvent;

  const onChangeMock = jest.fn((e) => e);

  const props = {
    dataPath: 'some.path',
    rootDocument: {
      data: {
        some: {
          path: [
            { id: 1, label: 'Option 1' },
            { id: 2, label: 'Option 2' }
          ]
        }
      }
    },
    schemaOptions: null,
    isPopup: false,
    documents: {},
    onChange: onChangeMock,
    path: ['dynamic', 'select'],
    multiple: false,
    idFieldName: 'id'
  };

  render(
    <MockTheme>
      <DynamicSelect {...props} />
    </MockTheme>
  );

  React.act(() => {
    screen.getByRole('button').click();
  });

  const selectElement = screen.getByText('Option 1');

  React.act(() => {
    selectElement.click();
  });

  expect(onChangeMock).toHaveBeenCalledWith(new ChangeEvent({ label: 'Option 1' }, true));
});
