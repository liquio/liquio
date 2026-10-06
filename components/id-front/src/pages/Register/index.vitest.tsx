import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore } from 'redux';
import type { ComponentType, Ref } from 'react';

import renderWithTranslations from '../../testHelpers/renderWithTranslations';
import reducers from 'reducers';
import RegisterPage from 'pages/Register';
import { signUpConfirmation, getAuth } from 'actions/auth';

vi.mock('actions/auth', () => ({ signUpConfirmation: vi.fn(), getAuth: vi.fn() }));

// The form is a stub that exposes the props the page gives it.
const form = vi.hoisted(() => ({ props: undefined as undefined | { values: Record<string, unknown>; onSubmit: (values: Record<string, unknown>) => Promise<unknown>; setId: (n: string) => string } }));
vi.mock('./components/RegisterForm', () => ({
  default: (props: NonNullable<typeof form.props>) => {
    form.props = props;
    return <p id={props.setId('probe')}>register form</p>;
  },
}));

// Records the props that arrive from `connect`, and gives the tests the page instance (a ref through withStyles).
const page = vi.hoisted(() => ({ props: undefined as undefined | Record<string, unknown>, instance: undefined as undefined | { componentDidMount: () => Promise<void>; handleSubmit: (v: Record<string, unknown>) => Promise<unknown> } }));
vi.mock('react-translate', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-translate')>();
  return {
    ...original,
    translate: (namespace: string) => (Component: ComponentType<never>) => {
      // Other components (the layout) use `translate` too; only the page's own namespace is probed.
      if (namespace !== 'RegisterForm') return original.translate(namespace)(Component as unknown as ComponentType<{ t: never }>);
      const Probe = (props: Record<string, unknown>) => {
        page.props = props;
        const Inner = Component as ComponentType<{ ref: Ref<unknown> } & Record<string, unknown>>;
        return <Inner {...props} ref={(i) => (page.instance = i as typeof page.instance)} />;
      };
      return original.translate(namespace)(Probe as unknown as ComponentType<{ t: never }>);
    },
  };
});

const mockedSignUp = vi.mocked(signUpConfirmation);
const mockedGetAuth = vi.mocked(getAuth);

const user = { first_name: 'Ann', last_name: 'Lee', agreement: true, ipn: '1' };

const renderPage = (props: Record<string, unknown> = {}, store = createStore(reducers)) =>
  renderWithTranslations(
    <Provider store={store}>
      <MemoryRouter>
        <RegisterPage values={{ ...user }} {...props} />
      </MemoryRouter>
    </Provider>,
  );

const start = async (utils: ReturnType<typeof renderPage>) => {
  fireEvent.click(utils.getByRole('button', { name: 'Start' }));
  await waitFor(() => expect(form.props).toBeDefined());
};

describe('pages/Register', () => {
  let location: { href: string; replace: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    form.props = undefined;
    page.props = undefined;
    page.instance = undefined;
    location = { href: 'http://localhost/', replace: vi.fn() };
    vi.stubGlobal('location', location);
    // The page reads this global (see the pinned bug below); most tests define it so the page can work.
    vi.stubGlobal('config', { FORCE_REGISTER: false });
    mockedSignUp.mockReset();
    mockedGetAuth.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('greeting', () => {
    it('shows the greeting with the first name and a Start button', () => {
      const { getByText, getByRole } = renderPage();
      expect(getByText('Welcome, Ann!')).toBeInTheDocument();
      expect(getByText(/To complete the registration/)).toBeInTheDocument();
      expect(getByRole('button', { name: 'Start' })).toBeInTheDocument();
    });

    it('falls back to the company name, then to an empty name', () => {
      expect(renderPage({ values: { companyName: 'ACME' } }).getByText('Welcome, ACME!')).toBeInTheDocument();
    });

    it('greets without a name when there is none', () => {
      expect(renderPage({ values: {} }).getByText('Welcome, !')).toBeInTheDocument();
    });

    it('un-blocks the screen on mount when FORCE_REGISTER is off (no block dialog)', async () => {
      const { queryByRole } = renderPage();
      await act(async () => undefined);
      expect(queryByRole('dialog')).toBeNull();
    });
  });

  describe('registration form', () => {
    it('shows the form and the block screen only until the page has mounted', async () => {
      const utils = renderPage();
      await start(utils);
      expect(utils.getByText('register form')).toBeInTheDocument();
      expect(form.props?.values).toMatchObject({ first_name: 'Ann' });
      expect(utils.container.querySelector('#id-app-register-form-probe, #id-register-form-probe')).not.toBeNull();
    });

    it('passes a prefixed setId to the form', async () => {
      const utils = renderPage({ setId: (name: string) => `x-${name}` });
      await start(utils);
      expect(utils.container.querySelector('#x-register-form-probe')).not.toBeNull();
    });
  });

  describe('submit', () => {
    it('removes `agreement`, posts the values and replaces the location on success', async () => {
      mockedSignUp.mockResolvedValue({ success: true, redirect: '/done' });
      const utils = renderPage();
      await start(utils);
      await act(async () => {
        await form.props?.onSubmit({ ...user });
      });
      expect(mockedSignUp).toHaveBeenCalledWith({ first_name: 'Ann', last_name: 'Lee', ipn: '1' });
      expect(location.replace).toHaveBeenCalledWith('/done');
    });

    it('mutates the object it is given (the store `user`): the `agreement` key is deleted from it', async () => {
      mockedSignUp.mockResolvedValue({ success: true, redirect: '/done' });
      const utils = renderPage();
      await start(utils);
      const values = { ...user };
      await act(async () => {
        await form.props?.onSubmit(values);
      });
      expect('agreement' in values).toBe(false);
    });

    it('shows the server message in a snackbar and closes it with OK', async () => {
      mockedSignUp.mockResolvedValue({ success: false, message: 'Phone is already taken' });
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const utils = renderPage();
      await start(utils);
      await act(async () => {
        await form.props?.onSubmit({ ...user });
      });
      expect(utils.getByText('This phone number is already registered in the system')).toBeInTheDocument();
      expect(log).toHaveBeenCalledWith('Phone is already taken');
      fireEvent.click(utils.getByRole('button', { name: 'OK' }));
      expect(utils.queryByText('This phone number is already registered in the system')).toBeNull();
    });

    it('prefers `message` over `err`, and uses `err` when there is no message', async () => {
      mockedSignUp.mockResolvedValue({ success: false, err: 'Bad Request' });
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const utils = renderPage();
      await start(utils);
      await act(async () => {
        await form.props?.onSubmit({ ...user });
      });
      expect(utils.getByText('Request failed. Please contact support.')).toBeInTheDocument();
    });

    it('with no error and no success, refreshes the auth state and posts again', async () => {
      mockedSignUp.mockResolvedValueOnce({}).mockResolvedValueOnce({ success: true, redirect: '/again' });
      const utils = renderPage();
      await start(utils);
      await act(async () => {
        await form.props?.onSubmit({ ...user });
      });
      expect(mockedGetAuth).toHaveBeenCalledTimes(1);
      expect(mockedSignUp).toHaveBeenCalledTimes(2);
      expect(location.replace).toHaveBeenCalledWith('/again');
    });

    it('with no error and a failing retry, ends with no snackbar and the screen open', async () => {
      mockedSignUp.mockResolvedValue({});
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const utils = renderPage();
      await start(utils);
      await act(async () => {
        await form.props?.onSubmit({ ...user });
      });
      expect(location.replace).not.toHaveBeenCalled();
      expect(utils.queryByRole('button', { name: 'OK' })).toBeNull();
    });

    it('treats a rejected request as a failed post when the api resolves with an Error (no `success`)', async () => {
      mockedSignUp.mockResolvedValue(Object.assign(new Error('x'), {}));
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const utils = renderPage();
      await start(utils);
      await act(async () => {
        await form.props?.onSubmit({ ...user });
      });
      // An Error has a `message`, so it is shown (as a translation key).
      expect(utils.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    });
  });

  describe('state mapping', () => {
    it('PRESERVED BUG: maps `state.authorization`, which does not exist, so `auth` is always undefined', () => {
      const store = createStore(reducers);
      expect(store.getState()).not.toHaveProperty('authorization');
      renderPage({}, store);
      expect(page.props).toHaveProperty('auth', undefined);
      expect(Object.keys(page.props ?? {}).sort()).toEqual(['auth', 'dispatch', 't', 'values']);
    });
  });

  describe('the undeclared global `config`', () => {
    it('PRESERVED BUG (live): without a global `config` the mount throws a ReferenceError', async () => {
      const utils = renderPage();
      await act(async () => undefined);
      expect(utils.getByText('Welcome, Ann!')).toBeInTheDocument();
      vi.unstubAllGlobals();
      expect('config' in globalThis).toBe(false);
      await expect(page.instance?.componentDidMount()).rejects.toThrow(ReferenceError);
      await expect(page.instance?.componentDidMount()).rejects.toThrow('config is not defined');
    });

    it('PRESERVED BUG (live): submitting throws the same ReferenceError, before any request', async () => {
      const utils = renderPage();
      await start(utils);
      vi.unstubAllGlobals();
      await expect(page.instance?.handleSubmit({ ...user })).rejects.toThrow('config is not defined');
      expect(mockedSignUp).not.toHaveBeenCalled();
    });

    it('with FORCE_REGISTER set on the global, shows the preloader and submits at once', async () => {
      vi.stubGlobal('config', { FORCE_REGISTER: true });
      mockedSignUp.mockResolvedValue({ success: true, redirect: '/forced' });
      renderPage();
      await waitFor(() => expect(location.replace).toHaveBeenCalledWith('/forced'));
      expect(mockedSignUp).toHaveBeenCalledWith({ first_name: 'Ann', last_name: 'Lee', ipn: '1' });
    });

    it('with FORCE_REGISTER and a failing post, logs the user out', async () => {
      vi.stubGlobal('config', { FORCE_REGISTER: true });
      mockedSignUp.mockResolvedValue({ success: false, message: 'nope' });
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      renderPage();
      await waitFor(() => expect(location.href).toBe('/logout'));
    });
  });
});
