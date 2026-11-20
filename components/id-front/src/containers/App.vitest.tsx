import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore } from 'redux';

import renderWithTranslations from '../testHelpers/renderWithTranslations';
import reducers from 'reducers';
import App from 'containers/App';
import { getAuth } from 'actions/auth';
import { getConfig } from 'helpers/configLoader';

// `getAuth` and the config are replaced; the lazily loaded pages are stubs that show the props they receive.
vi.mock('actions/auth', () => ({ getAuth: vi.fn() }));
vi.mock('helpers/configLoader', () => ({ getConfig: vi.fn() }));
vi.mock('pages/Login', () => ({
  default: ({ setId }: { setId: (name: string) => string }) => <p>login page {setId('x')}</p>,
}));
vi.mock('pages/Register', () => ({
  default: ({ values, setId }: { values: { name: string }; setId: (name: string) => string }) => (
    <p>
      register page {values.name} {setId('x')}
    </p>
  ),
}));
vi.mock('pages/TwoFactorAuth', () => ({
  default: ({ values, setId }: { values: { code: string }; setId: (name: string) => string }) => (
    <p>
      two factor page {values.code} {setId('x')}
    </p>
  ),
}));

const mockedGetAuth = vi.mocked(getAuth);
const mockedGetConfig = vi.mocked(getConfig);

const makeStore = () => createStore(reducers);

const renderApp = (store = makeStore(), props: Record<string, unknown> = {}) =>
  renderWithTranslations(
    <Provider store={store}>
      <App {...props} />
    </Provider>,
  );

// The Scrollbar (react-resize-detector) needs a ResizeObserver, which jsdom lacks.
class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('containers/App', () => {
  let locationStub: { href: string };

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    locationStub = { href: 'http://localhost/' };
    vi.stubGlobal('location', locationStub);
    mockedGetAuth.mockResolvedValue(undefined);
    mockedGetConfig.mockReturnValue({ application: {}, BACKEND_URL: '#api' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the block screen until GET /auth resolves, then the login page', async () => {
    let resolve: () => void = () => undefined;
    mockedGetAuth.mockReturnValue(new Promise<undefined>((r) => (resolve = () => r(undefined))));
    const { findByText, queryByText, container } = renderApp();
    expect(queryByText(/login page/)).toBeNull();
    await waitFor(() => expect(container.ownerDocument.querySelector('.MuiDialog-root')).not.toBeNull(), { timeout: 4000 });
    await act(async () => resolve());
    expect(await findByText(/login page/, {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('keeps the block screen when GET /auth rejects (the error is swallowed)', async () => {
    mockedGetAuth.mockRejectedValue(new Error('nope'));
    const { queryByText, container } = renderApp();
    await act(async () => undefined);
    expect(queryByText(/login page/)).toBeNull();
    await waitFor(() => expect(container.ownerDocument.querySelector('.MuiDialog-root')).not.toBeNull(), { timeout: 4000 });
  });

  it('passes the login page a setId that prefixes "login-" to the "app" component id', async () => {
    const { findByText } = renderApp();
    expect(await findByText('login page id-app-login-x')).toBeInTheDocument();
  });

  it('uses a custom setId prop for the page prefixes', async () => {
    const { findByText } = renderApp(makeStore(), { setId: (name: string) => `my-${name}` });
    expect(await findByText('login page my-login-x')).toBeInTheDocument();
  });

  it('shows the register page with the user when the auth state has a provider and a user', async () => {
    const store = makeStore();
    store.dispatch({ type: 'GET_AUTH_SUCCESS', payload: { provider: { id: 1 }, user: { name: 'Ann' } } });
    const { findByText, container } = renderApp(store);
    expect(await findByText('register page Ann id-app-register-x')).toBeInTheDocument();
    // Kept: the JSX has a stray `;` after <RegisterBlock />, which is rendered as text.
    expect(container.textContent).toContain(';');
  });

  it('shows the login page when only a provider (no user) is present', async () => {
    const store = makeStore();
    store.dispatch({ type: 'GET_AUTH_SUCCESS', payload: { provider: { id: 1 } } });
    const { findByText } = renderApp(store);
    expect(await findByText(/login page/)).toBeInTheDocument();
  });

  it('shows the two-factor page when the auth state has info and twoFactorAuthNeeded', async () => {
    const store = makeStore();
    store.dispatch({ type: 'GET_AUTH_SUCCESS', payload: { info: { code: '42' }, twoFactorAuthNeeded: true } });
    const { findByText } = renderApp(store);
    expect(await findByText('two factor page 42 id-app-two-factor-x')).toBeInTheDocument();
  });

  it('prefers the two-factor page over the register page', async () => {
    const store = makeStore();
    store.dispatch({
      type: 'GET_AUTH_SUCCESS',
      payload: { info: { code: '42' }, twoFactorAuthNeeded: true, provider: {}, user: { name: 'Ann' } },
    });
    const { findByText, queryByText } = renderApp(store);
    expect(await findByText(/two factor page/)).toBeInTheDocument();
    expect(queryByText(/register page/)).toBeNull();
  });

  it('shows the login page when twoFactorAuthNeeded is set without info', async () => {
    const store = makeStore();
    store.dispatch({ type: 'GET_AUTH_SUCCESS', payload: { twoFactorAuthNeeded: true } });
    const { findByText } = renderApp(store);
    expect(await findByText(/login page/)).toBeInTheDocument();
  });

  it('shows the database error page instead of anything else when DBError is set', async () => {
    const store = makeStore();
    store.dispatch({ type: 'DB_ERROR' });
    const { findByText, queryByText } = renderApp(store);
    expect(await findByText('No connection to server')).toBeInTheDocument();
    // `App.DB_ERROR_DESCRIPTION` is missing from the English translations (Batch C drift), so the key shows.
    expect(await findByText('App.DB_ERROR_DESCRIPTION')).toBeInTheDocument();
    expect(queryByText(/login page/)).toBeNull();
    expect(mockedGetAuth).toHaveBeenCalled();
  });

  describe('redirects', () => {
    // jsdom cannot navigate, but it does implement hash changes: a BACKEND_URL that starts with '#' makes the
    // computed redirect url observable as `document.location.hash`. WSO2 goes through the stubbed `window.location`.
    it('goes to the WSO2 login after GET /auth when the config has WSO2.redirect', async () => {
      mockedGetConfig.mockReturnValue({ application: {}, BACKEND_URL: '#api', WSO2: { redirect: true } });
      const { queryByText } = renderApp();
      await act(async () => undefined);
      expect(locationStub.href).toBe('/authorise/wso2');
      expect(queryByText(/login page/)).toBeNull();
    });

    it('does not follow a `redirect` that is already in the store at mount, but shows the block screen', async () => {
      const store = makeStore();
      store.dispatch({ type: 'GET_AUTH_SUCCESS', payload: { redirect: '/somewhere' } });
      const { queryByText } = renderApp(store);
      await act(async () => undefined);
      expect(document.location.hash).toBe('');
      expect(queryByText(/login page/)).toBeNull();
    });

    it('builds the backend url from BACKEND_URL when `redirect` arrives later (adds the slash, joins the parts)', async () => {
      const store = makeStore();
      renderApp(store);
      await act(async () => undefined);
      await act(async () => {
        store.dispatch({ type: 'GET_AUTH_SUCCESS', payload: { redirect: '//authorise//go/' } });
      });
      expect(document.location.hash).toBe('#api/authorise/go');
    });

    it('does not add a second slash when BACKEND_URL ends with one', async () => {
      mockedGetConfig.mockReturnValue({ application: {}, BACKEND_URL: '#api/' });
      const store = makeStore();
      renderApp(store);
      await act(async () => undefined);
      await act(async () => {
        store.dispatch({ type: 'GET_AUTH_SUCCESS', payload: { redirect: 'a/b' } });
      });
      expect(document.location.hash).toBe('#api/a/b');
    });
  });
});
