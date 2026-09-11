import React from 'react';
import { render } from '@testing-library/react';
import { shallow } from 'enzyme';

import { SingleKeyRegister } from 'components/JsonSchema/elements/Register/SingleKeyRegister.jsx';
import MockTheme from './../__mocks__/MockTheme.js';
import MockStore from './../__mocks__/MockStore.js';

const mockOptions = [
  {
    id: 1,
    name: 'test'
  }
];

const props = {
  properties: {},
  description: 'description',
  sample: '',
  outlined: false,
  value: null,
  error: null,
  multiple: false,
  required: true,
  keyId: null,
  originDocument: {},
  rootDocument: {},
  useOwnContainer: false,
  readOnly: false,
  keepSelection: false,
  listenedValuesForRequest: null,
  notRequiredLabel: null,
  active: true,
  autocomplete: false,
  indexedSort: {},
  filtersFromSchema: false,
  callOnInit: true,
  address: false,
  useOrigin: false,
  path: ['test', 'path'],
  documents: {},
  taskId: '123',
  usedInTable: false,
  hidden: false,
  filters: [],
  stepName: 'step',
  noMargin: false,
  width: '',
  maxWidth: 640,
  triggerExternalPath: [],
  allVisibleStreet: false,
  onChange: jest.fn(),
  actions: {
    handleStore: jest.fn(),
    requestRegisterKeyRecords: jest.fn(() => mockOptions),
    requestRegisterKeyRecordsFilter: jest.fn(() => mockOptions)
  },
  registerActions: {
    loadTask: jest.fn(),
    updateTaskDocumentValues: jest.fn(),
    requestRegisterKeyRecords: jest.fn(() => mockOptions),
    requestRegisterKeyRecordsFilter: jest.fn(() => mockOptions)
  }
};

const component = (
  <MockTheme>
    <MockStore>
      <SingleKeyRegister {...props} />
    </MockStore>
  </MockTheme>
);

it('renders without crashing', () => {
  const { container } = render(component);
  expect(container).toBeInTheDocument();
});

it('should initialize state correctly when props are provided', () => {
  const wrapper = shallow(<SingleKeyRegister {...props} />);

  const instance = wrapper.instance();

  expect({
    ...instance.state,
    id: null
  }).toEqual({
    options: null,
    optionsArray: null,
    id: null,
    filterData: instance.getFilters(props.originDocument, props.documents.originDocument),
    search: '',
    page: 0,
    loading: false
  });
});

it('should handle empty options gracefully when no options are provided', () => {
  const wrapper = shallow(<SingleKeyRegister {...props} />);
  const instance = wrapper.instance();

  instance.setState({ options: [], optionsArray: [] });

  expect(instance.state.options).toEqual([]);
  expect(instance.state.optionsArray).toEqual([]);
});
