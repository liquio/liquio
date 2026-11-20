import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore } from 'redux';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import reducers from 'reducers';
import LoginPage from 'pages/Login';


// The layout is replaced by a probe that keeps the props `LoginPage` gives it.
const layout = vi.hoisted(() => ({ props: undefined as undefined | Record<string, (...args: unknown[]) => unknown> & { setId: (n: string) => string; auth: boolean } }));
vi.mock('./components/DefaultLoginLayout', () => ({
  default: (props: NonNullable<typeof layout.props>) => {
    layout.props = props;
    return <p id={props.setId('probe')}>login layout</p>;
  },
}));


const renderPage = (store = createStore(reducers), props: Record<string, unknown> = {}) =>
  renderWithTranslations(
    <Provider store={store}>
      <LoginPage {...props} />
    </Provider>,
  );

describe('pages/Login', () => {
  beforeEach(() => {
    layout.props = undefined;
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('render', () => {
    it('renders the layout with the page setId, and auth', () => {
      const { getByText, container } = renderPage();
      expect(getByText('login layout')).toBeInTheDocument();
      expect(layout.props?.auth).toBe(true);
      expect(layout.props).not.toHaveProperty('onSignHash');
      expect(layout.props).not.toHaveProperty('getDataToSign');
      expect(layout.props).not.toHaveProperty('onSelectKey');
      expect(container.querySelector('#id-login-probe')).not.toBeNull();
    });

    it('uses a custom setId', () => {
      const { container } = renderPage(createStore(reducers), { setId: (name: string) => `x-${name}` });
      expect(container.querySelector('#x-probe')).not.toBeNull();
    });

    it('does not show the mobile error dialog by default', () => {
      const { queryByRole } = renderPage();
      expect(queryByRole('dialog')).toBeNull();
    });
  });

  describe('mobile auth error dialog', () => {
    it('shows the dialog when `isMobileAuth` is in localStorage', () => {
      localStorage.setItem('isMobileAuth', '1');
      const { getByRole, getByText } = renderPage();
      expect(getByRole('dialog')).toBeInTheDocument();
      expect(getByText('Error')).toBeInTheDocument();
      expect(getByText('An error occurred during authentication, please try logging in again.')).toBeInTheDocument();
    });

    it('closes the dialog and clears the flag with the close button', async () => {
      localStorage.setItem('isMobileAuth', '1');
      const { getByRole, queryByRole } = renderPage();
      fireEvent.click(getByRole('dialog').querySelector('button') as HTMLButtonElement);
      await act(async () => undefined);
      expect(localStorage.getItem('isMobileAuth')).toBeNull();
      expect(queryByRole('dialog')).toBeNull();
    });
  });
});
