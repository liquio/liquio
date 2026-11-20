import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import type { RouteProps } from 'react-router-dom';
import type { ReactElement } from 'react';

// The routed pages are replaced by stubs: `containers/App` pulls in the store (which needs a loaded config).
vi.mock('containers/App', () => ({ default: () => <p>app stub</p> }));
vi.mock('containers/Terms', () => ({ default: () => <p>terms stub</p> }));
vi.mock('components/PageNotFoundScreen', () => ({ default: () => <p>not found stub</p> }));

const loadRoutes = async () => (await import('routes')).default;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('themes');
});

// Same as src/App.jsx: `exact` first, then the route's own fields spread onto <Route>.
const renderAt = async (path: string) => {
  const indexRoutes = await loadRoutes();
  const createRoute = (prop: (typeof indexRoutes)[number], key: number): ReactElement => (
    <Route exact={true} {...(prop as unknown as RouteProps)} key={key} />
  );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Switch>{indexRoutes.map(createRoute)}</Switch>
    </MemoryRouter>,
  );
};

describe('routes', () => {
  it('lists /terms first, then the App routes, then the catch-all', async () => {
    const routes = await loadRoutes();
    expect(routes.map((route) => route.path)).toEqual([
      '/terms',
      '/authorise/govid',
      '/id_gov_ua/callback',
      '/totp',
      '/reset-password',
      '/',
      '*',
    ]);
  });

  it('gives /terms the "terms" component id and the App routes the "app" component id', async () => {
    const routes = await loadRoutes();
    expect(routes[0].setId?.('x')).toBe('id-terms-x');
    expect(routes[1].setId?.('x')).toBe('id-app-x');
    expect(routes[5].setId?.('x')).toBe('id-app-x');
  });

  it('gives the catch-all no setId', async () => {
    const routes = await loadRoutes();
    expect(routes[6].setId).toBeUndefined();
  });

  it('leaves out /terms when the theme sets hideTermsLink', async () => {
    const { default: theme } = await import('themes');
    vi.doMock('themes', () => ({ default: { ...theme, hideTermsLink: true } }));
    vi.resetModules();
    const routes = await loadRoutes();
    expect(routes.map((route) => route.path)).not.toContain('/terms');
    expect(routes).toHaveLength(6);
  });

  describe('matching, as src/App.jsx renders them', () => {
    it('renders Terms at /terms', async () => {
      const { getByText } = await renderAt('/terms');
      expect(getByText('terms stub')).toBeInTheDocument();
    });

    it('renders App at /', async () => {
      const { getByText } = await renderAt('/');
      expect(getByText('app stub')).toBeInTheDocument();
    });

    it('renders App at /totp', async () => {
      const { getByText } = await renderAt('/totp');
      expect(getByText('app stub')).toBeInTheDocument();
    });

    it('renders App at /reset-password', async () => {
      const { getByText } = await renderAt('/reset-password');
      expect(getByText('app stub')).toBeInTheDocument();
    });

    it('renders App at /authorise/govid', async () => {
      const { getByText } = await renderAt('/authorise/govid');
      expect(getByText('app stub')).toBeInTheDocument();
    });

    it('renders App at /id_gov_ua/callback', async () => {
      const { getByText } = await renderAt('/id_gov_ua/callback');
      expect(getByText('app stub')).toBeInTheDocument();
    });

    it('renders the not-found screen for an unknown path', async () => {
      const { getByText } = await renderAt('/some/unknown/route');
      expect(getByText('not found stub')).toBeInTheDocument();
    });

    it('renders the not-found screen for a sub-path of an exact route (/terms/extra)', async () => {
      const { getByText } = await renderAt('/terms/extra');
      expect(getByText('not found stub')).toBeInTheDocument();
    });
  });
});
