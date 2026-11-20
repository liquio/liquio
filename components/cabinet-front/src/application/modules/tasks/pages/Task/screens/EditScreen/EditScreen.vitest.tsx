import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditScreen from './index';

const { withFallbacks, layoutProps, taskActions } = vi.hoisted(() => ({
  layoutProps: { current: null as null | { actions: { addAction: (action: () => unknown) => Promise<void> } } },
  taskActions: {},
  withFallbacks: (overrides: Record<string, unknown>) =>
    new Proxy(overrides, {
      has: (_target, key) => key !== 'then',
      get: (target, key) => (key === 'then' ? undefined : (target[key as string] ?? (() => ({ type: 'noop' }))))
    })
}));

vi.mock('react-translate', () => ({
  translate: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} t={(key: string) => key} />
  )
}));
vi.mock('react-redux', () => ({
  connect: () => (Component: React.ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => (
    <Component {...props} actions={taskActions} />
  )
}));
vi.mock('store', () => ({ history: { replace: vi.fn(), push: vi.fn() } }));
vi.mock('core/helpers/configLoader', () => ({ getConfig: () => ({ application: { environment: 'test' } }), loadConfig: async () => ({}) }));
vi.mock('helpers/waitForAction', () => ({ default: { addAction: vi.fn() } }));
vi.mock('services/api', () => ({}));
vi.mock('components/JsonSchema', () => ({
  ChangeEvent: class {},
  validateDataAsync: async () => [],
  removeHiddenFields: () => ({}),
  handleActionTriggers: async () => undefined
}));
vi.mock('components/Preloader', () => ({ default: () => <div>preloader</div> }));
vi.mock('components/ErrorScreen', () => ({ default: () => <div>error screen</div> }));
vi.mock('components/Altcha', () => ({ default: () => null }));
vi.mock('modules/tasks/pages/Task/helpers/getTemplateSteps', () => ({ default: () => ['step1'] }));
vi.mock('modules/tasks/pages/Task/screens/EditScreen/components/GreetingsPage', () => ({ default: () => null }));
vi.mock('modules/tasks/pages/Task/screens/EditScreen/methods/removeHiddenStepsData', () => ({ default: async () => undefined }));
vi.mock('modules/tasks/pages/Task/screens/EditScreen/methods/triggerInitSignerList', () => ({ default: () => false }));
vi.mock('modules/tasks/pages/Task/screens/EditScreen/methods/handleHiddenTriggers', () => ({ default: async () => undefined }));
vi.mock('modules/tasks/pages/Task/screens/EditScreen/methods/validateUserData', () => ({ default: async () => true }));
vi.mock('modules/tasks/pages/Task/screens/EditScreen/components/EditScreenLayout', () => ({
  default: (props: { processing: boolean; storeEventError: { message?: string }; actions: { addAction: (action: () => unknown) => Promise<void> } }) => {
    layoutProps.current = props;
    return (
      <div>
        <span data-testid="processing">{String(props.processing)}</span>
        <span data-testid="error">{props.storeEventError?.message ?? ''}</span>
      </div>
    );
  }
}));
vi.mock('application/actions/task', () => withFallbacks({}));
vi.mock('application/actions/files', () => withFallbacks({}));
vi.mock('actions/error', () => withFallbacks({}));

const task = { id: 't1', taskTemplateId: 'tpl', documentId: 'd1', meta: {}, document: { id: 'd1', data: {} } };
const tasks = { t1: task };
const origins = { t1: task };
const templates = { tpl: { jsonSchema: { properties: { step1: {} } } } };
const taskSteps = { t1: 0 };
const noop = () => undefined;

const mount = () =>
  render(
    <EditScreen
      taskId="t1"
      stepId="step1"
      tasks={tasks}
      origins={origins}
      templates={templates}
      taskSteps={taskSteps}
      self={{}}
      getRootPath={() => '/tasks/t1'}
      getDefaultStep={() => 'step1'}
      computedMatch={{ params: {} }}
      userUnits={[]}
      setBusy={noop}
      setBusyRegister={noop}
      handleStore={noop}
      pendingRegisters={[]}
      title="task"
    />
  );

describe('EditScreen task queue (real queue@7)', () => {
  beforeEach(() => {
    layoutProps.current = null;
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    Object.assign(taskActions, {
      setTaskStep: vi.fn(),
      setTaskSigners: vi.fn(),
      uploadDocumentAttach: vi.fn(),
      getDocumentWorkflowFiles: vi.fn(),
      deleteDocumentAttach: vi.fn(),
      calculateFields: vi.fn(),
      validateDocument: vi.fn()
    });
  });

  it('toggles processing on queue start/end and runs the action', async () => {
    mount();
    await screen.findByTestId('processing');
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const action = vi.fn(async () => gate);

    const done = layoutProps.current!.actions.addAction(action);

    await waitFor(() => expect(screen.getByTestId('processing')).toHaveTextContent('true'));
    expect(action).toHaveBeenCalledTimes(1);

    release();
    await done;
    await waitFor(() => expect(screen.getByTestId('processing')).toHaveTextContent('false'));
  });

  it('passes the failing job error to the error handler and does not drop later queued jobs', async () => {
    mount();
    await screen.findByTestId('processing');
    const later = vi.fn(async () => undefined);

    const failed = layoutProps.current!.actions.addAction(async () => {
      throw new Error('store failed');
    });
    layoutProps.current!.actions.addAction(later);

    // addAction resolves through a follow-up job, so it only settles when the queue keeps going after the failure
    await failed;
    await waitFor(() => expect(later).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('store failed'));
    await waitFor(() => expect(screen.getByTestId('processing')).toHaveTextContent('false'));
  });
});
