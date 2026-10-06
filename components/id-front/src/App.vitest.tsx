import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { legacy_createStore as createStore } from 'redux';

import reducers from 'reducers';
import App from './App';
import { getConfig } from 'helpers/configLoader';
import { deleteCookieForTests } from './testHelpers/cookies';

vi.mock('helpers/configLoader', () => ({ getConfig: vi.fn() }));
vi.mock('store', () => ({ default: createStore(reducers) }));
vi.mock('components/Auth', () => ({ default: ({ children }: { children?: React.ReactNode }) => <div data-testid="auth">{children}</div> }));
// The routes are swapped per test. A `Redirect` entry has no `from`, so inside a `Switch` it matches every
// location that no earlier route matched.
const routes = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock('routes', () => ({ default: routes }));
const normalRoutes = () => [
  { path: '/one', component: () => <p>page one</p> },
  { path: '/exact', component: () => <p>exact page</p> },
  { path: '*', component: () => <p>not found</p> },
];

const mockedConfig = vi.mocked(getConfig);

describe('App', () => {
  beforeEach(() => {
    routes.splice(0, routes.length, ...normalRoutes());
    mockedConfig.mockReset().mockReturnValue({ application: {}, APP_NAME: 'liquio', APP_TITLE: 'Liquio', defaultLanguage: 'en' });
    window.history.pushState({}, '', '/one');
    document.title = '';
  });

  afterEach(() => {
    deleteCookieForTests('lang');
  });

  it('renders the matching route inside Auth', () => {
    const { getByText, getByTestId } = render(<App />);
    expect(getByTestId('auth')).toContainElement(getByText('page one'));
  });

  it('falls back to the catch-all route', () => {
    window.history.pushState({}, '', '/nowhere');
    const { getByText } = render(<App />);
    expect(getByText('not found')).toBeInTheDocument();
  });

  it('matches routes with `exact` (a longer path does not match a shorter route)', () => {
    window.history.pushState({}, '', '/exact/more');
    const { getByText } = render(<App />);
    expect(getByText('not found')).toBeInTheDocument();
  });

  it('follows a redirect entry by changing the location (none of the real routes has one)', () => {
    routes.splice(0, routes.length, { path: '/old', redirect: true, to: '/one' }, ...normalRoutes());
    window.history.pushState({}, '', '/old');
    render(<App />);
    expect(window.location.pathname).toBe('/one');
  });

  it('sets the document title from the config', async () => {
    render(<App />);
    await waitFor(() => expect(document.title).toBe('Liquio'));
  });

  it('uses the DIIA title when the language cookie is "eng"', async () => {
    document.cookie = 'lang=eng';
    render(<App />);
    await waitFor(() => expect(document.title).toBe('DIIA - Entry'));
  });

  it('sets the title to "undefined" when the config has no APP_TITLE (kept)', async () => {
    mockedConfig.mockReturnValue({ application: {} });
    render(<App />);
    await waitFor(() => expect(document.title).toBe('undefined'));
  });
});
