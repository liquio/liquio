import React from 'react';
import { shallow } from 'enzyme';

import ConfirmDialog from 'components/ConfirmDialog/index.jsx';
import MockTheme from './../__mocks__/MockTheme.js';

it('should render ConfirmDialog with all props provided', () => {
  const props = {
    open: true,
    loading: false,
    title: 'Test Title',
    description: 'Test Description',
    handleClose: jest.fn(),
    handleConfirm: jest.fn(),
    cancelButtonText: 'Cancel',
    acceptButtonText: 'Accept',
    t: (key) => key,
    classes: {
      dialogRoot: 'dialogRoot',
      paperWidthSm: 'paperWidthSm',
      paperScrollBody: 'paperScrollBody',
      closeIcon: 'closeIcon',
      closeIconImg: 'closeIconImg',
      dialogTitleRoot: 'dialogTitleRoot',
      contentRoot: 'contentRoot',
      progressLineWrapper: 'progressLineWrapper',
      dialogActions: 'dialogActions',
      acceptButton: 'acceptButton',
      removePadding: 'removePadding'
    },
    children: <div>Child Content</div>,
    darkTheme: false,
    disabled: false
  };
  const wrapper = shallow(
    <MockTheme>
      <ConfirmDialog {...props} />
    </MockTheme>
  );
  expect(wrapper).toMatchSnapshot();
});

it('should render correctly with minimal props', () => {
  const props = {
    open: true,
    t: (key) => key,
    classes: {
      dialogRoot: 'dialogRoot',
      paperWidthSm: 'paperWidthSm',
      paperScrollBody: 'paperScrollBody',
      closeIcon: 'closeIcon',
      closeIconImg: 'closeIconImg',
      dialogTitleRoot: 'dialogTitleRoot',
      contentRoot: 'contentRoot',
      progressLineWrapper: 'progressLineWrapper',
      dialogActions: 'dialogActions',
      acceptButton: 'acceptButton',
      removePadding: 'removePadding'
    }
  };
  const wrapper = shallow(
    <MockTheme>
      <ConfirmDialog {...props} />
    </MockTheme>
  );
  expect(wrapper).toMatchSnapshot();
});
