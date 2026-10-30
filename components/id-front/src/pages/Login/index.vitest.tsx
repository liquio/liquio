import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore } from 'redux';
import type { ComponentType } from 'react';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import reducers from 'reducers';
import LoginPage from 'pages/Login';
import { requestSignData, checkSignData } from 'actions/eds';
import { getAuth } from 'actions/auth';
import { getConfig } from 'helpers/configLoader';

vi.mock('actions/eds', () => ({ requestSignData: vi.fn(), checkSignData: vi.fn() }));
vi.mock('actions/auth', () => ({ getAuth: vi.fn() }));
vi.mock('helpers/configLoader', () => ({ getConfig: vi.fn() }));

// The layout is replaced by a probe that keeps the props `LoginPage` gives it.
const layout = vi.hoisted(() => ({ props: undefined as undefined | Record<string, (...args: unknown[]) => unknown> & { setId: (n: string) => string; auth: boolean } }));
vi.mock('./components/DefaultLoginLayout', () => ({
  default: (props: NonNullable<typeof layout.props>) => {
    layout.props = props;
    return <p id={props.setId('probe')}>login layout</p>;
  },
}));

// Records the props that arrive from `connect` (the real `translate` is used otherwise).
const connected = vi.hoisted(() => ({ props: undefined as undefined | Record<string, unknown> }));
vi.mock('react-translate/lib/translate', async (importOriginal) => {
  const original = await importOriginal<{ default: (ns: string) => (c: ComponentType<never>) => ComponentType }>();
  return {
    default: (namespace: string) => (Component: ComponentType<never>) => {
      const Probe = (props: Record<string, unknown>) => {
        connected.props = props;
        const Inner = Component as ComponentType<Record<string, unknown>>;
        return <Inner {...props} />;
      };
      return original.default(namespace)(Probe as unknown as ComponentType<never>);
    },
  };
});

const mockedSignData = vi.mocked(requestSignData);
const mockedCheck = vi.mocked(checkSignData);
const mockedGetAuth = vi.mocked(getAuth);
const mockedConfig = vi.mocked(getConfig);

const renderPage = (store = createStore(reducers), props: Record<string, unknown> = {}) =>
  renderWithTranslations(
    <Provider store={store}>
      <LoginPage {...props} />
    </Provider>,
  );

const signer = (execute: (method: string, ...args: unknown[]) => Promise<unknown>) => ({ execute: vi.fn(execute) });

describe('pages/Login', () => {
  beforeEach(() => {
    layout.props = undefined;
    connected.props = undefined;
    localStorage.clear();
    mockedSignData.mockReset();
    mockedCheck.mockReset();
    mockedGetAuth.mockReset().mockResolvedValue(undefined);
    mockedConfig.mockReset().mockReturnValue({ application: {} });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('render', () => {
    it('renders the layout with the page setId, auth and the three signing callbacks', () => {
      const { getByText, container } = renderPage();
      expect(getByText('login layout')).toBeInTheDocument();
      expect(layout.props?.auth).toBe(true);
      expect(typeof layout.props?.onSignHash).toBe('function');
      expect(typeof layout.props?.getDataToSign).toBe('function');
      expect(typeof layout.props?.onSelectKey).toBe('function');
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

  describe('state mapping', () => {
    it('PRESERVED BUG: maps `state.authorization`, which does not exist, so only dataToSign (plus dispatch and the translator t) arrive', () => {
      const store = createStore(reducers);
      expect(store.getState()).not.toHaveProperty('authorization');
      renderPage(store);
      expect(Object.keys(connected.props ?? {}).sort()).toEqual(['dataToSign', 'dispatch', 't']);
    });

    it('maps dataToSign from the eds slice', () => {
      const store = createStore(reducers);
      store.dispatch({ type: 'REQUEST_SIGN_DATA_SUCCESS', payload: { token: 'tok' } });
      renderPage(store);
      expect(connected.props?.dataToSign).toBe('tok');
    });

    it('would spread an `authorization` slice if the root reducer had one (it never does in the app)', () => {
      const store = createStore((state: unknown, action: never) => ({
        ...(reducers(state as never, action) as object),
        authorization: { token: 'abc' },
      }) as never);
      renderPage(store as never);
      expect(connected.props?.token).toBe('abc');
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

  describe('getDataToSign (desktop)', () => {
    it('requests a token and returns it with an expiry about three minutes ahead', async () => {
      mockedSignData.mockResolvedValue({ token: 'tok' });
      renderPage();
      const before = Date.now();
      const result = (await layout.props?.getDataToSign()) as { data: Array<{ name: string; data: string }>; expireTime: number };
      expect(result.data).toEqual([{ name: 'Cabinet authorization', data: 'tok' }]);
      // Date.parse(String(date)) drops the milliseconds.
      expect(result.expireTime % 1000).toBe(0);
      expect(result.expireTime).toBeGreaterThanOrEqual(before + 3 * 60 * 1000 - 1000);
      expect(result.expireTime).toBeLessThanOrEqual(Date.now() + 3 * 60 * 1000);
    });

    it('ignores a saved token on desktop and does not store the new one', async () => {
      localStorage.setItem('savedToken', 'saved');
      mockedSignData.mockResolvedValue({ token: 'fresh' });
      renderPage();
      const result = (await layout.props?.getDataToSign()) as { data: Array<{ data: string }> };
      expect(result.data[0].data).toBe('fresh');
      expect(localStorage.getItem('savedToken')).toBe('saved');
    });
  });

  describe('onSignHash', () => {
    it('checks the signature with the token from getDataToSign, then refreshes the auth state', async () => {
      mockedSignData.mockResolvedValue({ token: 'tok' });
      mockedCheck.mockResolvedValue({});
      renderPage();
      await layout.props?.getDataToSign();
      await layout.props?.onSignHash([{ signature: 'sig' }]);
      expect(mockedCheck).toHaveBeenCalledWith({ signature: 'sig', token: 'tok' });
      expect(mockedGetAuth).toHaveBeenCalledTimes(1);
    });

    it('throws a translated error (and still refreshes the auth state) when the check fails', async () => {
      mockedSignData.mockResolvedValue({ token: 'tok' });
      mockedCheck.mockResolvedValue(new Error('SomethingWrong'));
      renderPage();
      await layout.props?.getDataToSign();
      await expect(layout.props?.onSignHash([{ signature: 'sig' }])).rejects.toThrow('LoginPage.SomethingWrong');
      expect(mockedGetAuth).toHaveBeenCalledTimes(1);
    });

    it('sends an undefined signature and token when called without arguments before getDataToSign', async () => {
      mockedCheck.mockResolvedValue({});
      renderPage();
      await layout.props?.onSignHash();
      expect(mockedCheck).toHaveBeenCalledWith({ signature: undefined, token: undefined });
    });
  });

  describe('onSelectKey (handleSelectKey)', () => {
    const select = (s: ReturnType<typeof signer>, reset = vi.fn().mockResolvedValue(undefined)) =>
      layout.props?.onSelectKey({}, s, reset) as Promise<void>;

    it('signs a fresh token, checks it, resets the private key and refreshes the auth state', async () => {
      mockedSignData.mockResolvedValue({ token: 'tok' });
      mockedCheck.mockResolvedValue({});
      const s = signer(async () => 'SIGNED');
      const reset = vi.fn().mockResolvedValue(undefined);
      renderPage();
      await select(s, reset);
      expect(s.execute).toHaveBeenCalledWith('SignData', 'tok', true);
      expect(mockedCheck).toHaveBeenCalledWith({ signature: 'SIGNED', token: 'tok' });
      expect(reset).toHaveBeenCalledTimes(1);
      expect(mockedGetAuth).toHaveBeenCalledTimes(1);
    });

    it('retries a failing attempt three times (four attempts in all), then rethrows', async () => {
      mockedSignData.mockRejectedValue(new Error('network'));
      renderPage();
      await expect(select(signer(async () => 'x'))).rejects.toThrow('network');
      expect(mockedSignData).toHaveBeenCalledTimes(4);
    });

    it('succeeds when a retry works', async () => {
      mockedSignData.mockRejectedValueOnce(new Error('once')).mockResolvedValue({ token: 'tok' });
      mockedCheck.mockResolvedValue({});
      renderPage();
      await select(signer(async () => 'S'));
      expect(mockedSignData).toHaveBeenCalledTimes(2);
      expect(mockedCheck).toHaveBeenCalledTimes(1);
    });

    it('does not reset the key when the check fails, and throws the translated error', async () => {
      mockedSignData.mockResolvedValue({ token: 'tok' });
      mockedCheck.mockResolvedValue(new Error('Rejected'));
      const reset = vi.fn();
      renderPage();
      await expect(select(signer(async () => 'S'), reset)).rejects.toThrow('LoginPage.Rejected');
      expect(reset).not.toHaveBeenCalled();
    });

    it('adds the encryption certificate when `useEncodeCert` is on', async () => {
      mockedConfig.mockReturnValue({ application: {}, eds: { useEncodeCert: true } });
      mockedSignData.mockResolvedValue({ token: 'tok' });
      mockedCheck.mockResolvedValue({});
      const s = signer(async (method) => {
        if (method === 'EnumOwnCertificates') return { keyUsage: 'Протоколи розподілу ключів', issuer: 'I', serial: 'S1' };
        if (method === 'GetCertificate') return 'DECODED';
        if (method === 'Base64Encode') return 'B64';
        return 'SIGNED';
      });
      renderPage();
      await select(s);
      expect(mockedCheck).toHaveBeenCalledWith({ signature: 'SIGNED', token: 'tok', encodeCert: 'B64', encodeCertSerial: 'S1' });
      expect(s.execute).toHaveBeenCalledWith('GetCertificate', 'I', 'S1');
    });

    it('walks on to the next certificate until one has the key distribution usage', async () => {
      mockedConfig.mockReturnValue({ application: {}, eds: { useEncodeCert: true } });
      mockedSignData.mockResolvedValue({ token: 'tok' });
      mockedCheck.mockResolvedValue({});
      const s = signer(async (method, ...args) => {
        if (method === 'EnumOwnCertificates') return args[0] === 0 ? { keyUsage: 'other' } : { keyUsage: 'Протоколи розподілу ключів', issuer: 'I', serial: 'S2' };
        if (method === 'GetCertificate') return 'D';
        if (method === 'Base64Encode') return 'B64';
        return 'SIGNED';
      });
      renderPage();
      await select(s);
      expect(s.execute).toHaveBeenCalledWith('EnumOwnCertificates', 0);
      expect(s.execute).toHaveBeenCalledWith('EnumOwnCertificates', 1);
      expect(mockedCheck).toHaveBeenCalledWith(expect.objectContaining({ encodeCertSerial: 'S2' }));
    });

    it('fails when there is no encryption certificate and login without one is not allowed', async () => {
      mockedConfig.mockReturnValue({ application: {}, eds: { useEncodeCert: true } });
      mockedSignData.mockResolvedValue({ token: 'tok' });
      renderPage();
      await expect(select(signer(async (method) => (method === 'EnumOwnCertificates' ? null : 'S')))).rejects.toThrow(
        'Сертифікат шифрування відсутній. Зверніться до вашого АЦСК',
      );
      expect(mockedCheck).not.toHaveBeenCalled();
    });

    it('signs without the encryption certificate when `allowLoginWithoutEncodeCert` is on', async () => {
      mockedConfig.mockReturnValue({ application: {}, eds: { useEncodeCert: true, allowLoginWithoutEncodeCert: true } });
      mockedSignData.mockResolvedValue({ token: 'tok' });
      mockedCheck.mockResolvedValue({});
      renderPage();
      await select(signer(async (method) => (method === 'EnumOwnCertificates' ? null : 'S')));
      expect(mockedCheck).toHaveBeenCalledWith({ signature: 'S', token: 'tok' });
    });
  });
});
