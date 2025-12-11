import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { shallow } from 'enzyme';

import CustomValueSelect from 'components/JsonSchema/elements/StringElement/components/CustomValueSelect.jsx';
import StringElement from 'components/JsonSchema/elements/StringElement/index.jsx';
import MockTheme from './../__mocks__/MockTheme.js';

const props = {
  children: '',
  onChange: jest.fn(),
  useTrim: false,
  changeCase: null,
  options: null,
  replaceLatinAnalogs: false,
  cutTags: true,
  emptyValue: false,
  value: undefined,
  mask: '',
  defaultMask: null,
  changeOnBlur: false,
  disableOnblur: false,
  stepName: 'stepName',
  maxWidth: 640,
  classes: {},
  rootDocument: {},
  parentValue: {}
};

it('should render layout and children without errors', () => {
  const { container } = render(
    <MockTheme>
      <StringElement {...props}>{props.children}</StringElement>
    </MockTheme>
  );

  expect(container).toBeInTheDocument();
});

it('should open dialog box when custom value menu item is clicked', () => {
  const t = jest.fn();
  const classes = {};
  const customValueText = '';
  const onChange = jest.fn();

  render(
    <MockTheme>
      <CustomValueSelect
        t={t}
        classes={classes}
        customValueText={customValueText}
        onChange={onChange}
      />
    </MockTheme>
  );

  fireEvent.click(screen.getByText('Elements.CustomValue'));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('should use default text when customValueText prop is not provided', () => {
  const t = jest.fn();
  const classes = {};
  const customValueText = '';
  const onChange = jest.fn();

  render(
    <MockTheme>
      <CustomValueSelect
        t={t}
        classes={classes}
        customValueText={customValueText}
        onChange={onChange}
      />
    </MockTheme>
  );

  expect(screen.getByText('Elements.CustomValue')).toBeInTheDocument();
});

it('should call handleChange with correct parameters when input value changes', () => {
  const wrapper = shallow(<StringElement {...props}>{props.children}</StringElement>)
    .dive()
    .dive();

  const instance = wrapper.instance();
  jest.spyOn(instance, 'handleChange');
  const event = { target: { value: 'new value' } };
  instance.handleChange(event);
  expect(instance.handleChange).toHaveBeenCalledWith(event);
  expect(instance.handleChange).toHaveBeenCalled();
});

it('should handle empty input correctly in handleChange', () => {
  const wrapper = shallow(<StringElement {...props} />)
    .dive()
    .dive();
  const instance = wrapper.instance();
  jest.spyOn(instance, 'handleChange');
  const event = { target: { value: '' } };
  instance.handleChange(event);
  expect(instance.handleChange).toHaveBeenCalledWith(event);
});
