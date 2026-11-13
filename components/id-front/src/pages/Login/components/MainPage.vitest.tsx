import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';

import renderWithTranslations from '../../../testHelpers/renderWithTranslations';
import MainPage from './MainPage';
import { getAuthProviders } from 'helpers/authProvidersLoader';
import type { AuthProvider } from 'helpers/authProvidersLoader';

vi.mock('helpers/authProvidersLoader', () => ({ getAuthProviders: vi.fn() }));

const mockedProviders = vi.mocked(getAuthProviders);

const renderMainPage = (providers: AuthProvider[], props: Record<string, unknown> = {}) => {
  mockedProviders.mockReturnValue(providers);
  const setLoginByOwnKey = vi.fn();
  const setCredentialMethod = vi.fn();
  const utils = renderWithTranslations(<MainPage setLoginByOwnKey={setLoginByOwnKey} setCredentialMethod={setCredentialMethod} {...props} />);
  return { ...utils, setLoginByOwnKey, setCredentialMethod };
};

describe('pages/Login/MainPage', () => {
  beforeEach(() => {
    mockedProviders.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the info block and no buttons when there are no providers', () => {
    const { getByText, queryAllByRole } = renderMainPage([]);
    expect(getByText('How it works')).toBeInTheDocument();
    expect(getByText('To log in, you need to confirm your identity.')).toBeInTheDocument();
    expect(queryAllByRole('button')).toHaveLength(0);
  });

  it('titles the default provider types with the translated names', () => {
    const { getByRole } = renderMainPage([{ type: 'local', id: 'a' }, { type: 'x509', id: 'b' }, { type: 'ldap', id: 'c' }]);
    expect(getByRole('button', { name: /Login and password/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Personal key/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Sign in with directory account/ })).toBeInTheDocument();
  });

  it('prefers the provider title and falls back to the id for an unknown type', () => {
    const { getByRole } = renderMainPage([{ type: 'local', id: 'a', title: 'Custom title' }, { type: 'other', id: 'my-id' }]);
    expect(getByRole('button', { name: /Custom title/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /my-id/ })).toBeInTheDocument();
  });

  it('shows the description as the button title attribute', () => {
    const { getByRole } = renderMainPage([{ type: 'local', id: 'a', description: 'Use your password' }]);
    expect(getByRole('button', { name: /Login and password/ })).toHaveAttribute('title', 'Use your password');
  });

  it('renders only the icon image (no key icon, no title text) when the provider has an icon', () => {
    const { container, queryByText } = renderMainPage([{ type: 'local', id: 'a', icon: '/icon.png' }]);
    expect(container.querySelector('img')).toHaveAttribute('src', '/icon.png');
    expect(queryByText('Login and password')).toBeNull();
  });

  it('renders the bundled logo for a wso2 provider without an icon', () => {
    const { container } = renderMainPage([{ type: 'wso2', id: 'w' }]);
    expect(container.querySelector('img')?.getAttribute('src')).toMatch(/wso2-logo/);
  });

  it('sets credential method `true` for the local provider', () => {
    const { getByRole, setCredentialMethod, setLoginByOwnKey } = renderMainPage([{ type: 'local', id: 'a' }]);
    fireEvent.click(getByRole('button', { name: /Login and password/ }));
    expect(setCredentialMethod).toHaveBeenCalledWith(true);
    expect(setLoginByOwnKey).not.toHaveBeenCalled();
  });

  it('sets the ldap method for the ldap provider', () => {
    const { getByRole, setCredentialMethod } = renderMainPage([{ type: 'ldap', id: 'c' }]);
    fireEvent.click(getByRole('button'));
    expect(setCredentialMethod).toHaveBeenCalledWith({ method: 'ldap' });
  });

  it('opens the own key login for the x509 provider', () => {
    const { getByRole, setCredentialMethod, setLoginByOwnKey } = renderMainPage([{ type: 'x509', id: 'b' }]);
    fireEvent.click(getByRole('button'));
    expect(setLoginByOwnKey).toHaveBeenCalledWith(true);
    expect(setCredentialMethod).not.toHaveBeenCalled();
  });

  it('navigates to the provider url for any other provider that has one', () => {
    const location = { href: 'http://localhost/' };
    vi.stubGlobal('location', location);
    const { getByRole } = renderMainPage([{ type: 'oauth', id: 'o', url: 'https://idp.example/login' }]);
    fireEvent.click(getByRole('button'));
    expect(location.href).toBe('https://idp.example/login');
  });

  it('does nothing for an unknown provider without a url', () => {
    const location = { href: 'http://localhost/' };
    vi.stubGlobal('location', location);
    const { getByRole, setCredentialMethod, setLoginByOwnKey } = renderMainPage([{ type: 'oauth', id: 'o' }]);
    fireEvent.click(getByRole('button'));
    expect(location.href).toBe('http://localhost/');
    expect(setCredentialMethod).not.toHaveBeenCalled();
    expect(setLoginByOwnKey).not.toHaveBeenCalled();
  });
});
