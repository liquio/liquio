import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import renderWithTranslations from '../../../testHelpers/renderWithTranslations';
import DefaultLoginLayout from './DefaultLoginLayout';

vi.mock('helpers/authProvidersLoader', () => ({
  getAuthProviders: vi.fn(() => [
    { type: 'local', id: 'local' },
    { type: 'x509', id: 'x509' },
    { type: 'ldap', id: 'ldap' },
  ]),
}));
vi.mock('actions/auth', () => ({ handleLoginByPassword: vi.fn(), handleLoginByLdap: vi.fn(), handleChangePassword: vi.fn() }));
vi.mock('components/PKCS7Form', () => ({
  default: ({ onSelectKey }: { onSelectKey: unknown }) => <p>pkcs7 form {String(typeof onSelectKey)}</p>,
}));

const renderLayout = (props: Record<string, unknown> = {}) =>
  renderWithTranslations(
    <MemoryRouter>
      <DefaultLoginLayout {...props} />
    </MemoryRouter>,
  );

describe('pages/Login/DefaultLoginLayout', () => {
  it('starts on the main page with a button per provider', () => {
    const { getByRole, getByText } = renderLayout();
    expect(getByText('How it works')).toBeInTheDocument();
    expect(getByRole('button', { name: /Login and password/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Personal key/ })).toBeInTheDocument();
  });

  it('opens the credential form for the local provider and returns with Back', () => {
    const { getByRole, getByText, queryByText } = renderLayout();
    fireEvent.click(getByRole('button', { name: /Login and password/ }));
    expect(getByRole('heading', { name: 'Login and password' })).toBeInTheDocument();
    expect(queryByText('How it works')).toBeNull();
    fireEvent.click(getByRole('button', { name: /Cancel/ }));
    expect(getByText('How it works')).toBeInTheDocument();
  });

  it('opens the ldap credential form for the ldap provider', () => {
    const { getByRole } = renderLayout();
    fireEvent.click(getByRole('button', { name: /Sign in with directory account/ }));
    expect(getByRole('heading', { name: 'Sign in with directory account' })).toBeInTheDocument();
  });

  it('opens the own key login for the x509 provider and returns with Go back', () => {
    const { getByRole, getByText } = renderLayout();
    fireEvent.click(getByRole('button', { name: /Personal key/ }));
    expect(getByText(/pkcs7 form/)).toBeInTheDocument();
    fireEvent.click(getByRole('button', { name: /Go back/ }));
    expect(getByText('How it works')).toBeInTheDocument();
  });

  it('passes its props down to the steps', () => {
    const { getByRole, getByText } = renderLayout({ onSelectKey: () => null });
    fireEvent.click(getByRole('button', { name: /Personal key/ }));
    expect(getByText('pkcs7 form function')).toBeInTheDocument();
  });

  it('uses the given setId for the layout ids', () => {
    const { container } = renderLayout({ setId: (name: string) => `custom-${name}` });
    expect(container.querySelector('#custom-main-content-wrapper')).not.toBeNull();
  });

  it('renders without ids when no setId is given (the default returns null)', () => {
    const { container } = renderLayout();
    expect(container.querySelector('[id$="main-content-wrapper"]')).toBeNull();
  });
});
