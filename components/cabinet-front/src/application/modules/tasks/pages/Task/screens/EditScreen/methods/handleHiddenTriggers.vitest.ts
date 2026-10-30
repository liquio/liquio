import { beforeEach, describe, expect, it, vi } from 'vitest';
import handleHiddenTriggers from './handleHiddenTriggers';

const mocks = vi.hoisted(() => ({
  propsToData: vi.fn(),
  getDeltaProperties: vi.fn(),
  handleTriggers: vi.fn()
}));

vi.mock('modules/tasks/pages/Task/helpers/propsToData', () => ({ default: mocks.propsToData }));
vi.mock('helpers/getDeltaProperties', () => ({ default: mocks.getDeltaProperties }));
vi.mock('components/JsonSchema', () => ({ handleTriggers: mocks.handleTriggers }));


describe('handleHiddenTriggers', () => {
  beforeEach(() => {
    mocks.propsToData.mockReset();
    mocks.getDeltaProperties.mockReset();
    mocks.handleTriggers.mockReset();
  });

  it('returns early when there are no delta properties', async () => {
    const setTaskDocumentValues = vi.fn();
    mocks.getDeltaProperties.mockReturnValue([]);
    mocks.propsToData.mockReturnValue({
      task: { document: { data: {} } },
      taskId: 't1',
      origin: { document: { data: {} } },
      template: { jsonSchema: { calcTriggers: [{ source: 'a.b' }] } }
    });

    await handleHiddenTriggers.call(
      { props: { userInfo: {}, stepId: 's1', actions: { setTaskDocumentValues } } },
      ['x']
    );

    expect(setTaskDocumentValues).not.toHaveBeenCalled();
  });

  it('returns early when there are no triggers', async () => {
    const setTaskDocumentValues = vi.fn();
    mocks.getDeltaProperties.mockReturnValue([{ path: 'a.b', value: 1 }]);
    mocks.propsToData.mockReturnValue({
      task: { document: { data: {} } },
      taskId: 't1',
      origin: { document: { data: {} } },
      template: { jsonSchema: { calcTriggers: [] } }
    });

    await handleHiddenTriggers.call(
      { props: { userInfo: {}, stepId: 's1', actions: { setTaskDocumentValues } } },
      ['x']
    );

    expect(setTaskDocumentValues).not.toHaveBeenCalled();
  });

  it('applies triggers and calls setTaskDocumentValues with the new data', async () => {
    const setTaskDocumentValues = vi.fn().mockResolvedValue(undefined);
    mocks.getDeltaProperties.mockReturnValueOnce([{ path: 'a.b', value: 123 }]).mockReturnValueOnce([]);
    mocks.handleTriggers.mockReturnValue({ out: true });

    const task = {
      document: { data: { a: { b: 0 }, s1: { step: true } } },
      meta: {},
      activityLog: []
    };
    const triggers = [{ source: ['a.b'] }];

    mocks.propsToData.mockReturnValue({
      task,
      taskId: 't1',
      origin: { document: { data: { a: { b: 0 } } } },
      template: { jsonSchema: { calcTriggers: triggers } }
    });

    await handleHiddenTriggers.call(
      { props: { userInfo: { id: 1 }, stepId: 's1', actions: { setTaskDocumentValues } } },
      ['x']
    );

    expect(mocks.handleTriggers).toHaveBeenCalledTimes(1);
    expect(mocks.handleTriggers).toHaveBeenCalledWith(
      task.document.data,
      triggers,
      'a.b',
      123,
      task.document.data.s1,
      task.document.data,
      task.document.data.a,
      { id: 1 }
    );
    expect(setTaskDocumentValues).toHaveBeenCalledWith('t1', { out: true });
  });
});
