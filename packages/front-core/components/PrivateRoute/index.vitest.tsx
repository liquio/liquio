import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter } from 'react-router-dom';
import PrivateRoute from 'core/components/PrivateRoute';

// Imported statically: re-importing the component tree per test via vi.resetModules() took
// seconds under load and made the tests time out (and leak a late history.replace call into the
// next test) in the full suite.
const mocks = vi.hoisted(() => ({ historyReplace: vi.fn(), useUIFilters: false }));
const { historyReplace } = mocks;

vi.mock('store', () => ({ history: { replace: mocks.historyReplace } }));
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({ useUIFilters: mocks.useUIFilters }) }));

beforeEach(() => {
  mocks.useUIFilters = false;
  historyReplace.mockClear();
});

const renderPrivateRoute = (state: unknown, props: Record<string, unknown>, path = '/target') => {
  return render(
    <Provider store={createStore(() => state)}>
      <MemoryRouter initialEntries={[path]}>
        <PrivateRoute path="/target" {...props} />
      </MemoryRouter>
    </Provider>
  );
};

describe('PrivateRoute', () => {
  it('redirects and shows a preloader when access is denied', () => {
    const Comp = () => <div>secret</div>;
    renderPrivateRoute(
      { auth: { userUnits: [], info: null } },
      { component: Comp, access: { isEnabled: false } }
    );
    expect(historyReplace).toHaveBeenCalledWith('/');
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('renders the target component when access is granted', () => {
    const Comp = () => <div>secret</div>;
    renderPrivateRoute({ auth: { userUnits: [], info: null } }, { component: Comp });
    expect(screen.getByText('secret')).toBeTruthy();
    expect(historyReplace).not.toHaveBeenCalled();
  });

  it('shows a preloader and redirects when a required ui filter is missing', () => {
    mocks.useUIFilters = true;
    const Comp = () => <div>secret</div>;
    renderPrivateRoute(
      { app: { uiFilters: [{ filter: 'other' }] }, auth: { userUnits: [], info: null } },
      { component: Comp, uiFilter: 'needed' }
    );
    expect(historyReplace).toHaveBeenCalledWith('/messages');
    expect(screen.queryByText('secret')).toBeNull();
  });
});
