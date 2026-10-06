import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore } from 'redux';
import type { ComponentType } from 'react';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import reducers from 'reducers';
import TwoFactorAuthPage from 'pages/TwoFactorAuth';
import { checkSMSCode, checkTotpCode } from 'actions/auth';

vi.mock('actions/auth', () => ({ checkSMSCode: vi.fn(), checkTotpCode: vi.fn() }));

// Records the props that arrive from `connect` (the layout uses `translate` too, so only this namespace).
const page = vi.hoisted(() => ({ props: undefined as undefined | Record<string, unknown> }));
vi.mock('react-translate', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-translate')>();
  return {
    ...original,
    translate: (namespace: string) => (Component: ComponentType<never>) => {
      if (namespace !== 'TwoFactorAuthPage') return original.translate(namespace)(Component as unknown as ComponentType<{ t: never }>);
      const Probe = (props: Record<string, unknown>) => {
        page.props = props;
        const Inner = Component as ComponentType<Record<string, unknown>>;
        return <Inner {...props} />;
      };
      return original.translate(namespace)(Probe as unknown as ComponentType<{ t: never }>);
    },
  };
});

// The English translations have no `TwoFactorAuthPage` section (translation drift), so supply the texts.
const translations = {
  locale: 'en',
  TwoFactorAuthPage: {
    TITLE: 'SMS title',
    SUBTITLE: 'Code sent to {{phone}}',
    TITLETFA: 'App title',
    SUBTITLETFA: 'Enter the app code',
    ACTIVATION_CODE: 'Code',
    ACTIVATE: 'Activate',
    EMPTY_CODE_ERROR: 'Enter a code',
    ACTIVATION_CODE_INVALID: 'Wrong code',
  },
};

const mockedSms = vi.mocked(checkSMSCode);
const mockedTotp = vi.mocked(checkTotpCode);

const renderPage = (props: Record<string, unknown> = {}, store = createStore(reducers)) =>
  renderWithTranslations(
    <Provider store={store}>
      <MemoryRouter>
        <TwoFactorAuthPage {...props} />
      </MemoryRouter>
    </Provider>,
    translations,
  );

const code = (container: HTMLElement) => container.querySelector('input[name=code]') as HTMLInputElement;

describe('pages/TwoFactorAuth', () => {
  let location: { href: string };

  beforeEach(() => {
    location = { href: 'http://localhost/' };
    vi.stubGlobal('location', location);
    page.props = undefined;
    mockedSms.mockReset();
    mockedTotp.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('render', () => {
    it('shows the app (TOTP) texts for twoFactorType "totp"', () => {
      const { getByText, queryByText } = renderPage({ values: { twoFactorType: 'totp' } });
      expect(getByText('App title')).toBeInTheDocument();
      expect(getByText('Enter the app code')).toBeInTheDocument();
      expect(queryByText('SMS title')).toBeNull();
    });

    it('shows the SMS texts with the phone for any other type', () => {
      const { getByText } = renderPage({ values: { twoFactorType: 'sms', phone: '380501234567' } });
      expect(getByText('SMS title')).toBeInTheDocument();
      expect(getByText('Code sent to 380501234567')).toBeInTheDocument();
    });

    it('treats a missing type as SMS, and renders with no values at all', () => {
      const { getByText } = renderPage();
      expect(getByText('SMS title')).toBeInTheDocument();
    });

    it('renders an empty code field and an Activate button, with the default ids', () => {
      const { container, getByRole } = renderPage({ values: {} });
      expect(code(container)).toHaveValue('');
      expect(getByRole('button', { name: 'Activate' })).toBeInTheDocument();
      expect(container.querySelector('#id-twoFactorAuth-title')).not.toBeNull();
      expect(container.querySelector('#id-twoFactorAuth-code')).not.toBeNull();
    });

    it('uses a custom setId', () => {
      const { container } = renderPage({ values: {}, setId: (name: string) => `x-${name}` });
      expect(container.querySelector('#x-title')).not.toBeNull();
    });
  });

  describe('activation', () => {
    it('requires a code and asks nothing', async () => {
      const { getByRole, findByText } = renderPage({ values: { twoFactorType: 'totp' } });
      fireEvent.click(getByRole('button', { name: 'Activate' }));
      expect(await findByText('Enter a code')).toBeInTheDocument();
      expect(mockedTotp).not.toHaveBeenCalled();
      expect(mockedSms).not.toHaveBeenCalled();
    });

    it('checks a TOTP code (POST authorise/totp action) and continues on success', async () => {
      mockedTotp.mockResolvedValue({ success: true });
      const { getByRole, container } = renderPage({ values: { twoFactorType: 'totp' } });
      fireEvent.change(code(container), { target: { value: '123456' } });
      fireEvent.click(getByRole('button', { name: 'Activate' }));
      await waitFor(() => expect(location.href).toBe('/authorise/continue'));
      expect(mockedTotp).toHaveBeenCalledWith('123456');
      expect(mockedSms).not.toHaveBeenCalled();
    });

    it('checks an SMS code for any other type', async () => {
      mockedSms.mockResolvedValue({ success: true });
      const { getByRole, container } = renderPage({ values: { twoFactorType: 'sms' } });
      fireEvent.change(code(container), { target: { value: '654321' } });
      fireEvent.click(getByRole('button', { name: 'Activate' }));
      await waitFor(() => expect(location.href).toBe('/authorise/continue'));
      expect(mockedSms).toHaveBeenCalledWith('654321');
      expect(mockedTotp).not.toHaveBeenCalled();
    });

    it('shows an error for a rejected code and does not continue', async () => {
      mockedTotp.mockResolvedValue({ success: false });
      const { getByRole, container, findByText } = renderPage({ values: { twoFactorType: 'totp' } });
      fireEvent.change(code(container), { target: { value: '000000' } });
      fireEvent.click(getByRole('button', { name: 'Activate' }));
      expect(await findByText('Wrong code')).toBeInTheDocument();
      expect(location.href).toBe('http://localhost/');
    });

    it('treats an api error (resolved, no `success`) as a rejected code', async () => {
      mockedSms.mockResolvedValue(new Error('network'));
      const { getByRole, container, findByText } = renderPage({ values: { twoFactorType: 'sms' } });
      fireEvent.change(code(container), { target: { value: '1' } });
      fireEvent.click(getByRole('button', { name: 'Activate' }));
      expect(await findByText('Wrong code')).toBeInTheDocument();
    });

    it('clears the error when the code is edited', async () => {
      mockedTotp.mockResolvedValue({ success: false });
      const { getByRole, container, findByText, queryByText } = renderPage({ values: { twoFactorType: 'totp' } });
      fireEvent.change(code(container), { target: { value: '000000' } });
      fireEvent.click(getByRole('button', { name: 'Activate' }));
      await findByText('Wrong code');
      fireEvent.change(code(container), { target: { value: '0' } });
      expect(queryByText('Wrong code')).toBeNull();
    });
  });

  describe('state mapping', () => {
    it('PRESERVED BUG: maps `state.authorization`, which does not exist, so `auth` is always undefined', () => {
      const store = createStore(reducers);
      expect(store.getState()).not.toHaveProperty('authorization');
      renderPage({ values: {} }, store);
      expect(page.props).toHaveProperty('auth', undefined);
      expect(Object.keys(page.props ?? {}).sort()).toEqual(['auth', 'dispatch', 't', 'values']);
    });
  });
});
