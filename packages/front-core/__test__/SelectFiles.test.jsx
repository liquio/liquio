import React from 'react';
import { render } from '@testing-library/react';

import SelectFiles from 'components/JsonSchema/elements/SelectFiles/index.jsx';
import SelectFileArea from 'components/JsonSchema/elements/SelectFiles/components/SelectFileArea.jsx';
import MockTheme from './../__mocks__/MockTheme.js';

it('should render layout without errors', async () => {
  const mockUploadDocumentAttach = jest.fn();
  const mockLoadTaskAction = jest.fn();
  const mockSetBusy = jest.fn();
  const mockHandleStore = jest.fn();
  const mockOnChange = jest.fn();

  const props = {
    taskId: 'task1',
    value: [],
    actions: {
      uploadDocumentAttach: mockUploadDocumentAttach,
      loadTaskAction: mockLoadTaskAction,
      setBusy: mockSetBusy,
      handleStore: mockHandleStore
    },
    onChange: mockOnChange,
    labels: [],
    readOnly: false,
    multiple: false,
    path: ['path', 'to', 'file']
  };

  const result = render(
    <MockTheme>
      <SelectFiles {...props} />
    </MockTheme>
  );

  const input = result.container.querySelector('#path-to-file');

  expect(input).toBeInTheDocument();
});

it('should render correctly with default props', () => {
  const { getByText } = render(
    <MockTheme>
      <SelectFileArea
        t={(key) => key}
        classes={{
          dropZone: 'dropZone',
          dropZoneActive: 'dropZoneActive',
          focusedItem: 'focusedItem',
          uploadButtonContainer: 'uploadButtonContainer',
          link: 'link'
        }}
        name="test"
        onSelect={() => {}}
      />
    </MockTheme>
  );
  expect(getByText('Elements.DropFiles')).toBeInTheDocument();
});
