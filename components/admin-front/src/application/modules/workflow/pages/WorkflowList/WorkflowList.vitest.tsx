import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import queueFactory from 'helpers/queueFactory';
import WorkflowList from './index';

const { subscribeToProcess, unSubscribeToProcess, load, tableData, dispatch, userInfo, userUnits } = vi.hoisted(() => ({
  userInfo: { userId: 'me' },
  userUnits: [] as unknown[],
  // stable references: the page re-runs effects when `data` or `dispatch` change identity
  dispatch: vi.fn(),
  subscribeToProcess: vi.fn(),
  unSubscribeToProcess: vi.fn(),
  load: vi.fn(),
  tableData: {
    data: [
      { id: 1, name: 'one', errorsSubscribers: [] },
      { id: 2, name: 'two', errorsSubscribers: [] }
    ],
    filters: {},
    loading: false,
    actions: {} as Record<string, unknown>
  }
}));
tableData.actions.load = load;

vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} t={(key: string) => key} />
  )
}));
vi.mock('react-redux', () => ({
  connect: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} userInfo={userInfo} userUnits={userUnits} />
  ),
  useDispatch: () => dispatch
}));
vi.mock('hooks/asModulePage', () => ({ default: (Component: unknown) => Component }));
vi.mock('layouts/LeftSidebar', () => ({ default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> }));
vi.mock('helpers/checkAccess', () => ({ default: () => true }));
vi.mock('helpers/urlHashParams', () => ({ default: () => ({}) }));
vi.mock('application/endPoints/workflow', () => ({ default: {} }));
vi.mock('application/endPoints/test_workflow', () => ({ default: {} }));
vi.mock('./variables/dataTableSettings', () => ({ default: () => ({}) }));
vi.mock('./components/WorkflowTableToolbar', () => ({ default: () => null }));
vi.mock('components/ConfirmDialog', () => ({
  default: ({ handleConfirm }: { handleConfirm: () => void }) => <button onClick={handleConfirm}>confirm</button>
}));
vi.mock('components/DataTable', () => ({
  default: ({
    OnSelectActions,
    actions
  }: {
    OnSelectActions: React.ComponentType | null;
    actions: { onRowsSelect: (ids: number[]) => void };
  }) => (
    <div>
      <button onClick={() => actions.onRowsSelect([1, 2])}>select</button>
      {OnSelectActions ? <OnSelectActions /> : null}
    </div>
  )
}));
vi.mock('services/dataTable/useTable', () => ({ default: () => tableData }));
vi.mock('actions/users', () => ({ searchUsers: () => async () => []}));
vi.mock('actions/favorites', () => ({ getFavorites: () => async () => ({}) }));
vi.mock('application/actions/tags', () => ({ getTagList: () => async () => [] }));
vi.mock('actions/workflow', () => ({
  requestWorkflows: () => async () => [],
  subscribeToProcess: (...args: unknown[]) => () => subscribeToProcess(...args),
  unSubscribeToProcess: (...args: unknown[]) => () => unSubscribeToProcess(...args)
}));

const queue = queueFactory.get('subscribeQueue');

const gate = () => {
  let release: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

describe('WorkflowList subscribe queue (real queue@7)', () => {
  beforeEach(() => {
    subscribeToProcess.mockReset();
    unSubscribeToProcess.mockReset();
    load.mockReset();
  });

  it('subscribes every selected process sequentially, reloads the table last and clears loading on end', async () => {
    const first = gate();
    const order: string[] = [];
    subscribeToProcess.mockImplementation(async (id: number) => {
      order.push(`start-${id}`);
      if (id === 1) await first.promise;
      order.push(`done-${id}`);
    });
    load.mockImplementation(() => order.push('load'));
    render(<WorkflowList title="t" location={{ pathname: '/w' }} history={{ push: vi.fn() }} />);

    fireEvent.click(screen.getByRole('button', { name: 'select' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument());
    await waitFor(() => expect(order).toEqual(['start-1']));
    first.release();

    await waitFor(() => expect(order).toEqual(['start-1', 'done-1', 'start-2', 'done-2', 'load']));
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
  });

  it('a failing subscription does not drop the remaining jobs', async () => {
    subscribeToProcess.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    render(<WorkflowList title="t" location={{ pathname: '/w' }} history={{ push: vi.fn() }} />);

    fireEvent.click(screen.getByRole('button', { name: 'select' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

    await waitFor(() => expect(subscribeToProcess).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  });

  it('each subscribe run replaces the previous end listener', async () => {
    const addSpy = vi.spyOn(queue, 'addEventListener');
    const removeSpy = vi.spyOn(queue, 'removeEventListener');
    render(<WorkflowList title="t" location={{ pathname: '/w' }} history={{ push: vi.fn() }} />);

    for (let run = 1; run <= 2; run += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'select' }));
      fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
      await waitFor(() => expect(load).toHaveBeenCalledTimes(run));
      await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    }

    expect(addSpy.mock.calls.filter(([name]) => name === 'end')).toHaveLength(2);
    expect(removeSpy.mock.calls.filter(([name]) => name === 'end').length).toBeGreaterThanOrEqual(1);
  });
});
