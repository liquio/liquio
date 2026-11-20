import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { ThemeProvider } from '@mui/styles';
import { createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContactConfirmation from './ContactConfirmation';

const { created, verifyEmailCode, withFallbacks } = vi.hoisted(() => ({
  created: [] as Array<{ queue: unknown; options: unknown }>,
  verifyEmailCode: vi.fn(),
  // the reducers read many constants from the same module; any name not overridden resolves to a placeholder
  withFallbacks: (overrides: Record<string, unknown>) =>
    new Proxy(overrides, {
      has: (_target, key) => key !== 'then',
      get: (target, key) => (key === 'then' ? undefined : (target[key as string] ?? String(key)))
    })
}));

vi.mock('helpers/queueFactory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('helpers/queueFactory')>();
  return {
    ...actual,
    createQueue: (options?: Parameters<typeof actual.createQueue>[0]) => {
      const queue = actual.createQueue(options);
      created.push({ queue, options });
      return queue;
    }
  };
});
vi.mock('components/JsonSchema', async () => ({ ChangeEvent: (await import('components/JsonSchema/ChangeEvent')).default }));
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({ application: { environment: 'test' } }), loadConfig: async () => ({}) }));
vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} t={(key: string) => key} />
  )
}));
vi.mock('actions/auth', () =>
  withFallbacks({
    sendSMSCode: () => () => Promise.resolve({}),
    verifySMSCode: () => () => Promise.resolve({ isConfirmed: true }),
    checkPhoneExists: () => () => Promise.resolve({ isExist: false }),
    sendEmailCode: () => () => Promise.resolve({}),
    verifyEmailCode: (...args: unknown[]) => () => verifyEmailCode(...args),
    checkEmail: () => () => Promise.resolve({ isExist: false }),
    onlyVerifyEmailCode: () => () => Promise.resolve({ isAccepted: true })
  })
);

const mount = (onChange: ReturnType<typeof vi.fn>) => {
  const theme = createTheme();
  const store = createStore(() => ({ auth: { info: { email: 'other@example.com', valid: {} } } }), applyMiddleware(thunk));

  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <ContactConfirmation
          value={{ contact: 'user@example.com' }}
          contact={{ source: 'email', type: 'email' }}
          rootDocument={{ data: { email: 'user@example.com' } }}
          path={['confirm']}
          errors={[]}
          actions={{ clearErrors: vi.fn() }}
          onChange={onChange}
        />
      </ThemeProvider>
    </Provider>
  );
};

describe('ContactConfirmation queue (real queue@7)', () => {
  beforeEach(() => {
    created.length = 0;
    verifyEmailCode.mockReset();
  });

  it('constructs one sequential autostart queue', async () => {
    mount(vi.fn());
    await screen.findByRole('textbox');

    expect(created).toHaveLength(1);
    expect(created[0].options).toEqual({ autostart: true, concurrency: 1 });
  });

  it('runs the queued verification job when a full code is typed and reports the confirmation', async () => {
    verifyEmailCode.mockResolvedValue({ isAccepted: true });
    const onChange = vi.fn();
    mount(onChange);

    fireEvent.change(await screen.findByRole('textbox'), { target: { value: '123456' } });

    await waitFor(() => expect(verifyEmailCode).toHaveBeenCalledWith('user@example.com', '123456'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('confirmed', expect.objectContaining({ data: true })));
  });

  it('keeps the queue usable after a failing verification job', async () => {
    verifyEmailCode.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ isAccepted: true });
    const onChange = vi.fn();
    mount(onChange);
    const input = await screen.findByRole('textbox');

    fireEvent.change(input, { target: { value: '111111' } });
    await waitFor(() => expect(verifyEmailCode).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: '222222' } });

    await waitFor(() => expect(verifyEmailCode).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('confirmed', expect.anything()));
  });
});
