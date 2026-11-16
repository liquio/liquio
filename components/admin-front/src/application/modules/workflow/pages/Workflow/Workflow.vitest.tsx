import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { ThemeProvider } from '@mui/styles';
import { createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Queue } from 'helpers/queueFactory';
import Workflow from './index';

const { addError, created, noopActions } = vi.hoisted(() => ({
  addError: vi.fn(),
  created: [] as unknown[],
  // every action creator is replaced by one returning a plain no-op action; unknown names resolve to the same
  noopActions: (overrides: Record<string, unknown> = {}) =>
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
      const instance = actual.createQueue(options);
      created.push(instance);
      return instance;
    }
  };
});

vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} t={(key: string) => key} />
  )
}));
vi.mock('core/helpers/configLoader', () => ({ getConfig: () => ({ application: { environment: 'test' } }), loadConfig: async () => ({}) }));
vi.mock('jwt-decode', () => ({ default: () => ({ iat: Math.floor(Date.now() / 1000) }) }));
vi.mock('layouts/LeftSidebar', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('components/BpmnSchema', () => ({ BPMNEditor: () => null }));
vi.mock('components/Preloader', () => ({ default: () => <div>preloader</div> }));
vi.mock('./components/WorkflowVersions', () => ({ default: () => null }));
vi.mock('./components/RightSidebar', () => ({
  default: ({ busy, saved, error }: { busy?: boolean; saved?: boolean; error?: Error | null }) => (
    <div data-testid="sidebar" data-busy={String(!!busy)} data-saved={String(!!saved)} data-error={error?.message ?? ''} />
  )
}));

vi.mock('actions/error', () =>
  noopActions({
    addError: (...args: unknown[]) => {
      addError(...args);
      return { type: 'noop' };
    }
  })
);
vi.mock('actions/favorites', () => noopActions());
vi.mock('application/actions/workflow', () => noopActions());
vi.mock('application/actions/numberTemplates', () => noopActions());
vi.mock('application/actions/tasks', () => noopActions());
vi.mock('application/actions/gateways', () => noopActions());
vi.mock('application/actions/events', () => noopActions());

const entities = { actual: {}, origin: {} };
const state = {
  workflow: {
    selection: null,
    actual: { wf1: { id: 'wf1', name: 'Flow', xmlBpmnSchema: '<xml/>' } },
    origin: { wf1: { id: 'wf1', name: 'Flow', xmlBpmnSchema: '<xml/>' } },
    categories: [],
    statuses: [],
    copiedElement: null
  },
  numberTemplates: { list: [] },
  events: entities,
  gateways: entities,
  tasks: entities
};

const mountPage = async () => {
  const theme = createTheme() as ReturnType<typeof createTheme> & Record<string, unknown>;
  theme.navigator = { navItem: {}, sidebarBg: '#000' };
  const store = createStore(() => state);

  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <Workflow match={{ params: { workflowId: 'wf1' } }} location={{}} title="Workflow" />
      </ThemeProvider>
    </Provider>
  );

  const sidebar = await screen.findByTestId('sidebar');
  // queues are created in the page constructor: delQueue first, then the save queue
  const [delQueue, queue] = created.slice(-2) as Queue[];
  return { sidebar, delQueue, queue };
};

describe('Workflow page save queues (real queue@7)', () => {
  beforeEach(() => {
    addError.mockReset();
    created.length = 0;
    localStorage.setItem('token', 'x');
  });

  it('finishes saving when the save queue ends without queued deletions', async () => {
    const { sidebar, queue } = await mountPage();

    queue.push(async () => 'ok');

    await waitFor(() => expect(sidebar).toHaveAttribute('data-saved', 'true'));
    expect(sidebar).toHaveAttribute('data-busy', 'false');
  });

  it('starts delQueue when the save queue ends with queued deletions and toggles busy', async () => {
    const { sidebar, delQueue, queue } = await mountPage();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const deleteJob = vi.fn(async () => {
      await gate;
    });
    delQueue.push(deleteJob as never);

    queue.push(async () => 'ok');

    await waitFor(() => expect(sidebar).toHaveAttribute('data-busy', 'true'));
    expect(deleteJob).toHaveBeenCalledTimes(1);
    expect(sidebar).toHaveAttribute('data-saved', 'false');

    release();
    await waitFor(() => expect(sidebar).toHaveAttribute('data-busy', 'false'));
    expect(sidebar).toHaveAttribute('data-saved', 'true');
  });

  it('surfaces the old-version error when a save job resolves with the expired-history Error', async () => {
    const { sidebar, queue } = await mountPage();

    queue.push(async () => new Error('Header Last-Workflow-History-Id expired.'));

    await waitFor(() => expect(addError).toHaveBeenCalledTimes(1));
    expect((addError.mock.calls[0][0] as Error).message).toBe('WorkflowOldVersionError');
    await waitFor(() => expect(sidebar).toHaveAttribute('data-error', 'Header Last-Workflow-History-Id expired.'));
  });

  it('reports a generic save error for other Error results', async () => {
    const { queue } = await mountPage();

    queue.push(async () => Object.assign(new Error('nope'), { response: { errors: ['e1'] } }));

    await waitFor(() => expect(addError).toHaveBeenCalledTimes(1));
    const error = addError.mock.calls[0][0] as Error & { details?: unknown };
    expect(error.message).toBe('ErrorSavingWorkflow');
    expect(error.details).toEqual(['e1']);
  });

  it('does not report an error for a successful result', async () => {
    const { queue } = await mountPage();
    const done = new Promise<void>((resolve) => queue.addEventListener('end', () => resolve()));

    queue.push(async () => ({ saved: true }));
    await act(async () => {
      await done;
    });

    expect(addError).not.toHaveBeenCalled();
  });

  it('delQueue.start() while already running throws (so the save listener must guard it)', async () => {
    const { delQueue } = await mountPage();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    delQueue.push((async () => gate) as never);

    delQueue.start();
    expect(() => delQueue.start()).toThrow('already started');

    release();
    await act(async () => {
      await gate;
    });
  });

  it('save queue ending while delQueue is running does not restart it and finishes once delQueue drains', async () => {
    const { delQueue, queue } = await mountPage();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const startSpy = vi.spyOn(delQueue, 'start');
    const ran: string[] = [];
    const delEnded = vi.fn();
    delQueue.addEventListener('end', delEnded);

    delQueue.push((async () => {
      await gate;
      ran.push('first');
    }) as never);
    delQueue.start();
    delQueue.push((async () => {
      ran.push('second');
    }) as never);

    queue.push(async () => 'ok');
    const queueEnded = new Promise<void>((resolve) => queue.addEventListener('end', () => resolve()));
    await act(async () => {
      await queueEnded;
    });

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy.mock.results.every(({ type }) => type === 'return')).toBe(true);

    release();
    await waitFor(() => expect(delEnded).toHaveBeenCalledTimes(1));
    expect(ran).toEqual(['first', 'second']);
    expect(addError).not.toHaveBeenCalled();
  });
});
