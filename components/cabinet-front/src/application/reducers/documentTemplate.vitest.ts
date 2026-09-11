import { describe, expect, it } from 'vitest';
import reducer from 'application/reducers/documentTemplate';

describe('documentTemplate reducer', () => {
  it('stores a loaded document template keyed by id', () => {
    const result = reducer(undefined, {
      type: 'LOAD_DOCUMENT_TEMPLATE_SUCCESS',
      payload: { id: 1, name: 'a' }
    });
    expect(result.actual[1]).toEqual({ id: 1, name: 'a' });
  });

  it('merges the task template jsonSchema onto the existing actual entry', () => {
    const initial = reducer(undefined, {
      type: 'LOAD_DOCUMENT_TEMPLATE_SUCCESS',
      payload: { id: 1, name: 'a' }
    });
    const result = reducer(initial, {
      type: 'LOAD_TASK_TEMPLATES_SUCCESS',
      payload: { id: 1, jsonSchema: { type: 'object' } }
    });
    expect(result.actual[1]).toEqual({ id: 1, name: 'a', taskTemplate: { type: 'object' } });
  });
});
