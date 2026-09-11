import React from 'react';
import { waitFor } from '@testing-library/react';
import { shallow } from 'enzyme';

import CheckboxGroup from 'components/JsonSchema/elements/CheckboxGroup/index.jsx';
import MockTheme from './../__mocks__/MockTheme.js';
import MockStore from './../__mocks__/MockStore.js';

// CheckboxGroup initializes with default values if value is null
it('should initialize with default values when value is null', () => {
  const onChangeMock = jest.fn();
  const props = {
    value: null,
    items: [],
    onChange: onChangeMock,
    required: false,
    defaultValue: ['default'],
    deleteDisabled: false
  };

  shallow(
    <MockTheme>
      <MockStore>
        <CheckboxGroup {...props} />
      </MockStore>
    </MockTheme>
  );

  waitFor(() => {
    expect(onChangeMock).toHaveBeenCalledWith(['default']);
  });
});

it('should handle null or undefined props gracefully', () => {
  const onChangeMock = jest.fn();
  const props = {
    value: undefined,
    items: [],
    onChange: onChangeMock,
    required: false,
    defaultValue: undefined,
    deleteDisabled: false
  };

  const wrapper = shallow(
    <MockTheme>
      <MockStore>
        <CheckboxGroup {...props} />
      </MockStore>
    </MockTheme>
  );
  expect(wrapper.exists()).toBe(true);
});

it('should call onChange with an empty array when required and value is not an array', () => {
  const mockOnChange = jest.fn();
  const mockProps = {
    value: 'not an array',
    required: true,
    onChange: mockOnChange
  };

  const checkboxGroup = new CheckboxGroup(mockProps);
  checkboxGroup.componentDidMount();
  expect(mockOnChange).toHaveBeenCalledWith([]);
});

it('should filter out disabled items from value array on mount', () => {
  const mockOnChange = jest.fn();

  const mockProps = {
    value: [1, 2],
    items: [
      { id: 1, isDisabled: '() => true' },
      { id: 2, isDisabled: '() => false' }
    ],
    onChange: mockOnChange,
    defaultValue: null,
    deleteDisabled: true,
    steps: [],
    rootDocument: {
      data: {}
    }
  };

  const checkboxGroup = new CheckboxGroup(mockProps);

  checkboxGroup.componentDidMount();

  expect(mockOnChange).toHaveBeenCalledWith([2]);
});

it('should filter out disabled items from value array on update', () => {
  const mockOnChange = jest.fn();

  const mockProps = {
    value: [1, 2],
    items: [
      { id: 1, isDisabled: '() => true' },
      { id: 2, isDisabled: '() => false' }
    ],
    onChange: mockOnChange,
    deleteDisabled: true,
    steps: [],
    rootDocument: {
      data: {}
    }
  };

  const checkboxGroup = new CheckboxGroup(mockProps);

  checkboxGroup.componentDidUpdate();

  expect(mockOnChange).toHaveBeenCalledWith([2]);
});
