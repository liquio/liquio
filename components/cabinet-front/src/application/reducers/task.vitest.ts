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
