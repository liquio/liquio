import { describe, expect, it, vi } from 'vitest';
import reducer from 'application/reducers/task';

vi.mock('helpers/configLoader', () => ({ getConfig: () => ({}) }));
vi.mock('store', () => ({ default: { getState: () => ({}), dispatch: () => undefined, subscribe: () => undefined } }));

describe('task reducer', () => {
  it('stores a loaded task under both actual and a deep-cloned origin', () => {
    const task = { id: 't1', document: { data: { foo: 'a' } } };
    const result = reducer(undefined, { type: 'LOAD_TASK_SUCCESS', payload: task });
    expect(result.actual.t1).toBe(task);
    expect(result.origin.t1).toEqual(task);
    expect(result.origin.t1).not.toBe(task);
  });

  it('merges performer info onto the existing actual task on assign', () => {
    const initial = reducer(undefined, {
      type: 'LOAD_TASK_SUCCESS',
      payload: { id: 't1', document: { data: {} } }
    });
    const result = reducer(initial, {
      type: 'UPDATE_TASK_ASSIGN_SUCCESS',
      payload: { id: 't1', performerUsers: [1], performerUserNames: ['a'] }
    });
    expect(result.actual.t1).toMatchObject({ performerUsers: [1], performerUserNames: ['a'] });
  });

  it('updates document data at a path with no triggers', () => {
    const initial = reducer(undefined, {
      type: 'LOAD_TASK_SUCCESS',
      payload: { id: 't1', document: { data: { foo: 'a' } } }
    });
    const result = reducer(initial, {
      type: 'UPDATE_TASK_DOCUMENT_VALUES',
      payload: {
        taskId: 't1',
        path: ['foo'],
        changes: 'b',
        triggers: [],
        schema: { allowNull: true },
        info: {},
        updateOrigin: false
      }
    });
    expect(result.actual.t1.document!.data.foo).toBe('b');
  });

  it('mutates origin.document.data with a stray empty object at path[0] regardless of updateOrigin (preserved as-is)', () => {
    const initial = reducer(undefined, {
      type: 'LOAD_TASK_SUCCESS',
      payload: { id: 't1', document: { data: {} } }
    });
    const result = reducer(initial, {
      type: 'UPDATE_TASK_DOCUMENT_VALUES',
      payload: {
        taskId: 't1',
        path: ['newField'],
        changes: 'x',
        triggers: [],
        schema: { allowNull: true },
        info: {},
        updateOrigin: false
      }
    });
    // the actual value was correctly set to 'x'...
    expect(result.actual.t1.document!.data.newField).toBe('x');
    // ...but the unconditional trailing block stamps an unrelated {} onto origin's
    // data, mutating the previous state's origin in place even though updateOrigin
    // was false.
    expect(result.origin.t1.document!.data.newField).toEqual({});
    expect(initial.origin.t1.document!.data.newField).toEqual({});
  });

  it('deletes a task from actual and origin, mutating the previous state in place (preserved as-is)', () => {
    const initial = reducer(undefined, {
      type: 'LOAD_TASK_SUCCESS',
      payload: { id: 't1', document: { data: {} } }
    });
    const result = reducer(initial, {
      type: 'DELETE_TASK_DOCUMENT',
      payload: { taskId: 't1' }
    });
    expect(result.actual.t1).toBeUndefined();
    // the previous state's actual/origin dicts are the same object references and
    // lose the key too, since the delete happens before the shallow copy.
    expect(initial.actual.t1).toBeUndefined();
    expect(initial.origin.t1).toBeUndefined();
  });

  it('pushes a signature rejection onto the origin document in place', () => {
    const initial = reducer(undefined, {
      type: 'LOAD_TASK_SUCCESS',
      payload: { id: 't1', documentId: 'd1', document: { data: {}, signatureRejections: [] } }
    });
    const rejection = { documentId: 'd1', reason: 'bad' };
    const result = reducer(initial, {
      type: 'REJECT_DOOCUMENT_SIGNING_SUCCESS',
      payload: rejection
    });
    expect(result.actual.t1.document!.signatureRejections).toEqual([rejection]);
  });

  it('stores errorTaskSigners for a task', () => {
    const initial = reducer(undefined, {
      type: 'LOAD_TASK_SUCCESS',
      payload: { id: 't1', document: { data: {} } }
    });
    const result = reducer(initial, {
      type: 'SET_ERROR_TASK_SIGNERS',
      payload: { taskId: 't1', step: 2 }
    });
    expect(result.actual.t1.errorTaskSigners).toBe(2);
  });
});

describe('task reducer calcTriggers', () => {
  const loadTask = (task: Record<string, unknown>) =>
    reducer(undefined, { type: 'LOAD_TASK_SUCCESS', payload: task });

  const updateValues = (state: ReturnType<typeof reducer>, payload: Record<string, unknown>) =>
    reducer(state, {
      type: 'UPDATE_TASK_DOCUMENT_VALUES',
      payload: { schema: { allowNull: false }, info: {}, triggers: [], ...payload }
    });

  it('handles UPDATE_TASK_DOCUMENT_VALUES with updateOrigin and onlyThisValue', () => {
    const initial = loadTask({
      id: 1,
      taskTemplateId: 'tpl-1',
      activityLog: [],
      document: { data: { section: { value: 1 } } }
    });
    const next = updateValues(initial, {
      taskId: 1,
      path: ['section', 'value'],
      changes: 2,
      documentTemplate: { actual: { 'tpl-1': { schema: true } } },
      updateOrigin: true,
      onlyThisValue: true
    });
    expect(next.actual[1].document!.data.section).toEqual({ value: 2 });
    expect(next.origin[1].document!.data.section).toEqual({ value: 2 });
  });

  it('returns the same state when UPDATE_TASK_DOCUMENT_VALUES makes no effective change', () => {
    const initial = loadTask({ id: 1, document: { data: { section: { value: 1 } } } });
    const next = updateValues(initial, { taskId: 1, path: ['section', 'value'], changes: 1 });
    expect(next).toBe(initial);
  });

  it('runs a trigger whose source is the changed path', () => {
    const initial = loadTask({ id: 1, document: { data: { s: { a: 1 } } } });
    const next = updateValues(initial, {
      taskId: 1,
      path: ['s', 'a'],
      changes: 5,
      triggers: [{ source: 's.a', target: 's.b', calculate: '(v) => v * 2' }]
    });
    expect(next.actual[1].document!.data.s).toEqual({ a: 5, b: 10 });
  });

  it('runs a trigger when a whole step containing a changed source is written', () => {
    const initial = loadTask({ id: 1, document: { data: { s: { a: 1, t: 'old' } } } });
    const next = updateValues(initial, {
      taskId: 1,
      path: ['s'],
      changes: { a: 2, t: 'old' },
      triggers: [{ source: 's.a', target: 's.t', calculate: '(v) => "a=" + v' }]
    });
    expect(next.actual[1].document!.data.s).toEqual({ a: 2, t: 'a=2' });
  });

  it('skips a trigger whose source did not change when a whole step is written (previousDocumentData)', () => {
    const initial = loadTask({ id: 1, document: { data: { s: { a: 1, other: 'x', t: 'keep' } } } });
    const next = updateValues(initial, {
      taskId: 1,
      path: ['s'],
      changes: { a: 1, other: 'y', t: 'keep' },
      triggers: [{ source: 's.a', target: 's.t', calculate: '(v) => "a=" + v' }]
    });
    expect(next.actual[1].document!.data.s).toEqual({ a: 1, other: 'y', t: 'keep' });
  });

  it('recomputes every array row when a whole array is written', () => {
    const initial = loadTask({ id: 1, document: { data: { s: { rows: [] } } } });
    const next = updateValues(initial, {
      taskId: 1,
      path: ['s', 'rows'],
      changes: [{ a: 1 }, { a: 2 }],
      // eslint-disable-next-line no-template-curly-in-string
      triggers: [{ source: 's.rows.${index}.a', target: 's.rows.${index}.b', calculate: '(v) => v + 10' }]
    });
    expect(next.actual[1].document!.data.s).toEqual({ rows: [{ a: 1, b: 11 }, { a: 2, b: 12 }] });
  });

  it('does not mutate the previous actual document data', () => {
    const initial = loadTask({ id: 1, document: { data: { s: { a: 1 } } } });
    updateValues(initial, {
      taskId: 1,
      path: ['s', 'a'],
      changes: 5,
      triggers: [{ source: 's.a', target: 's.b', calculate: '(v) => v * 2' }]
    });
    expect(initial.actual[1].document!.data.s).toEqual({ a: 1 });
  });

  it('keeps an empty object set without allowNull', () => {
    const initial = loadTask({ id: 1, document: { data: { s: { obj: { x: 1 }, keep: 1 } } } });
    const next = updateValues(initial, { taskId: 1, path: ['s', 'obj'], changes: {} });
    expect(next.actual[1].document!.data.s).toEqual({ obj: {}, keep: 1 });
  });

  it('keeps an empty array set without allowNull', () => {
    const initial = loadTask({ id: 1, document: { data: { s: { list: [1], keep: 1 } } } });
    const next = updateValues(initial, { taskId: 1, path: ['s', 'list'], changes: [] });
    expect(next.actual[1].document!.data.s).toEqual({ list: [], keep: 1 });
  });

  it('still deletes the path when an empty string is set without allowNull', () => {
    const initial = loadTask({ id: 1, document: { data: { s: { str: 'x', keep: 1 } } } });
    const next = updateValues(initial, { taskId: 1, path: ['s', 'str'], changes: '' });
    expect(next.actual[1].document!.data.s).toEqual({ keep: 1 });
  });

  it('handles APPLY_DOCUMENT_DIFFS and writes updated data', () => {
    const initial = loadTask({ id: 1, document: { data: { root: { a: 1 } } } });
    const next = reducer(initial, {
      type: 'APPLY_DOCUMENT_DIFFS',
      payload: {
        taskId: 1,
        diffs: [{ kind: 'E', path: ['a'], lhs: 1, rhs: 2 }],
        path: ['root'],
        options: { triggers: [], info: {} }
      }
    });
    expect(next.actual[1].document!.data.root).toEqual({ a: 2 });
  });
});
