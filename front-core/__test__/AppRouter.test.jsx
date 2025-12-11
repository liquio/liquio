import React from 'react';
import { render } from '@testing-library/react';

import AppRouter from 'components/AppRouter/index.jsx';
import MockStore from './../__mocks__/MockStore.js';

it('should render no routes when no routes are available from plugins and modules', () => {
  const mockHistory = { push: jest.fn(), listen: jest.fn(), location: {} };
  jest.mock('store', () => ({ history: mockHistory }));
  jest.mock('modules', () => []);
  jest.mock('plugins', () => []);

  const { container } = render(
    <MockStore>
      <AppRouter />
    </MockStore>
  );

  expect(container.querySelectorAll('PrivateRoute').length).toBe(0);
});
