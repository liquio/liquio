import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';

import renderWithTranslations from '../../../testHelpers/renderWithTranslations';
import CredentialMethod from './CredentialMethod';
import { handleLoginByPassword, handleLoginByLdap, handleChangePassword } from 'actions/auth';
import type { CredentialAdditionalProps } from './types';

vi.mock('actions/auth', () => ({
  handleLoginByPassword: vi.fn(),
  handleLoginByLdap: vi.fn(),
  handleChangePassword: vi.fn(),
}));

const login = vi.mocked(handleLoginByPassword);
const ldap = vi.mocked(handleLoginByLdap);
const change = vi.mocked(handleChangePassword);

const apiError = (status?: number) => Object.assign(new Error('x'), { status });

const renderForm = (additionalProps?: CredentialAdditionalProps | boolean, props: { busy?: boolean; onClose?: () => void } = {}) =>
  renderWithTranslations(<CredentialMethod onClose={props.onClose ?? vi.fn()} busy={props.busy} additionalProps={additionalProps} />);

// The inputs are, in order, email/username, password (or old password, new password, confirmation).
const inputs = (container: HTMLElement) => Array.from(container.querySelectorAll('input'));
const type = (input: HTMLInputElement, value: string) => fireEvent.change(input, { target: { value } });

describe('pages/Login/CredentialMethod', () => {
  let location: { href: string };

  beforeEach(() => {
    location = { href: 'http://localhost/' };
    vi.stubGlobal('location', location);
    login.mockReset();
    ldap.mockReset();
    change.mockReset();
  });

  afterEach(async () => {
    // `StringElement` focuses its error message in a `setTimeout(0)`; let it run before the tree unmounts.
    await new Promise((resolve) => setTimeout(resolve, 5));
    vi.unstubAllGlobals();
  });

  describe('password login', () => {
    it('renders the title, email and password fields and the buttons', () => {
      const { getByRole, container } = renderForm(true);
      expect(getByRole('heading', { name: 'Login and password' })).toBeInTheDocument();
      expect(inputs(container)).toHaveLength(2);
      expect(inputs(container)[1]).toHaveAttribute('type', 'password');
      expect(getByRole('button', { name: 'Change password' })).toBeInTheDocument();
      expect(getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
      expect(getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    });

    it('shows a required-field error for each empty field and sends nothing', () => {
      const { getByRole, getAllByText } = renderForm(true);
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      expect(getAllByText('This field is required')).toHaveLength(2);
      expect(login).not.toHaveBeenCalled();
    });

    it('posts the email and the password as typed (no trimming)', async () => {
      login.mockResolvedValue({});
      const { getByRole, container } = renderForm(true);
      type(inputs(container)[0], ' user@x.co ');
      type(inputs(container)[1], 'p@ss');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      await waitFor(() => expect(login).toHaveBeenCalledWith({ email: ' user@x.co ', password: 'p@ss' }));
      expect(ldap).not.toHaveBeenCalled();
    });

    it('goes to the redirect url on success', async () => {
      login.mockResolvedValue({ redirect: '/next' });
      const { getByRole, container } = renderForm(true);
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'p');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      await waitFor(() => expect(location.href).toBe('/next'));
    });

    it('stays put without a redirect in the response', async () => {
      login.mockResolvedValue({});
      const { getByRole, container } = renderForm(true);
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'p');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      await waitFor(() => expect(login).toHaveBeenCalled());
      expect(location.href).toBe('http://localhost/');
    });

    it('stays put when the api resolves with undefined', async () => {
      login.mockResolvedValue(undefined);
      const { getByRole, container } = renderForm(true);
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'p');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      await waitFor(() => expect(login).toHaveBeenCalled());
      expect(location.href).toBe('http://localhost/');
    });

    it('maps a 401 to the invalid credentials message', async () => {
      login.mockResolvedValue(apiError(401));
      const { getByRole, findByText, container } = renderForm(true);
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'p');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      expect(await findByText('Invalid email or password. Please try again.')).toBeInTheDocument();
    });

    it('maps a 429 to the too-many-attempts message', async () => {
      login.mockResolvedValue(apiError(429));
      const { getByRole, findByText, container } = renderForm(true);
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'p');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      expect(await findByText('Too many login attempts. Please try again later.')).toBeInTheDocument();
    });

    it('maps a 503 to the service unavailable message', async () => {
      login.mockResolvedValue(apiError(503));
      const { getByRole, findByText, container } = renderForm(true);
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'p');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      expect(await findByText('The sign-in service is temporarily unavailable. Please try again later.')).toBeInTheDocument();
    });

    it('maps any other status to the generic login error', async () => {
      login.mockResolvedValue(apiError(500));
      const { getByRole, container, findByText } = renderForm(true);
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'p');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      expect(await findByText('An error occurred during login. Please try again.')).toBeInTheDocument();
    });

    it('treats a thrown error like a failed login (uses error.response.status)', async () => {
      login.mockRejectedValue({ response: { status: 401 } });
      const { getByRole, findByText, container } = renderForm(true);
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'p');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      expect(await findByText('Invalid email or password. Please try again.')).toBeInTheDocument();
    });

    it('toggles the password visibility', () => {
      const { getByRole, container } = renderForm(true);
      fireEvent.click(getByRole('button', { name: 'Show password' }));
      expect(inputs(container)[1]).toHaveAttribute('type', 'text');
      fireEvent.click(getByRole('button', { name: 'Hide password' }));
      expect(inputs(container)[1]).toHaveAttribute('type', 'password');
    });

    it('calls onClose without an argument on Cancel', () => {
      const onClose = vi.fn();
      const { getByRole } = renderForm(true, { onClose });
      fireEvent.click(getByRole('button', { name: /Cancel/ }));
      expect(onClose).toHaveBeenCalledWith();
    });

    it('disables Cancel and Log in while busy', () => {
      const { getByRole } = renderForm(true, { busy: true });
      expect(getByRole('button', { name: /Cancel/ })).toBeDisabled();
      expect(getByRole('button', { name: 'Log in' })).toBeDisabled();
    });

    it('ignores a second submit while the first is still loading', async () => {
      let resolve: (value: unknown) => void = () => undefined;
      login.mockReturnValue(new Promise((r) => (resolve = r)));
      const { getByRole, container } = renderForm(true);
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'p');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      expect(login).toHaveBeenCalledTimes(1);
      resolve({});
    });
  });

  describe('ldap login', () => {
    it('uses the directory title, a username label and no change-password button', () => {
      const { getByRole, queryByRole } = renderForm({ method: 'ldap' });
      expect(getByRole('heading', { name: 'Sign in with directory account' })).toBeInTheDocument();
      expect(queryByRole('button', { name: 'Change password' })).toBeNull();
    });

    it('posts the trimmed username and the password as typed', async () => {
      ldap.mockResolvedValue({});
      const { getByRole, container } = renderForm({ method: 'ldap' });
      type(inputs(container)[0], '  bob  ');
      type(inputs(container)[1], ' pw ');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      await waitFor(() => expect(ldap).toHaveBeenCalledWith({ username: 'bob', password: ' pw ' }));
      expect(login).not.toHaveBeenCalled();
    });

    it('maps a 401 to the directory credentials message', async () => {
      ldap.mockResolvedValue(apiError(401));
      const { getByRole, findByText, container } = renderForm({ method: 'ldap' });
      type(inputs(container)[0], 'bob');
      type(inputs(container)[1], 'pw');
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      expect(await findByText('Invalid login or password. Please try again.')).toBeInTheDocument();
    });
  });

  describe('change password', () => {
    const open = () => {
      const utils = renderForm(true);
      fireEvent.click(utils.getByRole('button', { name: 'Change password' }));
      return utils;
    };

    it('shows the four fields and the back-to-login button', () => {
      const { container, getByRole } = open();
      expect(inputs(container)).toHaveLength(4);
      expect(getByRole('button', { name: 'To authorization' })).toBeInTheDocument();
    });

    it('requires every field, with no request', () => {
      const { getAllByText, getByRole } = open();
      fireEvent.click(getByRole('button', { name: 'Change password' }));
      expect(getAllByText('This field is required')).toHaveLength(4);
      expect(change).not.toHaveBeenCalled();
    });

    it('reports mismatching new passwords and sends nothing', () => {
      const { container, getByRole, getByText } = open();
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'old');
      type(inputs(container)[2], 'n1');
      type(inputs(container)[3], 'n2');
      fireEvent.click(getByRole('button', { name: 'Change password' }));
      expect(getByText('Passwords do not match')).toBeInTheDocument();
      expect(change).not.toHaveBeenCalled();
    });

    it('posts email, old and new password', async () => {
      change.mockResolvedValue({});
      const { container, getByRole } = open();
      type(inputs(container)[0], 'u@x.co');
      type(inputs(container)[1], 'old');
      type(inputs(container)[2], 'n1');
      type(inputs(container)[3], 'n1');
      fireEvent.click(getByRole('button', { name: 'Change password' }));
      await waitFor(() => expect(change).toHaveBeenCalledWith({ email: 'u@x.co', oldPassword: 'old', newPassword: 'n1' }));
    });

    it('goes back to the login form with "To authorization"', () => {
      const { getByRole, container } = open();
      fireEvent.click(getByRole('button', { name: 'To authorization' }));
      expect(inputs(container)).toHaveLength(2);
    });

    it('toggles the old password with its own button', () => {
      const { container } = open();
      const toggles = container.querySelectorAll('.MuiInputAdornment-root button');
      fireEvent.click(toggles[0]);
      expect(inputs(container)[1]).toHaveAttribute('type', 'text');
      fireEvent.click(toggles[0]);
      expect(inputs(container)[1]).toHaveAttribute('type', 'password');
    });

    it('PRESERVED BUG: the new-password toggles store the click event, so the field is shown for good', () => {
      const { container } = open();
      const toggles = container.querySelectorAll('.MuiInputAdornment-root button');
      fireEvent.click(toggles[1]);
      expect(inputs(container)[2]).toHaveAttribute('type', 'text');
      fireEvent.click(toggles[1]);
      expect(inputs(container)[2]).toHaveAttribute('type', 'text');
      fireEvent.click(toggles[2]);
      fireEvent.click(toggles[2]);
      expect(inputs(container)[3]).toHaveAttribute('type', 'text');
    });
  });

  describe('prefilled credentials (additionalProps with email and password)', () => {
    // English has no `LoginAndPassMauritanie` strings (translation drift), so the keys show.
    it('renders only the confirmation text and the Log in button', () => {
      const { getByRole, container } = renderForm({ email: 'a@b.co', password: 'pw' });
      expect(getByRole('heading', { name: 'LoginPage.LoginAndPassMauritanie' })).toBeInTheDocument();
      expect(inputs(container)).toHaveLength(0);
      expect(getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    });

    it('logs in with the prefilled values', async () => {
      login.mockResolvedValue({});
      const { getByRole } = renderForm({ email: 'a@b.co', password: 'pw' });
      fireEvent.click(getByRole('button', { name: 'Log in' }));
      await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'pw' }));
    });
  });

  it('starts with the given email and password in the fields when only one is given', () => {
    const { container } = renderForm({ email: 'a@b.co' });
    expect(inputs(container)[0]).toHaveValue('a@b.co');
    expect(inputs(container)[1]).toHaveValue('');
  });
});
