import React from 'react';
import { render } from '@testing-library/react';

import BlockScreen from 'components/BlockScreenReforged/index.jsx';
import MockTheme from './../__mocks__/MockTheme.js';

it('should render AccordionComponent when accordion prop is true', () => {
  const { getByTestId } = render(
    <MockTheme>
      <BlockScreen accordion={true} />
    </MockTheme>
  );
  expect(getByTestId('accordion-component')).toBeInTheDocument();
});

it('should render Header and LeftSidebar with DataGridComponent when all props are false or undefined', () => {
  const { getByTestId } = render(
    <MockTheme>
      <BlockScreen />
    </MockTheme>
  );
  expect(getByTestId('header-component')).toBeInTheDocument();
  expect(getByTestId('left-sidebar-component')).toBeInTheDocument();
  expect(getByTestId('data-grid-component')).toBeInTheDocument();
});
