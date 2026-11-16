import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SingleKeyRegister } from './SingleKeyRegister';

const { created, withFallbacks } = vi.hoisted(() => ({
  created: [] as unknown[],
  withFallbacks: (overrides: Record<string, unknown>) =>
    new Proxy(overrides, {
      has: (_target, key) => key !== 'then',
      get: (target, key) => (key === 'then' ? undefined : (target[key as string] ?? (() => ({ type: 'noop' }))))
    })
}));

vi.mock('helpers/queueFactory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('helpers/queueFactory')>();
  return {
    ...actual,
    createQueue: (options?: Parameters<typeof actual.createQueue>[0]) => {
      const queue = actual.createQueue(options);
      created.push(queue);
      return queue;
    }
  };
});
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({ application: { environment: 'test' } }), loadConfig: async () => ({}) }));
vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} t={(key: string) => key} />
  )
}));
vi.mock('components/JsonSchema', async () => ({ ChangeEvent: (await import('components/JsonSchema/ChangeEvent')).default }));
vi.mock('components/Select', () => ({ default: () => null }));
vi.mock('components/JsonSchema/components/ElementContainer', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('components/JsonSchema/components/FieldLabel', () => ({ default: () => null }));
vi.mock('application/actions/task', () => withFallbacks({}));
vi.mock('application/actions/registry', () => withFallbacks({}));

const baseProps = (taskId: string, overrides: Record<string, unknown> = {}) => {
  const records = [{ id: 1, stringified: 'one' }];
  return {
    taskId,
    keyId: 7,
    path: ['reg'],
    stepName: 'step1',
    originDocument: { data: {} },
    rootDocument: { data: {} },
    value: null,
    onChange: vi.fn(),
    onImportCallback: vi.fn(),
    actions: { handleStore: vi.fn(async () => undefined), setBusyRegister: vi.fn() },
    registerActions: {
      loadTask: vi.fn(),
      requestRegisterKeyRecords: vi.fn(async () => records),
      requestRegisterKeyRecordsFilter: vi.fn(async () => records),
      updateTaskDocumentValues: vi.fn()
    },
    ...overrides
  };
};

describe('SingleKeyRegister queue (real queue@7)', () => {
  beforeEach(() => {
    created.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the queued init job and fires the end handler after the queue drains', async () => {
    const props = baseProps('skr-single');
    render(<SingleKeyRegister {...(props as never)} />);

    await waitFor(() => expect(props.registerActions.requestRegisterKeyRecords).toHaveBeenCalledWith(7, expect.anything()));
    await waitFor(() => expect(props.onImportCallback).toHaveBeenCalled());
    await waitFor(() => expect(props.actions.handleStore).toHaveBeenCalled());
    expect(props.actions.setBusyRegister).toHaveBeenLastCalledWith(false);
  });

  it('replaces the end handler when another control on the same task is created', async () => {
    const first = baseProps('skr-shared');
    const second = baseProps('skr-shared');
    render(<SingleKeyRegister {...(first as never)} />);
    render(<SingleKeyRegister {...(second as never)} />);

    await waitFor(() => expect(second.onImportCallback).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(first.onImportCallback).not.toHaveBeenCalled();
  });

  it('removes its end handler on unmount', async () => {
    const props = baseProps('skr-unmount');
    const { unmount } = render(<SingleKeyRegister {...(props as never)} />);
    unmount();

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(props.onImportCallback).not.toHaveBeenCalled();
  });
});
