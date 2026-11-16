import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { ThemeProvider } from '@mui/styles';
import { createTheme } from '@mui/material/styles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentWidget from './PaymentWidget';

const { created, getPaymentStatus, withFallbacks } = vi.hoisted(() => ({
  created: [] as Array<{ queue: unknown; options: unknown }>,
  getPaymentStatus: vi.fn(),
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
vi.mock('helpers/configLoader', () => ({
  getConfig: () => ({ application: { environment: 'test' }, paymentCheckDelay: 1 }),
  loadConfig: async () => ({})
}));
vi.mock('helpers/uploadScript', () => ({ default: async () => undefined }));
vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} t={(key: string) => key} />
  )
}));
vi.mock('components/JsonSchema', () => ({ SchemaForm: () => null, validateData: () => [] }));
vi.mock('components/JsonSchema/components/ElementContainer', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('application/actions/task', () =>
  withFallbacks({
    getPaymentInfo: () => () => Promise.resolve({}),
    getPaymentStatus: (...args: unknown[]) => () => getPaymentStatus(...args),
    loadTask: () => () => Promise.resolve({}),
    validateAppleSession: () => () => Promise.resolve({})
  })
);
vi.mock('actions/error', () => withFallbacks({ addMessage: () => ({ type: 'noop' }) }));

const mount = () => {
  const store = createStore(() => ({ errors: { list: [] } }), applyMiddleware(thunk));

  return render(
    <Provider store={store}>
      <ThemeProvider theme={createTheme()}>
        <PaymentWidget
          path={['payment']}
          stepName="step1"
          taskId="task1"
          rootDocument={{ id: 'doc1', data: {} }}
          recipients={{ amount: '10' }}
          allowMethods={['card']}
          schema={{}}
          errors={[]}
          steps={['step1']}
          activeStep={0}
          template={{ jsonSchema: {} }}
          actions={{ validateStep: vi.fn(), validateDocument: vi.fn() }}
          onChange={vi.fn()}
          paymentControlPath="payment"
        />
      </ThemeProvider>
    </Provider>
  );
};

describe('PaymentWidget queues (real queue@7)', () => {
  const quickInit = vi.fn();

  beforeEach(() => {
    created.length = 0;
    getPaymentStatus.mockReset();
    quickInit.mockReset();
    quickInit.mockReturnValue({ open: vi.fn(), onReady: () => new Promise(() => undefined) });
    vi.stubGlobal('UGBWidget', { quick_init: quickInit });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('constructs two sequential autostart queues', () => {
    mount();

    expect(created.map(({ options }) => options)).toEqual([
      { autostart: true, concurrency: 1 },
      { autostart: true, concurrency: 1 }
    ]);
  });

  it('runs the status polling jobs and then the widget init job in order', async () => {
    getPaymentStatus.mockResolvedValue({
      data: { step1: { payment: { calculated: { extraData: {} }, processed: [{ status: { isSuccess: true } }] } } }
    });
    mount();

    await waitFor(() => expect(quickInit).toHaveBeenCalledTimes(1));

    expect(quickInit.mock.calls[0][0]).toMatchObject({ amount: 10, selector: 'payment' });
    // the 120 polling jobs short-circuit on success and are drained before the widget job runs
    expect(getPaymentStatus).toHaveBeenCalledTimes(1);
  });

  it('ends the queue after the widget init job completes', async () => {
    getPaymentStatus.mockResolvedValue({
      data: { step1: { payment: { calculated: { extraData: {} }, processed: [{ status: { isSuccess: true } }] } } }
    });
    mount();
    const { queue } = created[0] as { queue: { addEventListener: (name: string, cb: () => void) => void } };
    const ended = vi.fn();
    queue.addEventListener('end', ended);

    await waitFor(() => expect(quickInit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(ended).toHaveBeenCalledTimes(1));
  });
});
