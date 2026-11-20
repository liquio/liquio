import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import createRoutes from 'helpers/createRoutes';

// createRoutes imports components/PrivateRoute unconditionally (even for routes that never use
// it), which imports the real `store` singleton; stub it so tests don't need a loaded app config.
vi.mock('store', () => ({ history: { replace: () => undefined } }));

describe('createRoutes', () => {
  it('renders a Redirect for routes marked redirect', () => {
    render(
      <MemoryRouter initialEntries={['/old']}>
        {createRoutes([{ redirect: true, path: '/old', to: '/new' }, { path: '/new', publicRoute: true, component: () => <div>new page</div> }])}
      </MemoryRouter>
    );
    expect(screen.getByText('new page')).toBeTruthy();
  });

  it('renders a public route directly via react-router-dom Route', () => {
    render(
      <MemoryRouter initialEntries={['/public']}>
        {createRoutes([{ path: '/public', publicRoute: true, component: () => <div>public page</div> }])}
      </MemoryRouter>
    );
    expect(screen.getByText('public page')).toBeTruthy();
  });
});
