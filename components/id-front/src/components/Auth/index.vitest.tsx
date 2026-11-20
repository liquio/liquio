import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore } from 'redux';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import reducers from 'reducers';
import Auth from 'components/Auth';

const makeStore = () => createStore(reducers);

const renderAuth = (store: ReturnType<typeof makeStore>, children?: React.ReactNode) =>
  renderWithTranslations(
    <Provider store={store}>
      <Auth>{children}</Auth>
    </Provider>
  );

// As in PageNotFoundScreen, the JSS class prefix is `Translator-` (withStyles wraps translate()).
describe('Auth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders its children when the auth state has no error', () => {
    const { getByText, queryByRole } = renderAuth(makeStore(), <p>app content</p>);
    expect(getByText('app content')).toBeInTheDocument();
    expect(queryByRole('button')).toBeNull();
  });

  it('renders an empty div when there are no children', () => {
    const { container } = renderAuth(makeStore());
    expect(container.innerHTML).toBe('<div></div>');
  });

  it('still renders its children for ERROR_503: the flag is read from the store but never used', () => {
    const store = makeStore();
    store.dispatch({ type: 'ERROR_503', payload: true });
    expect(store.getState().auth.ERROR_503).toBe(true);
    const { getByText } = renderAuth(store, <p>app content</p>);
    expect(getByText('app content')).toBeInTheDocument();
  });

  it('renders the access error page with a switch-user button when DBError is set', () => {
    const store = makeStore();
    store.dispatch({ type: 'DB_ERROR' });
    const { getByText, queryByText, container } = renderAuth(store, <p>app content</p>);
    expect(queryByText('app content')).toBeNull();
    expect(getByText('No access')).toBeInTheDocument();
    expect(getByText('Access to the account is blocked by the system administrator')).toBeInTheDocument();
    expect(getByText('Switch user')).toBeInTheDocument();
    expect(container.firstElementChild?.className).toMatch(/Translator-wrap-\d+/);
    expect(container.querySelector('button')?.className).toMatch(/Translator-button-\d+/);
  });

  it('renders the error page for a failed GET /auth as well', () => {
    const store = makeStore();
    store.dispatch({ type: 'GET_AUTH_FAIL' });
    const { getByText } = renderAuth(store, <p>app content</p>);
    expect(getByText('No access')).toBeInTheDocument();
  });

  it('sends the user to /logout when the switch-user button is clicked', () => {
    vi.stubGlobal('location', { href: 'http://localhost/' });
    const store = makeStore();
    store.dispatch({ type: 'DB_ERROR' });
    const { getByText } = renderAuth(store, <p>app content</p>);
    fireEvent.click(getByText('Switch user'));
    expect(window.location.href).toBe('/logout');
  });

  it('follows the store: a successful GET /auth brings the children back', () => {
    const store = makeStore();
    store.dispatch({ type: 'DB_ERROR' });
    const { getByText, queryByText } = renderAuth(store, <p>app content</p>);
    expect(queryByText('app content')).toBeNull();
    act(() => void store.dispatch({ type: 'GET_AUTH_SUCCESS', payload: {} }));
    expect(getByText('app content')).toBeInTheDocument();
  });
});
