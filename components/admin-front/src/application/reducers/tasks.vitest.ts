import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/tasks';

describe('tasks reducer', () => {
  it('stores a task under both actual and a deep-cloned origin', () => {
    const task = { taskTemplateEntity: { id: 't1' }, documentTemplateEntity: { name: 'a' } };
    const result = reducer(undefined, { type: 'TASKS/REQUEST_TASK_SUCCESS', request: { taskId: 't1' }, payload: task });
    expect(result.actual.t1).toBe(task);
    expect(result.origin.t1).toEqual(task);
    expect(result.origin.t1).not.toBe(task);
  });

  it('mutates state.actual in place on UNDO_TASK_DATA (preserved as-is)', () => {
    const initial = reducer(undefined, {
      type: 'TASKS/REQUEST_TASK_SUCCESS',
      request: { taskId: 't1' },
      payload: { taskTemplateEntity: { id: 't1' }, documentTemplateEntity: { name: 'a' } }
    });
    const result = reducer(initial, { type: 'UNDO_TASK_DATA', payload: { taskId: 't1' } });
    expect(result.actual.t1).toBeUndefined();
    // the original `initial.actual` is mutated too, since only `state` was shallow-copied
    expect(initial.actual.t1).toBeUndefined();
  });
});
