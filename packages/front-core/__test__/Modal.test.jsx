import React from 'react';
import { render, screen, act } from '@testing-library/react';

import Modal from 'components/JsonSchema/elements/Modal';
import MockTheme from './../__mocks__/MockTheme';

const props = {
  disabled: '() => false',
  rootDocument: { data: {} },
  originDocument: { data: {} },
  properties: {},
  classes: {},
  onChange: jest.fn(),
  t: jest.fn(),
  handleClose: jest.fn(),
  stepName: '',
  schema: {},
  actionText: 'Open Modal',
  errors: []
};

it('should open modal when handleClickOpen is called', () => {
  render(
    <MockTheme>
      <Modal {...props} />
    </MockTheme>
  );

  act(() => {
    screen.getByRole('button').click();
  });

  expect(screen.getByText('Elements.CLOSE')).toBeInTheDocument();
});

it('should not open modal if getDisabled returns true', () => {
  render(
    <MockTheme>
      <Modal {...props} disabled={'() => true'} />
    </MockTheme>
  );

  screen.getByRole('button').click();

  expect(screen.queryByText('Elements.CLOSE')).not.toBeInTheDocument();
});
