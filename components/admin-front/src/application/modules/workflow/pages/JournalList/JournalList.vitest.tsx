import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/styles';
import { createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import queueFactory from 'helpers/queueFactory';
import JournalList from './index';

const { checkAsNotError, requestWorkflow, restartProcessFromPoint, load, tableData, dispatch, userInfo, userUnits, importActions } = vi.hoisted(() => ({
  // stable references: the page re-runs effects when these change identity
  dispatch: vi.fn(),
  userInfo: {},
  userUnits: [] as unknown[],
  checkAsNotError: vi.fn(),
  requestWorkflow: vi.fn(),
  restartProcessFromPoint: vi.fn(),
  load: vi.fn(),
  importActions: {
    addMessage: vi.fn(),
    restartWorkflowIds: vi.fn(),
    requestWorkflows: async () => [] as unknown[],
    requestWorkflow: vi.fn(),
    requestWorkflowProcessBrief: vi.fn()
  },
  tableData: {
    data: [
      { id: 1, workflowTemplateId: 10, hasUnresolvedErrors: true },
      { id: 2, workflowTemplateId: 10, hasUnresolvedErrors: true }
    ],
    filters: {},
    loading: false,
    error: null,
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
    <Component {...props} userInfo={userInfo} userUnits={userUnits} importActions={importActions} />
  ),
  useDispatch: () => dispatch
}));
vi.mock('store', () => ({ history: {} }));
vi.mock('hooks/asModulePage', () => ({ default: (Component: unknown) => Component }));
vi.mock('layouts/LeftSidebar', () => ({ default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> }));
vi.mock('helpers/checkAccess', () => ({ default: () => true }));
vi.mock('helpers/urlHashParams', () => ({ default: () => ({}) }));
vi.mock('application/endPoints/journal', () => ({ default: {} }));
vi.mock('modules/workflow/pages/JournalList/variables/dataTableSettings', () => ({
  default: ({ CustomToolbar }: { CustomToolbar: unknown }) => ({ CustomToolbar })
}));
vi.mock('components/Snackbars/Message', () => ({
  default: class {
    constructor(
      public text: string,
      public type: string
    ) {}
  }
}));
vi.mock('components/ConfirmDialog', () => ({
  default: ({
    handleConfirm,
    title,
    children
  }: {
    handleConfirm?: () => void;
    title: string;
    children?: React.ReactNode;
  }) => (
    <div>
      <button onClick={handleConfirm}>{title}</button>
      {children}
    </div>
  )
}));
vi.mock('components/DataTable', () => ({
  default: ({
    actions,
    CustomToolbar
  }: {
    actions: { onRowsSelect: (ids: number[]) => void };
    CustomToolbar: React.ComponentType;
  }) => (
    <div>
      <button onClick={() => actions.onRowsSelect([1, 2])}>select</button>
      <CustomToolbar />
    </div>
  )
}));
vi.mock('services/dataTable/useTable', () => ({ default: () => tableData }));
vi.mock('actions/error', () => ({ addError: () => ({ type: 'noop' }), addMessage: () => ({ type: 'noop' }) }));
vi.mock('actions/workflow', () => ({ requestWorkflows: () => ({ type: 'noop' }), requestWorkflow: (...args: unknown[]) => () => requestWorkflow(...args) }));
vi.mock('actions/workflowProcess', () => ({
  restartWorkflowIds: () => ({ type: 'noop' }),
  restartProcessFromPoint: (...args: unknown[]) => () => restartProcessFromPoint(...args),
  requestWorkflowProcessBrief: () => ({ type: 'noop' }),
  checkAsNotError: (...args: unknown[]) => () => checkAsNotError(...args)
}));

const queue = queueFactory.get('subscribeQueue');

const theme = createTheme();
const mount = () =>
  render(
    <ThemeProvider theme={theme}>
      <JournalList title="journal" location={{ pathname: '/journal' }} />
    </ThemeProvider>
  );

const runCheckAsNotError = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'select' }));
  fireEvent.click(screen.getByRole('button', { name: 'CheckAsNotErrorMassTitle' }));
};

describe('JournalList subscribe queue (real queue@7)', () => {
  beforeEach(() => {
    checkAsNotError.mockReset();
    importActions.addMessage.mockReset();
    load.mockReset();
  });

  it('checks processes one by one, reloads the table last and reports success once', async () => {
    const order: string[] = [];
    checkAsNotError.mockImplementation(async (id: number) => {
      order.push(`check-${id}`);
    });
    load.mockImplementation(() => order.push('load'));
    mount();

    await runCheckAsNotError();

    await waitFor(() => expect(importActions.addMessage).toHaveBeenCalledTimes(1));
    expect(order).toEqual(['check-1', 'check-2', 'load']);
    expect(importActions.addMessage.mock.calls[0][0]).toMatchObject({ text: 'CheckAsNotErrorSuccess', type: 'success' });
  });

  it('replaces the end listener on every run instead of stacking them', async () => {
    const addSpy = vi.spyOn(queue, 'addEventListener');
    const removeSpy = vi.spyOn(queue, 'removeEventListener');
    mount();

    for (let run = 1; run <= 3; run += 1) {
      await runCheckAsNotError();
      await waitFor(() => expect(importActions.addMessage).toHaveBeenCalledTimes(run));
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(importActions.addMessage).toHaveBeenCalledTimes(3);
    expect(addSpy.mock.calls.filter(([name]) => name === 'end')).toHaveLength(3);
    // the 2nd and 3rd run each remove the previous run's listener
    expect(removeSpy.mock.calls.filter(([name]) => name === 'end').length).toBeGreaterThanOrEqual(2);
  });

  it('a failing check does not drop the remaining jobs', async () => {
    checkAsNotError.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    mount();

    await runCheckAsNotError();

    await waitFor(() => expect(checkAsNotError).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(importActions.addMessage).toHaveBeenCalledTimes(1));
  });

  it('restart from point after check-as-not-error does not fire the stale check handler', async () => {
    tableData.filters = { workflowTemplateId: 10 };
    requestWorkflow.mockResolvedValue({ xmlBpmnSchema: '<root><task id="Task_1" name="first"/></root>' });
    restartProcessFromPoint.mockResolvedValue(undefined);
    load.mockReset();
    try {
      mount();

      await runCheckAsNotError();
      await waitFor(() => expect(importActions.addMessage).toHaveBeenCalledTimes(1));
      expect(importActions.addMessage.mock.calls[0][0]).toMatchObject({ text: 'CheckAsNotErrorSuccess' });

      fireEvent.click(screen.getByRole('button', { name: 'RestartProcessTooltip' }));
      await waitFor(() => expect(requestWorkflow).toHaveBeenCalled());
      fireEvent.click(await screen.findByRole('checkbox'));
      fireEvent.click(await screen.findByRole('radio'));
      fireEvent.click(screen.getByRole('button', { name: 'RestartPrompt' }));

      await waitFor(() => expect(importActions.addMessage).toHaveBeenCalledTimes(2));
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(restartProcessFromPoint).toHaveBeenCalledTimes(2);
      expect(importActions.addMessage).toHaveBeenCalledTimes(2);
      expect(importActions.addMessage.mock.calls[1][0]).toMatchObject({ text: 'RestartSuccessSuccess', type: 'success' });
    } finally {
      tableData.filters = {};
    }
  });
});
