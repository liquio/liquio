import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskPage from 'modules/tasks/pages/Task';

const { getState } = vi.hoisted(() => ({ getState: vi.fn() }));

vi.mock('store', () => ({
  default: { getState, dispatch: vi.fn(), subscribe: vi.fn() },
  history: { push: vi.fn(), replace: vi.fn(), listen: vi.fn() }
}));
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({ application: {} }), loadConfig: vi.fn() }));
vi.mock('helpers/indexedDB', () => ({ default: {} }));
vi.mock('react-redux', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  connect: () => (component: unknown) => component
}));
vi.mock('react-translate', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  translate: () => (component: unknown) => component
}));


type HandleStore = () => Promise<unknown>;

const TASK_ID = 'task-1';
const TEMPLATE_ID = 10;

const template = {
  id: TEMPLATE_ID,
  jsonSchema: {
    properties: {
      stringInfo: {
        type: 'object',
        properties: {
          radio: { type: 'string' },
          result: { type: 'string', readOnly: true },
          plain: { type: 'string' }
        }
      }
    },
    calcTriggers: [
      {
        source: 'stringInfo.radio',
        target: 'stringInfo.result',
        readOnly: true,
        calculate: '(value) => value'
      }
    ]
  }
};

const makeTask = (data: Record<string, unknown>) => ({
  id: TASK_ID,
  taskTemplateId: TEMPLATE_ID,
  finished: false,
  document: { id: 'doc-1', data }
});

const originTask = { ...makeTask({ stringInfo: { radio: 'a', result: 'a' } }), lastUpdateLogId: 'log-1' };

const createPage = (storeTaskDocument: ReturnType<typeof vi.fn>) => {
  const Page = TaskPage as unknown as new (props: Record<string, unknown>) => { handleStore: HandleStore };
  return new Page({
    t: (key: string) => key,
    taskId: TASK_ID,
    tasks: { [TASK_ID]: originTask },
    origins: { [TASK_ID]: originTask },
    templates: { [TEMPLATE_ID]: template },
    authInfo: {},
    taskScreens: {},
    actions: { storeTaskDocument, loadTask: vi.fn() }
  });
};

const setStoreState = (actual: ReturnType<typeof makeTask>) => {
  getState.mockReturnValue({
    task: { actual: { [TASK_ID]: actual }, origin: { [TASK_ID]: originTask } }
  });
};

describe('TaskPage handleStore', () => {
  beforeEach(() => {
    getState.mockReset();
  });

  it('sends triggerPath when the delta contains a readOnly calcTrigger target', async () => {
    const storeTaskDocument = vi.fn().mockResolvedValue({});
    const page = createPage(storeTaskDocument);
    setStoreState(makeTask({ stringInfo: { radio: 'b', result: 'b' } }));

    await page.handleStore();

    expect(storeTaskDocument).toHaveBeenCalledTimes(1);
    expect(storeTaskDocument.mock.calls[0][0].data).toEqual({
      properties: [
        { path: 'stringInfo.radio', value: 'b', previousValue: 'a' },
        { path: 'stringInfo.result', value: 'b', previousValue: 'a' }
      ],
      triggerPath: ['stringInfo.result']
    });
  });

  it('sends only properties when the delta has no readOnly calcTrigger target', async () => {
    const storeTaskDocument = vi.fn().mockResolvedValue({});
    const page = createPage(storeTaskDocument);
    setStoreState(makeTask({ stringInfo: { radio: 'a', result: 'a', plain: 'text' } }));

    await page.handleStore();

    expect(storeTaskDocument).toHaveBeenCalledTimes(1);
    expect(storeTaskDocument.mock.calls[0][0].data).toEqual({
      properties: [{ path: 'stringInfo.plain', value: 'text', previousValue: undefined }]
    });
  });

  it('passes the task from the store and the last update log id', async () => {
    const storeTaskDocument = vi.fn().mockResolvedValue({});
    const page = createPage(storeTaskDocument);
    const actual = makeTask({ stringInfo: { radio: 'b', result: 'b' } });
    setStoreState(actual);

    await page.handleStore();

    expect(storeTaskDocument.mock.calls[0][0].task).toBe(actual);
    expect(storeTaskDocument.mock.calls[0][0].params).toBe('?last_update_log_id=log-1');
  });

  it('does not store anything when the document did not change', async () => {
    const storeTaskDocument = vi.fn().mockResolvedValue({});
    const page = createPage(storeTaskDocument);
    setStoreState(makeTask({ stringInfo: { radio: 'a', result: 'a' } }));

    await expect(page.handleStore()).resolves.toBeNull();
    expect(storeTaskDocument).not.toHaveBeenCalled();
  });
});
