import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter } from 'react-router-dom';

const historyReplace = vi.fn();

vi.mock('store', () => ({ history: { replace: historyReplace } }));

afterEach(() => {
  vi.doUnmock('helpers/configLoader');
  vi.resetModules();
  historyReplace.mockClear();
});

const renderPrivateRoute = async (state: unknown, props: Record<string, unknown>, path = '/target') => {
  const { default: PrivateRoute } = await import('core/components/PrivateRoute');
  return render(
    <Provider store={createStore(() => state)}>
      <MemoryRouter initialEntries={[path]}>
        <PrivateRoute path="/target" {...props} />
      </MemoryRouter>
    </Provider>
  );
};

describe('PrivateRoute', () => {
  it('redirects and shows a preloader when access is denied', async () => {
    vi.doMock('helpers/configLoader', () => ({ getConfig: () => ({ useUIFilters: false }) }));
    const Comp = () => <div>secret</div>;
    await renderPrivateRoute(
      { auth: { userUnits: [], info: null } },
      { component: Comp, access: { isEnabled: false } }
    );
    expect(historyReplace).toHaveBeenCalledWith('/');
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('renders the target component when access is granted', async () => {
    vi.doMock('helpers/configLoader', () => ({ getConfig: () => ({ useUIFilters: false }) }));
    const Comp = () => <div>secret</div>;
    await renderPrivateRoute({ auth: { userUnits: [], info: null } }, { component: Comp });
    expect(screen.getByText('secret')).toBeTruthy();
    expect(historyReplace).not.toHaveBeenCalled();
  });

  it('shows a preloader and redirects when a required ui filter is missing', async () => {
    vi.doMock('helpers/configLoader', () => ({ getConfig: () => ({ useUIFilters: true }) }));
    const Comp = () => <div>secret</div>;
    await renderPrivateRoute(
      { app: { uiFilters: [{ filter: 'other' }] }, auth: { userUnits: [], info: null } },
      { component: Comp, uiFilter: 'needed' }
    );
    expect(historyReplace).toHaveBeenCalledWith('/messages');
    expect(screen.queryByText('secret')).toBeNull();
  });
});
